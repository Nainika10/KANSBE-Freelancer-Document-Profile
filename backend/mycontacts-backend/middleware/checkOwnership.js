/**
 * Ownership Check Middleware
 * Prevents IDOR vulnerabilities by ensuring users can only access their own resources
 */

/**
 * Middleware to verify user owns the resource they're accessing
 * @param {string} idParam - The parameter name containing the resource ID (e.g., 'c_id', 'fl_id')
 * @param {string} userIdField - The field name in req.user containing the user's ID
 */
const checkOwnership = (idParam, userIdField) => {
    return (req, res, next) => {
        // Get the requested resource ID from params, body, or query
        const requestedId = req.params[idParam] || req.body[idParam] || req.query[idParam];
        
        // Get the user's ID from the JWT token (set by validateToken middleware)
        const userId = req.user?.[userIdField];

        // If user doesn't have the required ID field, they can't access this resource type
        if (!userId) {
            console.warn(`[Auth Failure] Missing ${userIdField} in token. User:`, req.user?.email || 'Unknown');
            return res.status(403).json({ 
                message: `Forbidden: You are not authorized to access this resource type` 
            });
        }

        // If a resource ID is specified and it doesn't match the user's ID, deny access
        if (requestedId && requestedId !== userId) {
            console.warn(`[Auth Failure] ID mismatch. Requested: ${requestedId}, Token: ${userId}`);
            return res.status(403).json({ 
                message: "Forbidden: You can only access your own data" 
            });
        }

        next();
    };
};

/**
 * Middleware to check if user is admin
 */
const checkAdmin = () => {
    return (req, res, next) => {
        // Check if user has admin role or usr_id (admin identifier)
        if (!req.user?.role || req.user.role !== 'admin') {
            // Also check for admin user IDs (usr_id pattern)
            if (!req.user?.usr_id) {
                return res.status(403).json({ 
                    message: "Forbidden: Admin access required" 
                });
            }
        }
        next();
    };
};

/**
 * Middleware to allow access if user is owner OR admin
 * @param {string} idParam - The parameter name containing the resource ID
 * @param {string} userIdField - The field name in req.user containing the user's ID
 */
const checkOwnershipOrAdmin = (idParam, userIdField) => {
    return (req, res, next) => {
        const requestedId = req.params[idParam] || req.body[idParam] || req.query[idParam];
        const userId = req.user?.[userIdField];
        const isAdmin = req.user?.role === 'admin' || req.user?.usr_id;

        // Allow if admin
        if (isAdmin) {
            return next();
        }

        // Check ownership for non-admins
        if (!userId) {
            console.warn(`[Auth Failure] Non-admin missing ${userIdField} in token. User:`, req.user?.email || 'Unknown');
            return res.status(403).json({ 
                message: "Forbidden: You are not authorized to access this resource type" 
            });
        }

        if (requestedId && requestedId !== userId) {
            console.warn(`[Auth Failure] ID mismatch (Non-admin). Requested: ${requestedId}, Token: ${userId}`);
            return res.status(403).json({ 
                message: "Forbidden: You can only access your own data" 
            });
        }

        next();
    };
};

/**
 * Middleware specifically for notifications
 * Allows access if the ID matches fl_id, c_id, or usr_id in the token
 * @param {string} idParam - The parameter name containing the user ID
 */
const checkNotificationOwnership = (idParam) => {
    return (req, res, next) => {
        const requestedId = req.params[idParam] || req.body[idParam] || req.query[idParam];
        
        // Try to match against any available ID in the token
        const tokenUserId = req.user?.fl_id || req.user?.c_id || req.user?.usr_id;
        const isAdmin = req.user?.role === 'admin' || req.user?.usr_id;

        if (isAdmin) {
            return next();
        }

        if (!tokenUserId) {
            return res.status(403).json({ 
                message: "Forbidden: Authentication required" 
            });
        }

        if (requestedId && requestedId !== tokenUserId) {
            return res.status(403).json({ 
                message: "Forbidden: You can only access your own notifications" 
            });
        }

        next();
    };
};

module.exports = { checkOwnership, checkAdmin, checkOwnershipOrAdmin, checkNotificationOwnership };
