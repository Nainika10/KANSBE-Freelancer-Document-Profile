const rateLimit = require('express-rate-limit');


const mailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per window (here, per 15 minutes)
    message: 'Too many email requests from this IP, please try again after 15 minutes'
});
module.exports = mailLimiter;