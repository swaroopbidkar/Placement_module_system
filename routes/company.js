const express = require('express');
const session = require('express-session');
const router = express.Router();
const Company = require('../models/company');
const Student = require('../models/student');

router.use(session({
    secret: 'secret', 
    resave: true,
    saveUninitialized: true
}));

router.get('/login', (req, res) => {
    res.render('login');
});


router.get('/register', (req, res) => {
    res.render('company_register');
});


module.exports = router;
