const asyncHandler = require("express-async-handler");
const FreelancerDuration = require("../models/freelancerDurationModel");

// @desc    Record ping for freelancer tracking
// @route   POST /api/freelancer-duration/ping
// @access  Private
const recordPing = asyncHandler(async (req, res) => {
    const usr_id = req.user?.fl_id || req.user?.usr_id || req.user?.id || req.user?._id || req.body.usr_id;
    const { moduleName, increment } = req.body; // increment in seconds

    if (!usr_id) {
        res.status(400);
        throw new Error("User ID is missing");
    }

    if (!moduleName || increment === undefined) {
        res.status(400);
        throw new Error("Module name and increment are required");
    }

    const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    let durationDoc = await FreelancerDuration.findOne({ usr_id });

    if (!durationDoc) {
        durationDoc = new FreelancerDuration({
            usr_id,
            dailyRecords: [{
                date: todayDate,
                loginAt: new Date(),
                lastActivityAt: new Date(),
                modules: {
                    [moduleName]: increment
                }
            }]
        });
        await durationDoc.save();
        return res.status(200).json({ message: "Duration recorded successfully" });
    }

    // Find today's record
    let todayRecord = durationDoc.dailyRecords.find(record => record.date === todayDate);

    if (todayRecord) {
        todayRecord.lastActivityAt = new Date();
        const currentModuleTime = todayRecord.modules.get(moduleName) || 0;
        todayRecord.modules.set(moduleName, currentModuleTime + increment);
    } else {
        // Create new daily record for today
        durationDoc.dailyRecords.push({
            date: todayDate,
            loginAt: new Date(),
            lastActivityAt: new Date(),
            modules: {
                [moduleName]: increment
            }
        });
    }

    await durationDoc.save();
    res.status(200).json({ message: "Duration updated successfully" });
});

// @desc    Record logout
// @route   POST /api/freelancer-duration/logout
// @access  Private
const recordLogout = asyncHandler(async (req, res) => {
    const usr_id = req.user?.fl_id || req.user?.usr_id || req.user?.id || req.user?._id || req.body.usr_id;
    const todayDate = new Date().toISOString().split('T')[0];

    if (!usr_id) {
        res.status(400);
        throw new Error("User ID is missing");
    }

    let durationDoc = await FreelancerDuration.findOne({ usr_id });
    if (durationDoc) {
        let todayRecord = durationDoc.dailyRecords.find(record => record.date === todayDate);
        if (todayRecord) {
            todayRecord.logoutAt = new Date();
            await durationDoc.save();
        }
    }

    res.status(200).json({ message: "Logout recorded" });
});

module.exports = {
    recordPing,
    recordLogout
};
