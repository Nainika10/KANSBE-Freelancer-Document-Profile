/**
 * DashboardController — BFF (Backend-for-Frontend) aggregated endpoints.
 *
 * Returns ALL data needed by the dashboard in a single JSON response,
 * eliminating the waterfall of multiple small API calls from the frontend.
 */

const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');
const Cregister = require('../models/cregisterModel');
const Skill = require('../models/skillModel');
const Notification = require('../models/freelancer_notificationModel');
const CProject = require('../models/cprojectModel');
const Group = require('../models/groupModel');

const { calculateFreelancerCompletion, calculateClientCompletion } = require('../services/profileService');
const { getFilteredNews } = require('../services/newsService');
const cacheService = require('../services/cacheService');

// ─── Freelancer Dashboard Summary ──────────────────────────────────

const getFreelancerDashboard = asyncHandler(async (req, res) => {
  const { fl_id } = req.params;

  if (!fl_id) {
    return res.status(400).json({ message: 'fl_id is required' });
  }

  // Check cache first
  const cacheKey = cacheService.keys.freelancerDash(fl_id);
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  try {
    // Fire all DB queries in parallel
    const [user, skillDocs, notifDoc, news, topSkills] = await Promise.all([
      User.findOne({ fl_id }).lean(),
      Skill.find({ fl_id }).lean(),
      Notification.findOne({ usr_id: fl_id }).lean(),
      getFilteredNews(),
      getTopSkills(),
    ]);

    if (!user) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }

    // ─── Profile Completion ────────────────────────────────────
    const completion = calculateFreelancerCompletion(user, skillDocs);

    // Persist the calculated percentage if it changed
    if (user.profile_completion !== completion.percentage) {
      User.updateOne(
        { fl_id },
        { $set: { profile_completion: completion.percentage } }
      ).catch(err => console.error('Profile completion save error:', err.message));
    }

    // ─── Skills ────────────────────────────────────────────────
    const skills = skillDocs && skillDocs.length > 0 ? skillDocs : [{ skills: [] }];

    // ─── Notifications ─────────────────────────────────────────
    let unreadCount = 0;
    let recentNotifications = [];
    if (notifDoc && notifDoc.messages) {
      const allMessages = [...notifDoc.messages].reverse(); // newest first
      unreadCount = allMessages.filter(m => !m.isread).length;
      recentNotifications = allMessages.slice(0, 5);
    }

    // ─── Assemble Response ─────────────────────────────────────
    const response = {
      user: sanitizeUser(user),
      skills,
      notifications: {
        unread_count: unreadCount,
        recent: recentNotifications,
      },
      profile_completion: completion,
      news,
      platform_stats: {
        top_skills: topSkills,
      },
    };

    // Cache for 1 minute
    cacheService.set(cacheKey, response, cacheService.TTL.DASHBOARD);

    res.status(200).json(response);
  } catch (error) {
    console.error('Freelancer dashboard error:', error.message);
    res.status(500).json({ message: 'Failed to load dashboard', error: error.message });
  }
});

// ─── Client Dashboard Summary ──────────────────────────────────────

const getClientDashboard = asyncHandler(async (req, res) => {
  const { c_id } = req.params;

  if (!c_id) {
    return res.status(400).json({ message: 'c_id is required' });
  }

  // Check cache first
  const cacheKey = cacheService.keys.clientDash(c_id);
  const cached = cacheService.get(cacheKey);
  if (cached) {
    return res.status(200).json(cached);
  }

  try {
    // Fire all DB queries in parallel
    const [client, allProjects, notifDoc, activeProjects] = await Promise.all([
      Cregister.findOne({ c_id }).lean(),
      CProject.find({ c_id }).lean(),
      Notification.findOne({ usr_id: c_id }).lean(),
      getAcceptedProjects(c_id),
    ]);

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // ─── Profile Completion ────────────────────────────────────
    const completion = calculateClientCompletion(client);

    // Persist the calculated percentage if it changed
    if (client.profile_completion !== completion.percentage) {
      Cregister.updateOne(
        { c_id },
        { $set: { profile_completion: completion.percentage } }
      ).catch(err => console.error('Client profile completion save error:', err.message));
    }

    // ─── Project Stats ─────────────────────────────────────────
    const projects = Array.isArray(allProjects) ? allProjects : [];
    const total = projects.length;
    const completed = projects.filter(p =>
      p.status?.toLowerCase() === 'completed' || p.status?.toLowerCase() === 'finished'
    ).length;

    // Ongoing count: only projects where client has accepted freelancer
    const ongoing = activeProjects.filter(p => 
      p.status?.toLowerCase() === 'in-progress' || p.status?.toLowerCase() === 'ready-for-completion'
    ).length;

    // ─── Notifications ─────────────────────────────────────────
    let unreadCount = 0;
    let recentNotifications = [];
    if (notifDoc && notifDoc.messages) {
      const allMessages = [...notifDoc.messages].reverse();
      unreadCount = allMessages.filter(m => !m.isread).length;
      recentNotifications = allMessages.slice(0, 5);
    }

    // ─── Assemble Response ─────────────────────────────────────
    const response = {
      client,
      projects: {
        all: projects,
        active: activeProjects,
        stats: { total, ongoing, completed },
      },
      notifications: {
        unread_count: unreadCount,
        recent: recentNotifications,
      },
      profile_completion: completion,
    };

    // Cache for 1 minute
    cacheService.set(cacheKey, response, cacheService.TTL.DASHBOARD);

    res.status(200).json(response);
  } catch (error) {
    console.error('Client dashboard error:', error.message);
    res.status(500).json({ message: 'Failed to load dashboard', error: error.message });
  }
});

// ─── Helper Functions ──────────────────────────────────────────────

/**
 * Strip sensitive fields from user object before sending to frontend.
 */
function sanitizeUser(user) {
  if (!user) return user;
  const { password, __v, ...safe } = user;
  return safe;
}

/**
 * Get accepted/assigned projects for a client
 */
async function getAcceptedProjects(c_id) {
  try {
    // Group doesn't have c_id, so we must join with cprojects
    return await Group.aggregate([
      {
        $lookup: {
          from: "cprojects",
          localField: "p_id",
          foreignField: "p_id",
          as: "project_details"
        }
      },
      { $unwind: "$project_details" },
      { $match: { "project_details.c_id": c_id, status: { $in: ['assigned', 'in-progress', 'ready-for-completion'] } } },
      {
        $project: {
          grp_id: 1,
          grp_name: 1,
          p_id: 1,
          status: 1,
          title: "$project_details.title",
          Tasks: "$project_details.Tasks"
        }
      }
    ]);
  } catch (err) {
    console.error('getAcceptedProjects error:', err.message);
    return [];
  }
}

/**
 * Get top skills across the platform (aggregated, cached).
 */
async function getTopSkills() {
  const cacheKey = cacheService.keys.topSkills();
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  try {
    const result = await Skill.aggregate([
      { $unwind: '$skills' },
      { $group: { _id: '$skills.skill', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, skill: '$_id', count: 1 } },
    ]);

    const topSkills = result.map(r => r.skill);
    cacheService.set(cacheKey, topSkills, cacheService.TTL.TOP_SKILLS);
    return topSkills;
  } catch (err) {
    console.error('Top skills aggregation error:', err.message);
    return [];
  }
}

module.exports = {
  getFreelancerDashboard,
  getClientDashboard,
};
