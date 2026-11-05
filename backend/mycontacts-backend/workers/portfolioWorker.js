

// --- Load .env BEFORE any AWS/DB clients are created ---
const path = require('path');
const os = require('os');
const fs = require('fs');
const { pipeline } = require('stream/promises');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { Worker } = require('bullmq');
const mongoose = require('mongoose');

const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
if (ffmpegInstaller && ffmpegInstaller.path) {
    ffmpeg.setFfmpegPath(ffmpegInstaller.path);
}

const { DeleteObjectCommand, CopyObjectCommand, GetObjectCommand, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const s3 = require('../config/s3');
const User = require('../models/userModel');
const Cproject = require('../models/cprojectModel');
const { createRedisConnection } = require('../config/redis');

// --- Redis Connections (Centralized: supports both redis:// and rediss://) ---
const connection = createRedisConnection();
const taskConnection = createRedisConnection();

// Centralized helper to guarantee MongoDB is connected before any query
async function ensureDbConnected() {
    if (mongoose.connection.readyState === 1) return;
    console.log(`[Media Worker] Establishing MongoDB connection (current state: ${mongoose.connection.readyState})...`);
    await mongoose.connect(process.env.CONNECTION_STRING, {
        serverSelectionTimeoutMS: 30000
    });
    console.log('[Media Worker] Connected to MongoDB.');
}

// Initial connection on boot
ensureDbConnected().catch(err => {
    console.error('MongoDB initial connection warning in Combined Media Worker:', err.message);
});

// ============================================================================
// COMPRESSION HELPERS (Images via Sharp, Videos via FFmpeg)
// ============================================================================

// Helper to verify that an object exists in S3 with retries (guards against propagation latency)
async function verifyS3ObjectExists(s3Key, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await s3.send(new HeadObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: s3Key
            }));
            return true;
        } catch (err) {
            if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 1000 * attempt));
                    continue;
                }
                return false;
            }
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 1000));
            } else {
                return false;
            }
        }
    }
    return false;
}

async function getS3Buffer(tempS3Key) {
    const res = await s3.send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: tempS3Key
    }));
    const chunks = [];
    for await (const chunk of res.Body) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function compressAndUploadImage(tempS3Key, finalS3Key, cleanExt, mimeType, logPrefix = '') {
    try {
        const inputBuffer = await getS3Buffer(tempS3Key);
        let sharpInstance = sharp(inputBuffer).rotate();

        let compressedBuffer;
        if (cleanExt === 'jpg' || cleanExt === 'jpeg') {
            compressedBuffer = await sharpInstance.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
        } else if (cleanExt === 'png') {
            compressedBuffer = await sharpInstance.png({ quality: 80, compressionLevel: 8 }).toBuffer();
        } else if (cleanExt === 'webp') {
            compressedBuffer = await sharpInstance.webp({ quality: 80 }).toBuffer();
        } else {
            compressedBuffer = inputBuffer;
        }

        let finalBuffer = inputBuffer;
        if (compressedBuffer.length < inputBuffer.length) {
            const reduction = Math.round((1 - compressedBuffer.length / inputBuffer.length) * 100);
            console.log(`${logPrefix} [Image Compressed] ${inputBuffer.length} bytes → ${compressedBuffer.length} bytes (${reduction}% reduction)`);
            finalBuffer = compressedBuffer;
        } else {
            console.log(`${logPrefix} [Image Already Optimized] Compressed (${compressedBuffer.length}) >= original (${inputBuffer.length}). Keeping original.`);
            finalBuffer = inputBuffer;
        }

        await s3.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: finalS3Key,
            Body: finalBuffer,
            ContentType: mimeType
        }));
        return true;
    } catch (err) {
        if (err.name === 'NoSuchKey' || err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            throw err;
        }
        console.warn(`${logPrefix} [Image Compression Warning] ${err.message}. Falling back to S3 copy.`);
        return false;
    }
}

