const mongoose = require("mongoose");
const bankSchema = new mongoose.Schema(
{
    c_id:{
        type:String,
        required:true,
        unique:true
    },
    bankname:{
        type:String,
        required:false
    },
    acholdername:{
        type:String,
        required:false
    },
    acnumber:{
        type:Number,
        required:false
    },
    ifsc:{
        type:String,
        required:false
    },
    branchname:{
        type:String,
        required:false
    },
    createdby:{
        type: String,
        required: true
    },
    updatedby:{
        type: String
    }
},{
    timestamps:true
}
);
module.exports = mongoose.model("Bank",bankSchema);