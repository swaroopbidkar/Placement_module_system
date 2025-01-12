const express = require('express');
const router = express.Router();
const Student = require('../models/student');
const Teacher = require('../models/teacher');
const Placement = require('../models/placement');

router.get('/login', (req, res) => {
    res.render('teacher_login');
});

router.get('/register', (req, res) => {
    res.render('teacher_register');
});

router.get('/teacher/dashboard', (req, res) => {
    res.render('teacher_dashboard');
});





module.exports = router;
