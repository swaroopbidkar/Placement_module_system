const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    companyName: { type: String, required: true },
    jobProfile: { type: String, required: true }
});

const studentSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    roll: Number,
    name: String,
    age: Number,
    college: String,
    placementStatus: String,
    graduation: Number,
    pgraduation: Number,
    experience: String,
    phoneNumber: String,
    placeOfBirth: String,
    tenthPercentage: Number,
    twelfthPercentage: Number,
    otp: String,
    otpExpires: Date,
    photo: String,  
    resume: String,  
    year: String,
    department: String,
    applications: [applicationSchema]
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
