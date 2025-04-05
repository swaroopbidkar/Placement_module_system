const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Student = require('../models/student');

router.get('/sendnotification', async (req, res) => {
  try {
    const students = await Student.find();
    res.render('sendnotification', { students, success: false, error: false });
  } catch (error) {
    res.send('Error loading form.');
  }
});

router.post('/sendnotification', async (req, res) => {
  const { to, subject, message } = req.body;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'omkarmokashi95@gmail.com',
      pass: 'xwdsvosyjkstdeqa',
    },
  });

  const recipients = Array.isArray(to) ? to : [to];

  const mailOptions = {
    from: 'omkarmokashi95@gmail.com',
    to: recipients,
    subject: subject,
    text: message,
  };

  try {
    await transporter.sendMail(mailOptions);
    const students = await Student.find();
    res.render('sendnotification', { students, success: true, error: false });
  } catch (err) {
    console.error('Email sending failed:', err);
    const students = await Student.find();
    res.render('sendnotification', { students, success: false, error: true });
  }
});

module.exports = router;
