const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");
const Skill = require("../models/skillModel");
const User = require("../models/userModel");
const { calculateFreelancerCompletion } = require('../services/profileService');
const cacheService = require('../services/cacheService');
const { syncFreelancerVector } = require('../services/freelancerMatchService');

/**
 * Helper: Guarantees exactly ONE skill document exists for a given fl_id.
 * If multiple duplicate documents exist (from prior bugs/legacy inserts),
 * merges all skills into the main document and removes the duplicate rows.
 */
async function getOrCreateSingleSkillDoc(fl_id) {
    const docs = await Skill.find({ fl_id });
    if (!docs || docs.length === 0) {
        return await Skill.create({
            fl_id,
            skills: [],
            createdby: fl_id
        });
    }

    if (docs.length === 1) {
        const doc = docs[0];
        let hasDuplicates = false;
        const seen = new Set();
        const cleanSkills = [];
        for (const item of (doc.skills || [])) {
            const norm = (item.skill || '').trim().toLowerCase();
            if (norm && !seen.has(norm)) {
                seen.add(norm);
                cleanSkills.push(item);
            } else if (norm) {
                hasDuplicates = true;
            }
        }
        if (hasDuplicates) {
            doc.skills = cleanSkills;
            await doc.save();
        }
        return doc;
    }

    // Consolidate legacy duplicate documents into a single document row
    const mainDoc = docs[0];
    const existingSkillNames = new Set(
        (mainDoc.skills || []).map(s => (s.skill || '').trim().toLowerCase())
    );

    const duplicateIds = [];
    for (let i = 1; i < docs.length; i++) {
        const doc = docs[i];
        duplicateIds.push(doc._id);
        if (Array.isArray(doc.skills)) {
            for (const item of doc.skills) {
                const normName = (item.skill || '').trim().toLowerCase();
                if (normName && !existingSkillNames.has(normName)) {
                    existingSkillNames.add(normName);
                    const nextId = mainDoc.skills.length > 0
                        ? (mainDoc.skills[mainDoc.skills.length - 1].id || 0) + 1
                        : 0;
                    mainDoc.skills.push({
                        id: nextId,
                        skill: item.skill,
                        status: item.status || 'Active',
                        createdby: item.createdby || fl_id,
                        updatedby: item.updatedby || null
                    });
                }
            }
        }
    }

    await mainDoc.save();
    if (duplicateIds.length > 0) {
        await Skill.deleteMany({ _id: { $in: duplicateIds } });
    }
    return mainDoc;
}

// Get all skill documents
const getskills = asyncHandler(async (req, res) => {
    const skill = await Skill.find();
    if (!skill || skill.length === 0) {
        return res.status(200).json({ message: "No skill found" });
    }
    res.status(200).json(skill);
});