async function compressAndUploadVideo(tempS3Key, finalS3Key, cleanExt, logPrefix = '') {
    const shortId = Math.random().toString(36).substring(2, 7);
    const tempInputPath = path.join(os.tmpdir(), `in_${Date.now()}_${shortId}.${cleanExt}`);
    const tempOutputPath = path.join(os.tmpdir(), `out_${Date.now()}_${shortId}.mp4`);

    try {
        const res = await s3.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: tempS3Key
        }));
        await pipeline(res.Body, fs.createWriteStream(tempInputPath));
        const originalSize = fs.statSync(tempInputPath).size;

        await new Promise((resolve, reject) => {
            ffmpeg(tempInputPath)
                .outputOptions([
                    '-c:v libx264',
                    '-crf 28',
                    '-preset medium',
                    "-vf scale='min(1280,iw)':-2",
                    '-c:a aac',
                    '-b:a 96k',
                    '-movflags +faststart',
                    '-pix_fmt yuv420p'
                ])
                .output(tempOutputPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        const compressedSize = fs.statSync(tempOutputPath).size;

        // SIZE GUARD: Only use compressed video if it's ACTUALLY smaller than the original!
        // If the original was already tightly compressed and re-encoding inflated it, keep the original.
        if (compressedSize < originalSize) {
            const reduction = Math.round((1 - compressedSize / originalSize) * 100);
            console.log(`${logPrefix} [Video Compressed] ${originalSize} bytes → ${compressedSize} bytes (${reduction}% reduction). Uploading compressed video.`);
            const fileStream = fs.createReadStream(tempOutputPath);
            await s3.send(new PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: finalS3Key,
                Body: fileStream,
                ContentType: 'video/mp4'
            }));
        } else {
            console.log(`${logPrefix} [Video Already Optimized] Re-encoded size (${compressedSize} bytes) >= original (${originalSize} bytes). Keeping original file.`);
            const fileStream = fs.createReadStream(tempInputPath);
            await s3.send(new PutObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: finalS3Key,
                Body: fileStream,
                ContentType: 'video/mp4'
            }));
        }
        return true;
    } catch (err) {
        if (err.name === 'NoSuchKey' || err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
            throw err;
        }
        console.warn(`${logPrefix} [Video Compression Warning] ${err.message}. Falling back to S3 copy.`);
        return false;
    } finally {
        try { if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath); } catch (_) {}
        try { if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath); } catch (_) {}
    }
}

async function processMediaTransfer(tempS3Key, finalS3Key, cleanExt, mimeType, logPrefix = '') {
    const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(cleanExt);
    const isVideo = ['mp4', 'mov', 'webm', 'm4v', 'ogg', 'ogv'].includes(cleanExt);

    let compressed = false;
    if (isImage) {
        compressed = await compressAndUploadImage(tempS3Key, finalS3Key, cleanExt, mimeType, logPrefix);
    } else if (isVideo) {
        compressed = await compressAndUploadVideo(tempS3Key, finalS3Key, cleanExt, logPrefix);
    }

    if (!compressed) {
        console.log(`${logPrefix} S3 Native Copy: ${tempS3Key} → ${finalS3Key} (${mimeType})`);
        await s3.send(new CopyObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            CopySource: `${process.env.S3_BUCKET_NAME}/${encodeURIComponent(tempS3Key).replace(/%2F/g, '/')}`,
            Key: finalS3Key,
            ContentType: mimeType,
            MetadataDirective: 'REPLACE'
        }));
    }
}

