const express = require('express');
const router = express.Router();

router.use('/student', require('./student'));
router.use('/teacher', require('./teacher'));
router.use('/company', require('./company'));

module.exports = router;
