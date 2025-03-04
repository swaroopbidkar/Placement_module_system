const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    name: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    otp:String,
    otpExpires:Date
    
});

module.exports = mongoose.model('Company', companySchema);