// ============================================================================
// HELPER: Portfolio Job Processor
// ============================================================================
async function processPortfolioJob(job) {
    const { userId, projectId, tempS3Key, fileType, fileIndex } = job.data;
    console.log(`[Portfolio Worker] Processing portfolio for User: ${userId}, Project: ${projectId}${fileIndex !== undefined ? ` [${fileIndex}]` : ''}`);

    try {
        // Guarantee DB is connected before executing queries
        await ensureDbConnected();

        // 0. Verify temp file actually exists in S3 before attempting compression
        const exists = await verifyS3ObjectExists(tempS3Key);
        if (!exists) {
            // Check if already approved/completed (e.g. from an earlier worker run or retry)
            const existingUser = await User.findOne({ fl_id: userId });
            const existingProj = existingUser?.external_projects?.[projectId];
            const mediaItem = typeof fileIndex === 'number' && Array.isArray(existingProj?.mediaFiles)
                ? existingProj.mediaFiles[fileIndex]
                : existingProj;
            if (mediaItem && mediaItem.mediaStatus === 'approved') {
                console.log(`[Portfolio Worker] Project ${projectId} media is already approved. Skipping missing temp file.`);
                return;
            }
            throw new Error(`Temporary file "${tempS3Key}" does not exist in S3 storage. Client upload may have failed or was cancelled.`);
        }

        // 1. Process and compress file from portfolio-temp/ to portfolio/ in S3
        const cleanExt = (tempS3Key.split('?')[0].split('.').pop() || 'mp4').toLowerCase().replace(/[^\w]/g, '');
        const shortId = Math.random().toString(36).substring(2, 7);
        const finalS3Key = `portfolio/${userId}/${Date.now()}_${shortId}.${cleanExt}`;

        const mimeType = (() => {
            switch (cleanExt) {
                case 'mp4': return 'video/mp4';
                case 'webm': return 'video/webm';
                case 'ogg':
                case 'ogv': return 'video/ogg';
                case 'mov': return 'video/mp4';
                case 'm4v': return 'video/mp4';
                case 'jpg':
                case 'jpeg': return 'image/jpeg';
                case 'png': return 'image/png';
                case 'webp': return 'image/webp';
                case 'gif': return 'image/gif';
                default: return fileType || 'application/octet-stream';
            }
        })();

        await processMediaTransfer(tempS3Key, finalS3Key, cleanExt, mimeType, '[Portfolio Worker]');

        // 2. Build permanent URL
        const permanentMediaUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${finalS3Key}`;

        // 3. Update MongoDB
        const user = await User.findOne({ fl_id: userId });
        if (user && user.external_projects && user.external_projects[projectId]) {
            const proj = user.external_projects[projectId];

            if (typeof fileIndex === 'number' && Array.isArray(proj.mediaFiles) && proj.mediaFiles[fileIndex]) {
                proj.mediaFiles[fileIndex].mediaUrl = permanentMediaUrl;
                proj.mediaFiles[fileIndex].mediaKey = finalS3Key;
                proj.mediaFiles[fileIndex].mediaStatus = 'approved';
                if (!proj.mediaUrl || fileIndex === 0) {
                    proj.mediaUrl = permanentMediaUrl;
                    proj.mediaKey = finalS3Key;
                    proj.mediaStatus = 'approved';
                }
            } else {
                proj.mediaUrl = permanentMediaUrl;
                proj.mediaKey = finalS3Key;
                proj.mediaStatus = 'approved';
            }

            user.markModified(`external_projects.${projectId}`);
            await user.save();
            console.log(`[Portfolio Worker] DB Updated for Project ${projectId}. mediaKey: ${finalS3Key}`);
        } else {
            console.warn(`[Portfolio Worker] User or project not found: userId=${userId}, projectId=${projectId}`);
        }

        // 4. Delete temp file from S3
        try {
            console.log(`[Portfolio Worker] Deleting temp file: ${tempS3Key}`);
            await s3.send(new DeleteObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: tempS3Key
            }));
        } catch (delErr) {
            console.warn(`[Portfolio Worker] Non-fatal error deleting temp S3 file ${tempS3Key}:`, delErr.message);
        }

        console.log(`[Portfolio Worker] Complete for Project: ${projectId}`);

    } catch (error) {
        console.error(`[Portfolio Worker] Error processing ${tempS3Key}:`, error);

        if (mongoose.connection.readyState === 1) {
            try {
                const user = await User.findOne({ fl_id: userId });
                if (user && user.external_projects && user.external_projects[projectId]) {
                    const proj = user.external_projects[projectId];
                    if (typeof fileIndex === 'number' && Array.isArray(proj.mediaFiles) && proj.mediaFiles[fileIndex]) {
                        proj.mediaFiles[fileIndex].mediaStatus = 'failed';
                        if (fileIndex === 0 || proj.mediaFiles.every(f => f.mediaStatus === 'failed')) {
                            proj.mediaStatus = 'failed';
                        }
                    } else {
                        proj.mediaStatus = 'failed';
                    }
                    user.markModified(`external_projects.${projectId}`);
                    await user.save();
                }
            } catch (dbErr) {
                console.error('[Portfolio Worker] Failed to update DB on error:', dbErr.message);
            }
        }

        throw error;
    }
}

// ============================================================================
// HELPER: Task Media Job Processor (Images, Videos, PDFs up to 1GB)
// Stores in S3 folder: ${p_id}/tasks/...
// ============================================================================
async function processTaskMediaJob(job) {
    const { p_id, taskId, tempS3Key, fileName, fileType, mediaIndex } = job.data;
    console.log(`[Task Media Worker] Processing media for Project: ${p_id}, Task: ${taskId}${mediaIndex !== undefined ? ` [${mediaIndex}]` : ''}`);

    try {
        // Guarantee DB is connected before executing queries
        await ensureDbConnected();

        // 1. Identify clean extension and MIME type
        const cleanExt = (tempS3Key.split('?')[0].split('.').pop() || 'bin').toLowerCase().replace(/[^\w]/g, '');
        const shortId = Math.random().toString(36).substring(2, 7);

        // Fetch project by unique p_id (prevents Cast to Number error on Tasks.id)
        const project = await Cproject.findOne({ p_id });

        let task = null;
        let taskSchemaId = taskId;
        if (project && Array.isArray(project.Tasks)) {
            task = project.Tasks.find(t =>
                (t._id && t._id.toString() === taskId.toString()) ||
                (t.id !== undefined && t.id !== null && t.id.toString() === taskId.toString()) ||
                (Array.isArray(t.submission_media) && t.submission_media.some(m => m.tempS3Key === tempS3Key))
            );
            if (task && task.id !== undefined && task.id !== null) {
                taskSchemaId = String(task.id);
            }
        }

        // Fallback: extract id prefix from tempS3Key if present (e.g. task-temp/P-.../1-...)
        if (taskSchemaId === taskId) {
            const fileNamePart = tempS3Key.split('/').pop() || '';
            const matchId = fileNamePart.match(/^([0-9a-zA-Z_-]+?)-\d{10,}/);
            if (matchId) taskSchemaId = matchId[1];
        }

        // Required S3 hierarchy: tasks/${p_id}/${taskSchemaId}-${Date.now()}_${shortId}.${cleanExt}
        // Permanent file strictly prefixed with the task schema id
        const finalS3Key = `tasks/${p_id}/${taskSchemaId}-${Date.now()}_${shortId}.${cleanExt}`;

        const mimeType = (() => {
            switch (cleanExt) {
                case 'pdf': return 'application/pdf';
                case 'mp4': return 'video/mp4';
                case 'webm': return 'video/webm';
                case 'ogg':
                case 'ogv': return 'video/ogg';
                case 'mov': return 'video/quicktime';
                case 'm4v': return 'video/mp4';
                case 'jpg':
                case 'jpeg': return 'image/jpeg';
                case 'png': return 'image/png';
                case 'webp': return 'image/webp';
                case 'gif': return 'image/gif';
                default: return fileType || 'application/octet-stream';
            }
        })();

        await processMediaTransfer(tempS3Key, finalS3Key, cleanExt, mimeType, '[Task Media Worker]');

        // 2. Build permanent S3 URL
        const permanentMediaUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${finalS3Key}`;

        // 3. Update MongoDB (cproject -> Tasks -> submission_media)
        let dbUpdated = false;
        const freshProject = await Cproject.findOne({ p_id });
        if (freshProject && Array.isArray(freshProject.Tasks)) {
            const currentTask = freshProject.Tasks.find(t =>
                (t._id && t._id.toString() === taskId.toString()) ||
                (t.id !== undefined && t.id !== null && t.id.toString() === taskId.toString()) ||
                (Array.isArray(t.submission_media) && t.submission_media.some(m => m.tempS3Key === tempS3Key))
            );

            if (currentTask && Array.isArray(currentTask.submission_media)) {
                let mediaItem = currentTask.submission_media.find(m => m.tempS3Key === tempS3Key);
                if (!mediaItem && typeof mediaIndex === 'number' && currentTask.submission_media[mediaIndex]) {
                    mediaItem = currentTask.submission_media[mediaIndex];
                }

                if (mediaItem) {
                    mediaItem.mediaUrl = permanentMediaUrl;
                    mediaItem.mediaKey = finalS3Key;
                    mediaItem.mediaStatus = 'approved';
                    mediaItem.mimeType = mimeType;

                    freshProject.markModified('Tasks');
                    await freshProject.save();
                    dbUpdated = true;
                    console.log(`[Task Media Worker] MongoDB updated for Project ${p_id}, Task ${taskId}. mediaStatus: approved, mediaKey: ${finalS3Key}`);
                }
            }
        }

        // Atomic fallback: Direct update by tempS3Key if Mongoose save was bypassed
        if (!dbUpdated) {
            const updateResult = await Cproject.updateOne(
                { p_id, "Tasks.submission_media.tempS3Key": tempS3Key },
                {
                    $set: {
                        "Tasks.$[t].submission_media.$[m].mediaUrl": permanentMediaUrl,
                        "Tasks.$[t].submission_media.$[m].mediaKey": finalS3Key,
                        "Tasks.$[t].submission_media.$[m].mediaStatus": "approved",
                        "Tasks.$[t].submission_media.$[m].mimeType": mimeType
                    }
                },
                {
                    arrayFilters: [
                        { "t.submission_media.tempS3Key": tempS3Key },
                        { "m.tempS3Key": tempS3Key }
                    ]
                }
            );
            if (updateResult.modifiedCount > 0) {
                console.log(`[Task Media Worker] MongoDB atomically updated via arrayFilters for Project ${p_id}, tempS3Key: ${tempS3Key}`);
            } else {
                console.warn(`[Task Media Worker] Could not locate Task or media item to update in DB for Project ${p_id}, Task ${taskId}`);
            }
        }

        // 4. Delete temp file from S3
        console.log(`[Task Media Worker] Deleting temp file: ${tempS3Key}`);
        await s3.send(new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: tempS3Key
        }));

        console.log(`[Task Media Worker] Completed processing for Project ${p_id}, Task: ${taskId}`);

    } catch (error) {
        console.error(`[Task Media Worker] Error processing ${tempS3Key}:`, error);

        // Mark as failed in DB only if MongoDB connection is active
        if (mongoose.connection.readyState === 1) {
            try {
                const freshProject = await Cproject.findOne({ p_id });
                if (freshProject && Array.isArray(freshProject.Tasks)) {
                    const currentTask = freshProject.Tasks.find(t =>
                        (t._id && t._id.toString() === taskId.toString()) ||
                        (t.id !== undefined && t.id !== null && t.id.toString() === taskId.toString()) ||
                        (Array.isArray(t.submission_media) && t.submission_media.some(m => m.tempS3Key === tempS3Key))
                    );
                    if (currentTask && Array.isArray(currentTask.submission_media)) {
                        let mediaItem = currentTask.submission_media.find(m => m.tempS3Key === tempS3Key);
                        if (!mediaItem && typeof mediaIndex === 'number' && currentTask.submission_media[mediaIndex]) {
                            mediaItem = currentTask.submission_media[mediaIndex];
                        }
                        if (mediaItem) {
                            mediaItem.mediaStatus = 'failed';
                            freshProject.markModified('Tasks');
                            await freshProject.save();
                        }
                    }
                }
            } catch (dbErr) {
                console.error('[Task Media Worker] Failed to update DB on error:', dbErr.message);
            }
        }

        throw error;
    }
}

