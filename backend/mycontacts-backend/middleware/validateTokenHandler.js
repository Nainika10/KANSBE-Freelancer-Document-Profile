const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const { logPageVisit } = require('../Utility/activityLogger');

const validateToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "You are not authenticated or token is missing" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // Try verifying with Admin Secret
      jwt.verify(token, process.env.ADMIN_ACCESS_TOKEN_SECRET, (errAdmin, decodedAdmin) => {
        if (errAdmin) {
          res.status(401);
          return next(new Error("User is not authorized or token is missing"));
        }

        req.user = decodedAdmin.admin;
        next();
      });
    } else {
      req.user = decoded.user;

      logPageVisit(req).catch(() => {
        // Intentionally non-blocking: page visit logging should not break user requests.
      });

      // Pick IDs from request
      const requested_c_id = req.params.c_id || req.body.c_id || req.query.c_id;
      const requested_f_id = req.params.fl_id || req.body.fl_id || req.query.fl_id;

      // If token has c_id → validate c_id
      if (decoded.user.c_id) {
        if (requested_c_id && requested_c_id !== decoded.user.c_id) {
          res.status(403);
          return next(new Error("Forbidden: c_id mismatch"));
        }
      }

      // If token has id (faculty id) → validate against requested f_id
      if (decoded.user.fl_id) {
        if (requested_f_id && requested_f_id !== decoded.user.fl_id) {
          res.status(403);
          return next(new Error("Forbidden: f_id mismatch"));
        }
      }

      // ✅ Important: allow request to continue
      next();
    }
  });
});

module.exports = validateToken;
