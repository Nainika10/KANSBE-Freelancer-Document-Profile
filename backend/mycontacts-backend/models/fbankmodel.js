const mongoose = require("mongoose");
const bankSchema = new mongoose.Schema(
{
    fl_id:{
        type:String,
        required:true,
        unique:true
    },
    bankname:{
        type:String,
        
    },
    acholdername:{
        type:String,
        
    },
    acnumber:{
        type:Number,
        
    },
    ifsc:{
        type:String,
        
    },
    branchname:{
        type:String,
        
    },
    createdby:{
        type: String
    },
    updatedby:{
        type: String
    }
},{
    timestamps:true
}
);
module.exports = mongoose.model("Fbank",bankSchema);