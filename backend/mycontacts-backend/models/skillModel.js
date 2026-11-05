const mongoose = require("mongoose");

const newskillSchema = new mongoose.Schema({
    id: Number,
    skill: String,
    status: String,
    createdby: String,
    updatedby: String
}, {
    timestamps: true
})

const skillSchema = new mongoose.Schema({
    fl_id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    skills: [newskillSchema],
    createdby:{
        type: String
    }
},
    {
        timestamps: true
    });

module.exports = mongoose.model("skill", skillSchema);