// Get Skill by Fl_id and skillid
const getbyfl_idandskill_id = asyncHandler(async (req, res) => {
    try {
        const { fl_id, id } = req.params;
        const user = await getOrCreateSingleSkillDoc(fl_id);

        let foundSkill = null;
        if (mongoose.Types.ObjectId.isValid(id)) {
            foundSkill = user.skills.find(s => s._id && s._id.toString() === id);
        } else {
            foundSkill = user.skills.find(s => s.id === Number(id));
        }

        if (foundSkill) {
            return res.status(200).json(foundSkill);
        } else {
            return res.status(200).json({ message: "Skill not found" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create/Add a skill for a freelancer (Single Row Guaranteed)
const createskill = asyncHandler(async (req, res) => {
    try {
        const { fl_id, skill, status } = req.body;
        if (!fl_id || !skill || !status) {
            return res.status(400).json({ message: "invalid body" });
        }

        const user = await getOrCreateSingleSkillDoc(fl_id);

        // Check if skill already exists case-insensitively
        const skillTrimmed = skill.trim().toLowerCase();
        const skillExists = user.skills && user.skills.some(
            s => s.skill && s.skill.trim().toLowerCase() === skillTrimmed
        );

        if (skillExists) {
            return res.status(400).json({ message: "Skill already exists" });
        }

        const nextId = user.skills.length > 0
            ? (user.skills[user.skills.length - 1].id || 0) + 1
            : 0;

        const msgObj = {
            id: nextId,
            skill: skill.trim(),
            status,
            createdby: fl_id
        };

        user.skills.push(msgObj);
        await user.save();

        res.status(201).json(msgObj);

        // Sync deterministic search vector in freelancer_vectors (non-blocking)
        syncFreelancerVector(fl_id).catch(err =>
            console.error('[skillController] Search vector sync error:', err.message)
        );

        // Recalculate profile completion after skill addition (non-blocking)
        recalcProfileCompletion(fl_id).catch(err =>
            console.error('Skill add - profile recalc error:', err.message)
        );

        

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get skill document by fl_id (Returns single consolidated document)
const getskillbyid = asyncHandler(async (req, res) => {
    const user = await getOrCreateSingleSkillDoc(req.params.fl_id);
    if (!user) {
        return res.status(200).json({ message: "skill not found" });
    }
    res.status(200).json(user);
});

// Update a skill inside the single fl_id document
const updateskill = asyncHandler(async (req, res) => {
    try {
        const { fl_id, id } = req.params;
        const { skill, status } = req.body;

        if (!fl_id || !id) {
            return res.status(400).json({ message: "Invalid parameters" });
        }

        const user = await getOrCreateSingleSkillDoc(fl_id);

        const query = { _id: user._id };
        if (mongoose.Types.ObjectId.isValid(id)) {
            query["skills._id"] = id;
        } else {
            query["skills.id"] = Number(id);
        }

        const updated = await Skill.findOneAndUpdate(
            query,
            {
                $set: {
                    "skills.$.skill": skill,
                    "skills.$.status": status,
                    "skills.$.updatedby": fl_id
                }
            },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Skill not found" });
        }

        res.status(200).json({ message: "Skill updated successfully", data: updated });

        // Sync deterministic search vector in freelancer_vectors (non-blocking)
        syncFreelancerVector(fl_id).catch(err =>
            console.error('[skillController] Search vector sync error:', err.message)
        );

        

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a skill from the single fl_id document
const deletedskill = asyncHandler(async (req, res) => {
    const { fl_id, id } = req.params;

    const user = await getOrCreateSingleSkillDoc(fl_id);

    const pullQuery = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
        pullQuery["_id"] = id;
    } else {
        pullQuery["id"] = Number(id);
    }

    const updated = await Skill.findOneAndUpdate(
        { _id: user._id },
        { $pull: { skills: pullQuery } },
        { new: true }
    );

    if (!updated) {
        return res.status(404).json({ message: "Skill not found!" });
    }

    res.status(200).json({ message: "Skill deleted successfully", data: updated });

    // Sync deterministic search vector in freelancer_vectors (non-blocking)
    syncFreelancerVector(fl_id).catch(err =>
        console.error('[skillController] Search vector sync error:', err.message)
    );

    recalcProfileCompletion(fl_id).catch(err =>
        console.error('Skill delete - profile recalc error:', err.message)
    );

    
});

/**
 * Helper: recalculate and persist profile completion for a freelancer.
 */
async function recalcProfileCompletion(fl_id) {
    const user = await User.findOne({ fl_id }).lean();
    if (!user) return;
    const skillDoc = await getOrCreateSingleSkillDoc(fl_id);
    const completion = calculateFreelancerCompletion(user, skillDoc ? [skillDoc] : []);
    await User.updateOne(
        { fl_id },
        { $set: { profile_completion: completion.percentage } }
    );
    cacheService.invalidateUser(fl_id);
}


// Sync/Batch replace skills atomically for a freelancer without duplicates
const syncSkills = asyncHandler(async (req, res) => {
    try {
        const fl_id = req.params.fl_id || req.body.fl_id;
        const incoming = req.body.skills;

        if (!fl_id) {
            return res.status(400).json({ message: "fl_id is required" });
        }

        const incomingArray = Array.isArray(incoming) ? incoming : [];
        const seen = new Set();
        const cleanSkills = [];
        let nextId = 0;

        for (const item of incomingArray) {
            const skillName = (typeof item === 'string' ? item : (item.skill || item.name || '')).trim();
            const norm = skillName.toLowerCase();
            if (norm && !seen.has(norm)) {
                seen.add(norm);
                const status = (typeof item === 'object' && (item.status || item.level)) ? (item.status || item.level) : 'Active';
                cleanSkills.push({
                    id: nextId++,
                    skill: skillName,
                    status: status,
                    createdby: fl_id
                });
            }
        }

        const user = await getOrCreateSingleSkillDoc(fl_id);
        user.skills = cleanSkills;
        await user.save();

        res.status(200).json({ message: "Skills synchronized successfully", data: user });

        // Sync deterministic search vector in freelancer_vectors (non-blocking)
        syncFreelancerVector(fl_id).catch(err =>
            console.error('[skillController] Search vector sync error:', err.message)
        );

        recalcProfileCompletion(fl_id).catch(err =>
            console.error('Skill sync - profile recalc error:', err.message)
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = {
    getskillbyid,
    getskills,
    getbyfl_idandskill_id,
    createskill,
    updateskill,
    deletedskill,
    syncSkills
};