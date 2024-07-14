const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const indexRouter = require('./routes/index');
const Student = require('./models/student');
const Company = require('./models/company');
const Teacher = require('./models/teacher');
const Placement = require('./models/placement');
const bcrypt = require('bcrypt');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');
const favicon = require('serve-favicon');
const multer = require('multer');
const company = require('./models/company');
const app = express();


mongoose.connect('mongodb://localhost:27017/placement', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Error connecting to MongoDB:', err));


app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/images', express.static('images'));
app.use(bodyParser.json());
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));


// Routes
app.use('/', indexRouter);

app.get('/', (req, res) => {
    res.render('home');
});


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});


const upload = multer({ storage: storage });






// STUDENT SECTION                       

// Student Registration

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'omkarmokashi95@gmail.com',  // Your Gmail email address
        pass: 'xwdsvosyjkstdeqa'  // Your Gmail password
    }
});

app.post('/student/register', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'resume', maxCount: 1 }]), async (req, res) => {
    const { roll, name, email, password, age, placementStatus, graduation, pgraduation, experience, phoneNumber, tenthPercentage, twelfthPercentage, year, department,skills } = req.body;
    const photo = req.files['photo'] ? req.files['photo'][0].path : '';
    const resume = req.files['resume'] ? req.files['resume'][0].path : '';
    
    try {
        const existingTeacher = await Teacher.findOne({ email });
        const existingStudent = await Student.findOne({ email });
        if (existingStudent || existingTeacher) {
            return res.redirect('/student/register?success=false');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 8);

        // Save the student to the database
        const newStudent = new Student({
            roll,
            name,
            email,
            password: hashedPassword,
            age,
            placementStatus,
            graduation,
            pgraduation,
            experience,
            phoneNumber,
            tenthPercentage,
            twelfthPercentage,
            photo,
            resume,
            year,
            department,
            skills: skills.split(',').map(skill => skill.trim()) 
        });
        await newStudent.save();

        // Send email to the student
        const mailOptions = {
            from: 'omkarmokashi95@gmail.com',
            to: email,
            subject: 'Registration Successful',
            text: `Dear ${name},\n\nYour registration was successful.\n\nLogin Credentials:\nEmail: ${email}\nPassword: ${password}\n\nThank you!`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        return res.redirect('/student/login?success=true');
    } catch (error) {
        console.error('Error registering student:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Student Login
app.post('/student/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const student = await Student.findOne({ email });
        if (!student) {
            return res.redirect('/student/login?success=false');
        }
        bcrypt.compare(password, student.password, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).send('Internal Server Error');
            }
            if (isMatch) {
                req.session.studentId = student._id;
                res.redirect('/student/dashboard');
            } else {
                return res.redirect('/student/login?success=false');
            }
        });
    } catch (error) {
        console.error('Error logging in student:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Student Dashboard
app.get('/student/dashboard', async (req, res) => {
    try {
        const studentId = req.session.studentId;
        if (!studentId) {
            return res.redirect('/student/login');
        }
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send('Student not found');
        }
        const placements = await Placement.find().sort({ date: 1 });
        res.setHeader('Cache-Control', 'no-store');
        res.render('student_dashboard', { student: student, placements: placements });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Student Update Details
app.get('/student/update', async (req, res) => {
    try {
        const studentIds = req.session.studentId;
        if (!studentIds) {
            return res.redirect('/student/login');
        }
        const students = await Student.findById(studentIds);
        if (!students) {
            return res.status(404).send('Student not found');
        }
        res.setHeader('Cache-Control', 'no-store');
        res.render('update_registration_form', { students });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Checking Applied Button Status
app.get('/checkApplied', async (req, res) => {
    try {
        const studentId = req.session.studentId;
        const { companyName, jobProfile } = req.query;

        if (!companyName || !jobProfile) {
            return res.status(400).json({ error: 'Missing companyName or jobProfile' });
        }

        const student = await Student.findById(studentId);

        if (!student) {
            console.error('Student not found');
            return res.status(404).json({ error: 'Student not found' });
        }

        const trimmedCompanyName = companyName.trim();
        const trimmedJobProfile = jobProfile.trim();
        const applied = student.applications.some(application =>
            application.companyName.trim() === trimmedCompanyName && application.jobProfile.trim() === trimmedJobProfile
        );

        res.status(200).json({ applied: applied });
    } catch (error) {
        console.error('Error checking if already applied:', error);
        res.status(500).json({ error: 'Error checking if already applied: ' + error });
    }
});

// Saving Company Name in Student Database
app.post('/saveCompany', (req, res) => {
    const studentId = req.session.studentId;
    const { companyName, jobProfile } = req.body;

    if (!companyName || !jobProfile) {
        return res.status(400).json({ error: 'Missing companyName or jobProfile' });
    }

    Student.findById(studentId)
        .then((student) => {
            if (!student) {
                return res.status(404).send('Student not found');
            }

            if (!student.applications) {
                student.applications = [];
            }

            student.applications.push({ companyName, jobProfile });

            return student.save();
        })
        .then((updatedStudent) => {
            res.status(200).send('Company name saved successfully for student: ' + studentId);
        })
        .catch((error) => {
            res.status(500).send('Error saving company name: ' + error);
        });
});

// Student Logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/?success=logout');
        }
    });
});






// TEACHER SECTION                      

// Teacher Registration
app.post('/teacher/register', async (req, res) => {
    const { name, email, password, department, phone, experience, qualification } = req.body;
    try {
        const existingTeacher = await Teacher.findOne({ email });
        if (existingTeacher) {
            return res.status(400).send('Email already exists');
        }
        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(400).send('email already exists');
        }
        const newTeacher = new Teacher({ name, email, password, department, phone, experience, qualification });
        await newTeacher.save();
        return res.redirect('/teacher/login?success=true');
    } catch (error) {
        console.error('Error registering Teacher:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Teacher Login
app.post('/teacher/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const teacher = await Teacher.findOne({ email });
        if (!teacher) {
            return res.redirect('/teacher/login?success=false');
        }
        bcrypt.compare(password, teacher.password, async (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).send('Internal Server Error');
            }
            if (isMatch) {
                req.session.teacherId = teacher._id;
                return res.redirect('/teacher/dashboard');
            } else {
                if (password === teacher.password) {
                    req.session.teacherId = teacher._id;
                    return res.redirect('/teacher/dashboard');
                } else {
                    return res.redirect('/teacher/login?success=false');
                }
            }
        });
    } catch (error) {
        console.error('Error logging in Teacher:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Teacher Dashboard
app.get('/teacher/dashboard', async (req, res) => {
    try {
        const teacherId = req.session.teacherId;
        if (!teacherId) {
            return res.redirect('/teacher/login');
        }
        const teacher = await Teacher.findById(teacherId);
        const placements = await Placement.find().sort({ date: 1 });
        if (!teacher) {
            return res.status(404).send('Teacher not found');
        }
        res.setHeader('Cache-Control', 'no-store');
        res.render('teacher_dashboard', { teacher, placements });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

// Teacher View Students
app.get('/view_student', async (req, res) => {
    try {
        const teacherId = req.session.teacherId;
        const companyId = req.session.companyId;
        if (!teacherId && !companyId) {
            return res.redirect('/login');
        }
        res.setHeader('Cache-Control', 'no-store');
        const students = await Student.find();
        const teacher = await Teacher.findById(teacherId);
        const placedCount = await Student.countDocuments({ placementStatus: 'Placed' });
        const notPlacedCount = await Student.countDocuments({ placementStatus: 'Not Placed' });
        res.render('view_student', { teacher, students, placedCount, notPlacedCount });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Teacher View Students Excel Download
app.get('/view_student/download', async (req, res) => {
    try {
        const data = await Student.find({});
        const formattedData = data.map(student => ({
            Roll: student.roll,
            Name: student.name,
            Year: student.year,
            Department: student.department,
            Email: student.email,
            PhoneNumber: student.phoneNumber,
            TenthPercentage: student.tenthPercentage,
            TwelfthPercentage: student.twelfthPercentage,
            GraduationCGPA: student.graduation,
            PostGraduationCGPA: student.pgraduation,
            Age: student.age,
            Experience: student.experience,
            PlacementStatus: student.placementStatus
        }));
        const worksheet = xlsx.utils.json_to_sheet(formattedData);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Students');
        const excelFilePath = path.join(__dirname, 'students.xlsx');
        xlsx.writeFile(workbook, excelFilePath);
        res.download(excelFilePath, 'students.xlsx', (err) => {
            if (err) {
                console.error(err);
                res.status(500).send('Internal Server Error');
            }
            fs.unlinkSync(excelFilePath);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Teacher Delete Placements
app.post('/deleteplacement', async (req, res) => {
    const placementId = req.body.id; // Assuming id is sent via POST request
    try {
        // Find and delete the placement
        const deletedPlacement = await Placement.findByIdAndDelete(placementId);
        if (!deletedPlacement) {
            return res.status(404).json({ success: false, error: 'Placement not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting placement:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Teacher Delete Student
app.post('/deletestudent', async (req, res) => {
    const studentId = req.body.id; // Assuming id is sent via POST request
    try {
        // Find and delete the placement
        const deletedStudent = await Student.findByIdAndDelete(studentId);
        if (!deletedStudent) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting student:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});


// Teacher Logout
app.get('/teacher/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/?success=logout');
        }
    });
});






// COMPANY SECTION  

// Company Registration
app.post('/companies/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existingCompany = await Company.findOne({ email });
        if (existingCompany) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const existingStudent = await Student.findOne({ email });
        if (existingStudent) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const existingTeacher = await Teacher.findOne({ email });
        if (existingTeacher) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newCompany = new Company({ name, email, password: hashedPassword });
        await newCompany.save();
        return res.redirect('/company/login?success=true');
    } catch (error) {
        console.error('Error registering Company:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Company Login
app.post('/companies/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const company = await Company.findOne({ email });
        if (!company) {
            return res.redirect('/company/login?success=false');
        }
        bcrypt.compare(password, company.password, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).send('Internal Server Error');
            }
            if (isMatch) {
                req.session.companyId = company._id;
                req.session.companyName = company.name;
                res.redirect('/company/dashboard');
            } else {
                return res.redirect('/company/login?success=false');
            }
        });
    } catch (error) {
        console.error('Error logging in company:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Company Dashboard
app.get('/company/dashboard', async (req, res) => {
    const companyName = req.session.companyName;
    const companyId = req.session.companyId;
    try {
        if (!companyId) {
            return res.redirect('/company/login');
        }
        const appliedStudents = await Student.find({
            'applications.companyName': companyName
        }).select('name email year department applications resume graduation experience');
        const groupedStudents = appliedStudents.reduce((acc, student) => {
            student.applications.forEach(application => {
                if (application.companyName === companyName) {
                    if (!acc[application.jobProfile]) {
                        acc[application.jobProfile] = [];
                    }
                    acc[application.jobProfile].push({
                        name: student.name,
                        email: student.email,
                        year: student.year,
                        department: student.department,
                        resume: student.resume,
                        jobProfile: application.jobProfile,
                        graduation: student.graduation,
                        experience: student.experience

                    });
                    console.log(student.graduation)
                }
            });
            return acc;
        }, {});
        res.setHeader('Cache-Control', 'no-store');
        res.render('company_dashboard', { groupedStudents, companyName });
    } catch (error) {
        console.error('Error fetching applied students:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Company Dashboard Navigation
app.get('/company/dashboard', async (req, res) => {
    try {
        const companyId = req.user.companyId;
        const notifications = await Notification.find({ companyId: companyId, read: false });
        await Notification.updateMany({ companyId: companyId }, { $set: { read: true } });
        res.render('company_dashboard', { notifications: notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Company Logout
app.get('/company/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.redirect('/?success=logout');
        }
    });
});





// Teacher & Company Add Placement Drive Navigation
app.get('/add-placement-drive', async (req, res) => {
    try {
        const teacherId = req.session.teacherId;
        const companyId = req.session.companyId;
        if (!teacherId && !companyId) {
            return res.redirect('/');
        }
        if (teacherId) {
            const teacher = await Teacher.findById(teacherId);
            const companies = await Company.find({}, 'name');
            res.setHeader('Cache-Control', 'no-store');
            if (!teacher) {
                return res.status(404).send('Teacher not found');
            }
            res.render('add_placement_drive', { teacher, companies });
        } else if (companyId) {
            const company = await Company.findById(companyId);
            res.setHeader('Cache-Control', 'no-store');
            if (!company) {
                return res.status(404).send('Company not found');
            }
            res.render('add_placement_drive_Company', { company, userType: 'company' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});


// Teacher & Company Add Placement Drive
app.post('/add_placement_drive', async (req, res) => {
    const { companyName, jobProfile, description, location, date, link } = req.body;
    const teacher = req.session.teacherId;
    const company = req.session.companyId;
    const newPlacement = new Placement({
        companyName,
        jobProfile,
        description,
        location,
        date,
        link
    });
    await newPlacement.save();
    if (teacher) {
        res.redirect('/view-placement-details');
    }
    else if (company) {
        res.redirect('/view-placement-details');
    }
});


// Teacher & Company View Placement Drive
app.get('/view-placement-details', async (req, res) => {
    try {
        const teacherId = req.session.teacherId;
        const studentId = req.session.studentId;
        const companyId = req.session.companyId;
        const companyName = req.session.companyName;

        if (!teacherId && !studentId && !companyId && !companyName) {
            return res.redirect('/');
        }

        res.setHeader('Cache-Control', 'no-store');

        let placements;

        if (teacherId) {
            const teacher = await Teacher.findById(teacherId);
            placements = await Placement.find().populate('companyId');
            res.render('view_placement_details', { placements, teacher });
        } else if (studentId) {
            const student = await Student.findById(studentId);
            placements = await Placement.find().populate('companyId');
            res.render('stud_placement', { placements, student });
        } else if (companyId) {
            const company = await Company.findById(companyId);
            const placements = await Placement.find({ companyName: companyName });
            res.render('view_placement_details_company', { placements, company });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});






// Contact Form Automatic Mail Sender
app.post('/contact', (req, res) => {
    const { name, email, message } = req.body;

    let transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'omkarmokashi95@gmail.com',
            pass: 'xwdsvosyjkstdeqa'
        }
    });
    let mailOptions = {
        from: 'omkarmokashi95@gmail.com',
        to: 'swaroopbidkar19@gmail.com, omkarmokashi4@gmail.com, muizlambe07@gmail.com, smohammednaved2002@gmail.com, shaikh.arshiya5378@gmail.com',
        subject: 'New Message from Contact Form',
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return res.redirect('/?success=false');
        } else {
            console.log('Email sent: ' + info.response);
            return res.redirect('/?success=true');
        }
    });
});


// Student, Teacher & Company Forgot Password
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};


app.get('/forgot-password', (req, res) => {
    res.render('forgot_password.ejs');
});


app.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const student = await Student.findOne({ email });
        const teacher = await Teacher.findOne({ email });
        const company = await Company.findOne({ email });
        if (!student && !teacher && !company) {
            return res.redirect('/forgot-password?success=false');
        }
        const otp = generateOTP();
        if (student) {
            student.otp = otp;
            student.otpExpires = Date.now() + 600000;
            await student.save();
        }
        else if (teacher) {
            teacher.otp = otp;
            teacher.otpExpires = Date.now() + 600000;
            await teacher.save();
        }
        else if (company) {
            company.otp = otp;
            company.otpExpires = Date.now() + 600000;
            await company.save();
        }
        let transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'omkarmokashi95@gmail.com',
                pass: 'xwdsvosyjkstdeqa'
            }
        });
        const mailOptions = {
            from: 'omkarmokashi95@gmail.com',
            to: email,
            subject: 'Reset Password OTP',
            text: `Your OTP to reset your password is: ${otp}. This OTP is valid for 10 minutes.`
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ message: 'Error sending OTP email' });
            }
            console.log('OTP sent: ' + info.response);
            res.redirect(`/reset-password?email=${email}`);
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/reset-password', (req, res) => {
    res.render('reset_password.ejs', { email: req.query.email });
});

app.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const student = await Student.findOne({ email });
        const teacher = await Teacher.findOne({ email });
        const company = await Company.findOne({ email });
        if (!student && !teacher && !company) {
            return res.redirect('/reset-password?success=invalid');
        }

        if (student) {
            if (student.otp !== otp || student.otpExpires < Date.now()) {
                return res.redirect('/forgot-password?success=fotf');
            }
        } else if (teacher) {
            if (teacher.otp !== otp || teacher.otpExpires < Date.now()) {
                return res.redirect('/forgot-password?success=fotp');
            }
        } else if (company) {
            if (company.otp !== otp || company.otpExpires < Date.now()) {
                return res.redirect('/forgot-password?success=fotp');
            }
        }


        if (student) {
            bcrypt.hash(newPassword, 8, async (err, hashedPassword) => {
                if (err) {
                    return res.status(500).send('Error hashing password');
                }
                student.password = hashedPassword;
                student.otp = undefined;
                student.otpExpires = undefined;
                await student.save();
                return res.redirect('/student/login?success=reset');
            });
        } else if (teacher) {
            bcrypt.hash(newPassword, 8, async (err, hashedPassword) => {
                if (err) {
                    return res.status(500).send('Error hashing password');
                }
                teacher.password = hashedPassword;
                teacher.otp = undefined;
                teacher.otpExpires = undefined;
                await teacher.save();
                return res.redirect('/teacher/login?success=reset');
            });
        } else if (company) {
            bcrypt.hash(newPassword, 8, async (err, hashedPassword) => {
                if (err) {
                    return res.status(500).send('Error hashing password');
                }
                company.password = hashedPassword;
                company.otp = undefined;
                company.otpExpires = undefined;
                await company.save();
                return res.redirect('/company/login?success=reset');
            });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Student & Teacher Change Password
app.get('/change-password', (req, res) => {
    res.render('change-password.ejs');
});


app.post('/change-password', async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const studentId = req.session.studentId;
    const teacherId = req.session.teacherId;
    const companyId = req.session.companyId; // Corrected session variable name

    try {
        if (studentId) {
            const student = await Student.findById(studentId);
            if (!student) {
                return res.redirect('/change-password?success=false');
            }
            await updatePassword(student);
        } else if (teacherId) {
            const teacher = await Teacher.findById(teacherId);
            if (!teacher) {
                return res.status(404).json({ message: "User not found." });
            }
            await updatePassword(teacher);
        } else if (companyId) {
            const company = await Company.findById(companyId); // Corrected variable name
            if (!company) {
                return res.status(404).json({ message: "User not found." });
            }
            await updatePassword(company); // Corrected variable name
        } else {
            return res.status(401).json({ message: "Unauthorized access." });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }

    async function updatePassword(user) {
        try {
            if (oldPassword !== user.password) {
                const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);
                if (!isPasswordMatch) {
                    return res.redirect('/change-password?success=incorrect');
                }
            }
    
            const isSamePassword = await bcrypt.compare(newPassword, user.password);
            if (isSamePassword) {
                return res.redirect('/change-password?success=notsame');
            }
    
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedNewPassword;
            await user.save();
            return res.redirect('/?success=success');
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    }
});

// About Us Page
app.get('/about', (req, res) => {
    res.render('about.ejs');
}
);



// Server Strating Port No.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
