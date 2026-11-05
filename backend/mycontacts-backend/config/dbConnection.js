

const mongoose = require("mongoose");


const connectDb = async () => {
    try {
        console.log("Initiating mongoose.connect with URI prefix:", (process.env.CONNECTION_STRING || "").substring(0, 20));
        const connect = await mongoose.connect(process.env.CONNECTION_STRING, {
            serverSelectionTimeoutMS: 30000
        });
        console.log("MongoDB connected:", connect.connection.host, connect.connection.name);
    } catch (err) {
        console.error("connectDb Error:", err.message);
        process.exit(1);
    }
};

module.exports = connectDb;
