const UserActivity = require('../models/userActivityModel');

function getUserIdentity(req) {
  const user = req?.user || {};
  const userId = user.fl_id || user.c_id || user.usr_id || req?.body?.fl_id || req?.body?.c_id || req?.body?.usr_id || req?.params?.fl_id || req?.params?.c_id || req?.params?.usr_id || null;

  if (user.fl_id) return { userId: user.fl_id, userType: 'freelancer' };
  if (user.c_id) return { userId: user.c_id, userType: 'client' };
  if (user.usr_id) return { userId: user.usr_id, userType: user.role || 'admin' };
  if (req?.body?.fl_id || req?.params?.fl_id) return { userId: req.body?.fl_id || req.params?.fl_id, userType: 'freelancer' };
  if (req?.body?.c_id || req?.params?.c_id) return { userId: req.body?.c_id || req.params?.c_id, userType: 'client' };
  if (req?.body?.usr_id || req?.params?.usr_id) return { userId: req.body?.usr_id || req.params?.usr_id, userType: 'manager' };

  return { userId: null, userType: 'unknown' };
}

async function logUserActivity(req, action, entity = null, entityId = null, details = {}, userIdOverride = null) {
  const identity = getUserIdentity(req);
  const userId = userIdOverride || identity.userId;
  const userType = identity.userType || 'unknown';

  if (!userId || !action) {
    return null;
  }

  const safeDetails = details && typeof details === 'object' ? details : {};

  return UserActivity.create({
    userId,
    userType,
    action,
    entity,
    entityId: entityId || req?.params?.p_id || req?.params?.taskId || null,
    details: safeDetails,
    requestPath: req?.originalUrl || req?.path || null,
    ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
    userAgent: req?.headers?.['user-agent'] || null,
  });
}

async function logPageVisit(req) {
  const { userId, userType } = getUserIdentity(req);

  if (!userId || !req?.originalUrl) {
    return null;
  }

  return UserActivity.create({
    userId,
    userType,
    action: 'page_visit',
    entity: 'page',
    entityId: req.originalUrl,
    details: {
      method: req.method,
      path: req.originalUrl,
    },
    requestPath: req.originalUrl,
    ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || null,
    userAgent: req?.headers?.['user-agent'] || null,
  });
}

async function getUserActivityStats({ userId, userType, action, startDate, endDate } = {}) {
  const match = {};

  if (userId) match.userId = userId;
  if (userType) match.userType = userType;
  if (action) match.action = action;

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  return UserActivity.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          userId: '$userId',
          userType: '$userType',
          action: '$action',
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1, '_id.action': 1 } },
    {
      $project: {
        _id: 0,
        userId: '$_id.userId',
        userType: '$_id.userType',
        action: '$_id.action',
        count: 1,
      },
    },
  ]);
}

async function getUserDailySummary({ userId, userType, action, startDate, endDate } = {}) {
  const match = {};

  if (userId) match.userId = userId;
  if (userType) match.userType = userType;
  if (action) match.action = action;

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  return UserActivity.aggregate([
    { $match: match },
    {
      $project: {
        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        userId: 1,
        userType: 1,
        action: 1,
        entity: 1,
        requestPath: 1,
      }
    },
    {
      $group: {
        _id: '$date',
        userId: { $first: '$userId' },
        userType: { $first: '$userType' },
        totalActivities: { $sum: 1 },
        actions: { $addToSet: '$action' },
        pageVisits: {
          $sum: { $cond: [{ $eq: ['$action', 'page_visit'] }, 1, 0] }
        },
        logins: {
          $sum: { $cond: [{ $eq: ['$action', 'login'] }, 1, 0] }
        },
        taskUpdates: {
          $sum: { $cond: [{ $regexMatch: { input: '$action', regex: 'task_' } }, 1, 0] }
        },
        projectChecks: {
          $sum: { $cond: [{ $regexMatch: { input: '$action', regex: 'project_' } }, 1, 0] }
        },
      }
    },
    { $sort: { _id: -1 } },
    {
      $project: {
        _id: 0,
        date: '$_id',
        userId: 1,
        userType: 1,
        totalActivities: 1,
        actions: 1,
        pageVisits: 1,
        logins: 1,
        taskUpdates: 1,
        projectChecks: 1,
      }
    }
  ]);
}

async function getUserActivityTimeline({ userId, userType, action, limit = 50, startDate, endDate } = {}) {
  const match = {};

  if (userId) match.userId = userId;
  if (userType) match.userType = userType;
  if (action) match.action = action;

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  return UserActivity.aggregate([
    { $match: match },
    { $sort: { createdAt: -1 } },
    { $limit: Number(limit) || 50 },
    {
      $project: {
        _id: 0,
        userId: 1,
        userType: 1,
        action: 1,
        entity: 1,
        entityId: 1,
        requestPath: 1,
        details: 1,
        createdAt: 1,
      }
    }
  ]);
}

module.exports = {
  getUserIdentity,
  logUserActivity,
  logPageVisit,
  getUserActivityStats,
  getUserDailySummary,
  getUserActivityTimeline,
};
