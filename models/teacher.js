const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    department: String,
    phone: Number,
    experience: Number,
    qualification: String,
    otp:String,
    otpExpires:Date
});

module.exports = mongoose.model('Teacher', teacherSchema);
