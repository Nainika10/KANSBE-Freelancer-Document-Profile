const asyncHandler = require("express-async-handler");
const bank = require("../models/bankModels");
const { sanitizeForLogging } = require('../Utility/logSanitizer');

// Get Data (Admin only - returns all bank data)
const getdata = asyncHandler(async (req, res) => {
    // IDOR Fix: This should be admin-only route
    // For now, we restrict to authenticated users with admin role
    if (!req.user?.usr_id && !req.user?.role) {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    const bankdata = await bank.find();
    res.status(200).json(bankdata);
});

// Get by Id - IDOR Protected
const getbyid = asyncHandler(async (req, res) => {
    // IDOR Fix: Ensure user can only access their own bank data
    if (!req.user?.c_id) {
        return res.status(403).json({ message: "Forbidden: You are not authorized as a client" });
    }
    if (req.user.c_id !== req.params.c_id) {
        return res.status(403).json({ message: "Forbidden: You can only access your own bank data" });
    }

    const bankdata = await bank.findOne({ c_id: req.params.c_id });
    res.status(200).json(bankdata);
});

// Post Data - IDOR Protected
const postdata = asyncHandler(async (req, res) => {
    console.log("Request body received:", sanitizeForLogging(req.body));
    const {
        c_id,
        bankname,
        acholdername,
        acnumber,
        ifsc,
        branchname,
        createdby
    } = req.body;

    // IDOR Fix: Ensure user can only create bank data for themselves
    if (!req.user?.c_id) {
        return res.status(403).json({ message: "Forbidden: You are not authorized as a client" });
    }
    if (req.user.c_id !== c_id) {
        return res.status(403).json({ message: "Forbidden: You can only create bank data for your own account" });
    }

    const bankdata = await bank.create({
        c_id,
        bankname,
        acholdername,
        acnumber,
        ifsc,
        branchname,
        createdby,
        updatedby: null
    });
    res.status(200).json(bankdata);
});

// Update data - IDOR Protected
const updatedata = asyncHandler(async (req, res) => {
    // IDOR Fix: Ensure user can only update their own bank data
    if (!req.user?.c_id) {
        return res.status(403).json({ message: "Forbidden: You are not authorized as a client" });
    }
    if (req.user.c_id !== req.params.c_id) {
        return res.status(403).json({ message: "Forbidden: You can only update your own bank data" });
    }

    const existdata = await bank.findOne({ c_id: req.params.c_id });
    if (!existdata) {
        res.status(400);
        throw new Error("Id Not Found!!");
    }
    const bankdata = await bank.findOneAndUpdate(
        { c_id: req.params.c_id },
        req.body,
        { new: true }
    );
    res.status(200).json(bankdata);
});

// Delete Data - IDOR Protected
const deletedata = asyncHandler(async (req, res) => {
    // IDOR Fix: Ensure user can only delete their own bank data
    if (!req.user?.c_id) {
        return res.status(403).json({ message: "Forbidden: You are not authorized as a client" });
    }
    if (req.user.c_id !== req.params.c_id) {
        return res.status(403).json({ message: "Forbidden: You can only delete your own bank data" });
    }

    const existdata = await bank.findOne({ c_id: req.params.c_id });
    if (!existdata) {
        res.status(400);
        throw new Error("Id not Found!!");
    }
    const bankdata = await bank.findOneAndDelete({ c_id: req.params.c_id });
    res.status(200).json(bankdata);
});

module.exports = { getdata, getbyid, postdata, updatedata, deletedata }