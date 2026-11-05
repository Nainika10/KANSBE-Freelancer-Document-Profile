const { constants } = require("../constants")
const { sanitizeForLogging } = require('../Utility/logSanitizer');
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || err.status || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

    console.log("Error caught by errorHandler:", sanitizeForLogging({
        statusCode,
        message: err.message
    }));

    res.status(statusCode);

    switch (statusCode) {
        case constants.VALIDATION_ERROR:
            res.json({ title: "Validation Failed", message: err.message });
            break;
        case constants.UNAUTHORIZED:
            res.json({ title: "Unauthorised", message: err.message });
            break;
        case constants.FORBIDDEN:
            res.json({ title: "Forbidden", message: err.message });
            break;
        case constants.NOT_FOUND:
            res.json({ title: "Not Found", message: err.message });
            break;
        case constants.SERVER_ERROR:
            res.json({ title: "Server Error", message: err.message });
            break;
        default:
            res.json({ title: "Error", message: err.message });
            break;
    }
};

module.exports = errorHandler;






