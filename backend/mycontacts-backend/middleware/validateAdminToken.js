/**
 * Admin Token Validation Middleware
 * Uses ADMIN_ACCESS_TOKEN_SECRET to validate admin tokens separately from user tokens
 * This prevents privilege escalation attacks where users could access admin routes
 */
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const { logPageVisit } = require('../Utility/activityLogger');

const validateAdminToken = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: Admin token is missing" });
    }

    const token = authHeader.split(" ")[1];

    // Use ADMIN_ACCESS_TOKEN_SECRET - NOT the regular user secret
    jwt.verify(token, process.env.ADMIN_ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: "Unauthorized: Invalid or expired admin token" });
        }

        // Admin tokens use 'admin' payload, not 'user' payload
        if (!decoded.admin) {
            return res.status(403).json({ message: "Forbidden: This is not an admin token" });
        }

        // Set req.user from admin payload for consistency with other middleware
        req.user = {
            usr_id: decoded.admin.usr_id,
            email: decoded.admin.email,
            role: decoded.admin.role
        };

        logPageVisit(req).catch(() => {
            // Intentionally non-blocking: page visit logging should not break admin requests.
        });

        next();
    });
});

/**
 * Middleware to authorize specific admin roles
 * @param  {...string} allowedRoles - List of allowed roles (e.g., "admin", "Manager")
 */
const authorizeAdminRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // Safety check - validateAdminToken must run first
        if (!req.user || !req.user.role) {
            return res.status(401).json({
                message: "Unauthorized: Admin authentication required"
            });
        }

        // Role check
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "Forbidden: Insufficient admin permissions"
            });
        }

        next();
    };
};

module.exports = { validateAdminToken, authorizeAdminRoles };