// ============================================================================
// WORKER 1: Portfolio Worker
// ============================================================================
const portfolioWorker = new Worker('portfolio-processing', async job => {
    return processPortfolioJob(job);
}, {
    connection,
    prefix: '{kansbePortfolioQueue}'
});

portfolioWorker.on('failed', (job, err) => {
    console.error(`[Portfolio Worker] Job ${job?.id} failed: ${err.message}`);
});

portfolioWorker.on('completed', (job) => {
    console.log(`[Portfolio Worker] Job ${job?.id} completed`);
});

// ============================================================================
// WORKER 2: Task Media Worker (Co-located in same process!)
// ============================================================================
const taskMediaWorker = new Worker('task-media-processing', async job => {
    return processTaskMediaJob(job);
}, {
    connection: taskConnection,
    prefix: '{kansbeTaskQueue}'
});

taskMediaWorker.on('failed', (job, err) => {
    console.error(`[Task Media Worker] Job ${job?.id} failed: ${err.message}`);
});

taskMediaWorker.on('completed', (job) => {
    console.log(`[Task Media Worker] Job ${job?.id} completed`);
});

// ============================================================================
// Graceful Shutdown Handler
// ============================================================================
const handleShutdown = async (signal) => {
    console.log(`[Combined Media Worker] Received ${signal}. Gracefully closing workers...`);
    try {
        await Promise.all([
            portfolioWorker.close(),
            taskMediaWorker.close()
        ]);
        await Promise.all([
            connection.quit(),
            taskConnection.quit()
        ]);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        console.log('[Combined Media Worker] Closed cleanly.');
        process.exit(0);
    } catch (err) {
        console.error('[Combined Media Worker] Shutdown error:', err);
        process.exit(1);
    }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

console.log('Combined Media Worker (Portfolio + Task Media) is running and waiting for jobs...');

module.exports = {
    portfolioWorker,
    taskMediaWorker,
    processPortfolioJob,
    processTaskMediaJob
};
