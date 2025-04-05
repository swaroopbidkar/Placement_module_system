const express = require('express');
const router = express.Router();
const multer = require('multer');
const Student = require('../models/student');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Ensure this directory exists
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Promisify fs.unlink
const unlinkAsync = promisify(fs.unlink);

router.get('/login', (req, res) => {
    res.render('student_login');
});

router.get('/register', (req, res) => {
    res.render('student_register');
});

router.post('/update', upload.fields([{ name: 'photo' }, { name: 'resume' }]), async (req, res) => {
    const { roll, name, email, academicyear, age, placementStatus, graduation, pgraduation, experience, phoneNumber, tenthPercentage, twelfthPercentage, year, department, company } = req.body;
    const photoFile = req.files['photo'] ? req.files['photo'][0] : null;
    const resumeFile = req.files['resume'] ? req.files['resume'][0] : null;
    const keepPhoto = req.body.keepPhoto === 'keep';
    const keepResume = req.body.keepResume === 'keep';

    try {
        const student = await Student.findOne({ roll });
        if (!student) {
            return res.status(404).send('Student not found');
        }

        // Update student fields
        student.name = name;
        student.academicyear = academicyear;
        student.age = age;
        student.email = email;
        student.placementStatus = placementStatus;
        student.graduation = graduation;
        student.pgraduation = pgraduation;
        student.experience = experience;
        student.phoneNumber = phoneNumber;
        student.tenthPercentage = tenthPercentage;
        student.twelfthPercentage = twelfthPercentage;
        student.year = year;
        student.department = department;
        student.company = company;
        console.log(company);

        // Handling photo update
        if (!keepPhoto && photoFile) {
            // Delete old photo if it exists
            const oldPhotoPath = path.join(student.photo);

            if (student.photo) {
                await unlinkAsync(oldPhotoPath);
                await fs.promises.rename(photoFile.path, oldPhotoPath);
            }
            // Assign new photo path and rename if necessary
            const newPhotoPath = path.join('uploads', photoFile.originalname);
            console.log(oldPhotoPath)
            console.log(newPhotoPath)
            student.photo = oldPhotoPath;
        }

        // Handling resume update
        if (!keepResume && resumeFile) {
            // Delete old resume if it exists
            const oldResumePath = path.join(student.resume);
            if (student.resume) {
                await unlinkAsync(oldResumePath);
                await fs.promises.rename(resumeFile.path, oldResumePath);
            }
            // Assign new resume path and rename if necessary
            const newResumePath = path.join('uploads', resumeFile.originalname);
            console.log(oldResumePath)
            console.log(newResumePath)
            student.resume = oldResumePath;
        }

        // Save updated student information
        await student.save();

        // Redirect to dashboard after update
        res.redirect('/student/dashboard');
    } catch (error) {
        console.error('Error updating student details:', error);
        res.redirect('/student/dashboard');
    }
});



const nodemailer = require('nodemailer');

router.post('/sendnotification', async (req, res) => {
    const { to, subject, message } = req.body;

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'your-email@gmail.com',        // Replace with your Gmail address
                pass: 'your-app-password'            // Replace with your Gmail App Password
            }
        });

        await transporter.sendMail({
            from: '"Placement Cell" <your-email@gmail.com>',
            to: to, // This will come from the select box in your form
            subject: subject,
            text: message
        });

        res.render('sendnotification', { success: true }); // Pass a success flag to EJS

    } catch (error) {
        console.error('Error sending email:', error);
        res.render('sendnotification', { error: true }); // Pass an error flag to EJS
    }
});














module.exports = router;
