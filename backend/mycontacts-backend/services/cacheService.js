/**
 * CacheService — Lightweight in-memory cache backed by node-cache.
 *
 * Keeps frequently accessed data in memory to reduce MongoDB round-trips
 * and external API calls (e.g. news). Suitable for single-server deployments.
 * For multi-server scaling, swap this out for Redis.
 */

const NodeCache = require('node-cache');

// Default TTLs (seconds)
const TTL = {
  NEWS:          15 * 60,   // 15 minutes
  TOP_SKILLS:    5 * 60,    // 5 minutes
  USER_PROFILE:  2 * 60,    // 2 minutes
  CLIENT_PROFILE: 2 * 60,   // 2 minutes
  DASHBOARD:     1 * 60,    // 1 minute  — full dashboard aggregation
};

// Single shared instance
const cache = new NodeCache({
  stdTTL: TTL.USER_PROFILE,
  checkperiod: 60,       // Garbage-collect expired keys every 60 s
  useClones: false,       // Return references for performance (objects are read-only down-stream)
});

// ─── Key Builders ─────────────────────────────────────────────────

const keys = {
  news:              ()   => 'news:latest',
  topSkills:         ()   => 'skills:top',
  userProfile:       (id) => `user:${id}`,
  clientProfile:     (id) => `client:${id}`,
  freelancerDash:    (id) => `dash:fl:${id}`,
  clientDash:        (id) => `dash:cl:${id}`,
};

// ─── Public API ───────────────────────────────────────────────────

function get(key) {
  return cache.get(key);
}

function set(key, value, ttl) {
  return cache.set(key, value, ttl);
}

function invalidate(key) {
  return cache.del(key);
}

/**
 * Invalidate all cache entries related to a specific user.
 * Call this after any profile / skill mutation.
 */
function invalidateUser(userId) {
  cache.del(keys.userProfile(userId));
  cache.del(keys.freelancerDash(userId));
  cache.del(keys.clientDash(userId));
  // Also bust top-skills since a user skill change may affect it
  cache.del(keys.topSkills());
}

function flush() {
  cache.flushAll();
}

module.exports = {
  get,
  set,
  invalidate,
  invalidateUser,
  flush,
  keys,
  TTL,
};
