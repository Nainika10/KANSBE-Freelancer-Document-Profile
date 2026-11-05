const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {

    // Safety check (token middleware must run first)
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        message: "Unauthorized: role not found"
      });
    }

    // Role check
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied: insufficient permissions"
      });
    }

    // Role allowed → continue
    next();
  };
};
module.exports = authorizeRoles;