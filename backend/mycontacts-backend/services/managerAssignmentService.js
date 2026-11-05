const Admin = require("../models/adminModel");
const Cproject = require("../models/cprojectModel");

/**
 * Get the next manager via round-robin.
 * Picks the active manager who was assigned longest ago (or never assigned).
 * Skips managers who are at their workload cap.
 *
 * @returns {Object|null} The selected manager document, or null if none available
 */
async function getNextAvailableManager() {
    // 1. Get all active managers, sorted by lastAssignedAt ASC
    //    null comes first (never assigned), then oldest date first
    const activeManagers = await Admin.find({
        role: "manager",
        status: "active"
    }).sort({ lastAssignedAt: 1, createdAt: 1 });

    if (activeManagers.length === 0) {
        return null;
    }

    // 2. Find the next manager (capacity check removed/commented per user request)
    for (const candidate of activeManagers) {
        // const activeProjectCount = await Cproject.countDocuments({
        //     Pmanager: candidate.usr_id,
        //     status: { $in: ["available", "assigned", "in-progress"] }
        // });

        // if (activeProjectCount < (candidate.maxProjects || 30)) {
            // 3. Update their lastAssignedAt to NOW (marks them as "just assigned")
            await Admin.findOneAndUpdate(
                { usr_id: candidate.usr_id },
                { lastAssignedAt: new Date() }
            );
            return candidate;
        // }
    }

    // If it reaches here, no managers were found (but we already checked activeManagers.length === 0 above)
    return null;
}

/**
 * Get manager workload summary for admin dashboard.
 * Shows each manager's status, active project count, and availability.
 */
async function getManagerWorkloads() {
    const managers = await Admin.find({ role: "manager" }).sort({ createdAt: 1 });

    const workloads = await Promise.all(managers.map(async (mgr) => {
        const activeCount = await Cproject.countDocuments({
            Pmanager: mgr.usr_id,
            status: { $in: ["available", "assigned", "in-progress"] }
        });
        return {
            usr_id: mgr.usr_id,
            usr_name: mgr.usr_name,
            email: mgr.email,
            status: mgr.status,
            department: mgr.department,
            activeProjects: activeCount,
            maxProjects: mgr.maxProjects || 30, // Default to 30 visually, but limit removed
            lastAssignedAt: mgr.lastAssignedAt,
            // isAvailable: mgr.status === "active" && activeCount < (mgr.maxProjects || 10)
            isAvailable: mgr.status === "active" // Capacity limit removed per user request
        };
    }));

    return workloads;
}

module.exports = { getNextAvailableManager, getManagerWorkloads };
