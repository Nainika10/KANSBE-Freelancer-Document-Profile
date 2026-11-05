const asyncHandler = require("express-async-handler");

const healthcheck = asyncHandler(async(req,res)=>{
    res.status(200).json({message:"Everything is ok"});
});

module.exports = {healthcheck}