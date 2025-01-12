const express = require('express');
const session = require('express-session');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const indexRouter = require('./routes/index');
const Student = require('./models/student');
const Student_Backup = require('./models/student_backup');
const Company = require('./models/company');
const Teacher = require('./models/teacher');
const Placement = require('./models/placement');
const bcrypt = require('bcrypt');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');
const favicon = require('serve-favicon');
const multer = require('multer');
const company = require('./models/company');
const Admin = require('./models/admin');
// const app = express();
const excel = require('exceljs');
const PDFDocument = require('pdfkit');
const JSZip = require('jszip');
const Docxtemplater = require('docxtemplater');
const exceljs = require('exceljs');
// const { PDFDocument } = require('pdf-lib');
const { execSync } = require('child_process');
const PizZip = require('pizzip'); // Replace JSZip with PizZip
const { convertToPdf } = require('docx-pdf');
const {
    Document,
    Packer,
    Paragraph,
    Table,
    TableRow,
    TableCell,
    AlignmentType,
    WidthType,
    Border,
    ShadingType,
} = require('docx');
const { rgb } = require('pdfkit');
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
app.use(express.urlencoded({ extended: true }));
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

// async function generateExcel(students) {
//     const workbook = new excel.Workbook();
//     const worksheet = workbook.addWorksheet('Students');

//     // Define column headers
//     worksheet.columns = [
//         { header: 'Name', key: 'name' },
//         { header: 'Roll Number', key: 'roll' },
//         { header: 'Email', key: 'email' },
//         { header: 'Phone Number', key: 'phoneNumber' },
//         { header: 'Academic Year', key: 'academicyear' },
//         { header: 'Graduation CGPA', key: 'graduation' },
//         { header: 'Post Graduation CGPA', key: 'pgraduation' },
//         { header: '10th Percentage', key: 'tenthPercentage' },
//         { header: '12th Percentage', key: 'twelfthPercentage' },
//         { header: 'Semester', key: 'year' },
//         { header: 'Department', key: 'department' },
//         { header: 'Skills', key: 'skills' },
//         { header: 'Placement Status', key: 'placementStatus' },
//         { header: 'Company', key: 'company' },
//         // Add more columns as needed
//     ];

//     // Add student data to worksheet
//     students.forEach((student) => {
//         worksheet.addRow({
//             name: student.name,
//             roll: student.roll,
//             email: student.email,
//             phoneNumber: student.phoneNumber,
//             academicyear: student.academicyear,
//             graduation: student.graduation,
//             pgraduation: student.pgraduation,
//             tenthPercentage: student.tenthPercentage,
//             twelfthPercentage: student.twelfthPercentage,
//             year: student.year,
//             department: student.department,
//             skills: student.skills,
//             placementStatus: student.placementStatus,
//             company: student.company,
//             // Add more properties as needed
//         });
//     });

//     // Generate Excel buffer
//     const excelBuffer = await workbook.xlsx.writeBuffer();
//     return excelBuffer;
// }






async function generatePDF(students) {
    const doc = new PDFDocument({ bufferPages: true });
    let buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => { });

    // Add a title
    doc.fontSize(18).text('Student Report', { align: 'center' });
    doc.moveDown(1);

    // Add table headers
    doc.fontSize(12);
    doc.text('Name', 50, 100);
    doc.text('Roll Number', 150, 100);
    doc.text('Email', 250, 100);
    doc.text('Phone Number', 350, 100);
    doc.text('Academic Year', 450, 100);
    // Add more headers as needed
    doc.moveDown(0.5);

    // Add student data
    let y = 120;
    students.forEach((student) => {
        doc.text(student.name, 50, y);
        doc.text(student.roll, 150, y);
        doc.text(student.email, 250, y);
        doc.text(student.phoneNumber, 350, y);
        doc.text(student.academicyear, 450, y);
        // Add more student data as needed
        y += 20;  // Move to the next line
        if (y > 700) {  // Check if we need to add a new page
            doc.addPage();
            y = 100;
        }
    });

    doc.end();
    const pdfBuffer = Buffer.concat(buffers);
    return pdfBuffer;
}







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
    const { roll, name, email, password, academicyear, placementStatus, graduation, pgraduation, experience, phoneNumber, tenthPercentage, twelfthPercentage, year, department, skills, company } = req.body;
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
            academicyear,
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
            company,
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

        return res.redirect('/login?success=true');
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




/*
app.post('/fetch-report', async (req, res) => {
    try {
        const { department, from_academicyear, to_academicyear } = req.body;

        // Fetch filtered students from the database
        const students = await Student.find({
            department,
            academicyear: { $gte: from_academicyear, $lte: to_academicyear }
        });

        if (!students || students.length === 0) {
            return res.status(404).send('No students found for the given criteria.');
        }

        // Create a new document
        const doc = new Document({
            sections: [{
                properties: {
                    // Set the page margin to have more space if needed
                    page: {
                        top: 720,  // top margin (in twips, 1440 = 1 inch)
                        right: 1440, // right margin (1 inch)
                        bottom: 720, // bottom margin (1 inch)
                        left: 1440,  // left margin (1 inch)
                    },
                },
                children: [
                    new Paragraph({
                        text: 'Placement Report',
                        heading: 'Title',
                        alignment: AlignmentType.CENTER,
                        style: { 
                            font: 'Times New Roman', 
                            size: 24,  // Larger font size for the title
                            bold: true 
                        },
                    }),
                    new Paragraph({
                        text: 'Generated on: ' + new Date().toLocaleDateString(),
                        alignment: AlignmentType.CENTER,
                        style: { 
                            font: 'Times New Roman', 
                            size: 14 // Increased font size here
                        },
                    }),
                    new Paragraph({
                        text: '',
                    }), // Blank line
                ],
            }],
        });

        // Iterate over the students, grouping them in pairs
        for (let i = 0; i < students.length; i += 2) {
            // Get the current pair of students
            const student1 = students[i];
            const student2 = students[i + 1] || {};  // Ensure we don't get an error if there's an odd number of students

            // Create a section with both students' details
            const sectionChildren = [
                new Paragraph({
                    text: 'Student Details:',
                    bold: true,
                    alignment: AlignmentType.LEFT,
                    style: { font: 'Times New Roman', size: 14 }, // Increased font size here
                }),
                new Paragraph(`Name: ${student1.name || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Roll Number: ${student1.roll || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Email: ${student1.email || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Phone Number: ${student1.phoneNumber || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Academic Year: ${student1.academicyear || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Graduation: ${student1.graduation || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Post-Graduation: ${student1.pgraduation || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`10th Percentage: ${student1.tenthPercentage || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`12th Percentage: ${student1.twelfthPercentage || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Year: ${student1.year || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Department: ${student1.department || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),

                // Add a space or line break between students
                new Paragraph({
                    text: '',
                }),

                // Add the second student details
                new Paragraph({
                    text: 'Student Details:',
                    bold: true,
                    alignment: AlignmentType.LEFT,
                    style: { font: 'Times New Roman', size: 14 }, // Increased font size here
                }),
                new Paragraph(`Name: ${student2.name || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Roll Number: ${student2.roll || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Email: ${student2.email || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Phone Number: ${student2.phoneNumber || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Academic Year: ${student2.academicyear || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Graduation: ${student2.graduation || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Post-Graduation: ${student2.pgraduation || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`10th Percentage: ${student2.tenthPercentage || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`12th Percentage: ${student2.twelfthPercentage || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Year: ${student2.year || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                new Paragraph(`Department: ${student2.department || 'N/A'}`, { style: { font: 'Times New Roman', size: 14 }}),
                
                // Blank line to separate pairs
                new Paragraph({
                    text: '',
                }),
            ];

            // Add the section containing the two students' details to the document
            doc.addSection({
                children: sectionChildren,
            });
        }

        // Create a buffer and send the document
        const buffer = await Packer.toBuffer(doc);

        res.setHeader('Content-Disposition', 'attachment; filename=placement_report.docx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.send(buffer);

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).send('Error generating report');
    }
});
*/

// app.post('/fetch-report', async (req, res) => {
//     try {
//         const { department, from_academicyear, to_academicyear } = req.body;

//         // Fetch filtered students from the database
//         const students = await Student.find({
//             department,
//             academicyear: { $gte: from_academicyear, $lte: to_academicyear }
//         });

//         if (!students || students.length === 0) {
//             return res.status(404).send('No students found for the given criteria.');
//         }

//         // Create a new Excel workbook and worksheet
//         const workbook = new exceljs.Workbook();
//         const worksheet = workbook.addWorksheet('Placement Report');

//         // Set the headers for the Excel sheet (Added companyName)
//         worksheet.columns = [
//             { header: 'Student Name', key: 'name', width: 25 },
//             { header: 'Phone Number', key: 'phoneNumber', width: 20 },
//             { header: 'Email', key: 'email', width: 30 },
//             { header: 'Year', key: 'year', width: 15 },
//             { header: 'Department', key: 'department', width: 20 },
//             { header: 'Company Name', key: 'companyName', width: 25 },  // New column for companyName
//         ];

//         // Add title row
//         worksheet.mergeCells('A1:F1');
//         const titleRow = worksheet.getCell('A1');
//         titleRow.value = 'Nowrosjee Wadia College Placement Report';
//         titleRow.style = { font: { bold: true, size: 16 }, alignment: { horizontal: 'center' } };

//         // Add date row
//         worksheet.mergeCells('A2:F2');
//         const dateRow = worksheet.getCell('A2');
//         dateRow.value = 'Generated on: ' + new Date().toLocaleDateString();
//         dateRow.style = { font: { size: 12 }, alignment: { horizontal: 'center' } };

//         // Add a blank row after the title and date
//         worksheet.addRow([]);

//         // Add the header row (This ensures headers are explicitly inserted into the first data row)
//         worksheet.addRow([
//             'Student Name', 
//             'Phone Number', 
//             'Email', 
//             'Year', 
//             'Department', 
//             'Company Name'
//         ]);

//         // Add the students data to the Excel sheet (including companyName)
//         students.forEach(student => {
//             worksheet.addRow({
//                 name: student.name || 'N/A',
//                 phoneNumber: student.phoneNumber || 'N/A',
//                 email: student.email || 'N/A',
//                 year: student.year || 'N/A',
//                 department: student.department || 'N/A',
//                 companyName: student.company || 'N/A',  // Access companyName directly from the student
//             });
//         });

//         // Set a response header to download the file
//         res.setHeader('Content-Disposition', 'attachment; filename=placement_report.xlsx');
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

//         // Write to the response stream
//         await workbook.xlsx.write(res);
//         res.end();

//     } catch (error) {
//         console.error('Error generating report:', error);
//         res.status(500).send('Error generating report');
//     }
// });

/* app.post('/fetch-report', async (req, res) => {
    try {
        const { department, from_academicyear, to_academicyear } = req.body;

        // Fetch filtered students from the database
        const students = await Student.find({
            department,
            academicyear: { $gte: from_academicyear, $lte: to_academicyear }
        });

        if (!students || students.length === 0) {
            return res.status(404).send('No students found for the given criteria.');
        }

        // Create a new Excel workbook and worksheet
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Placement Report');

        // Set the headers for the Excel sheet (Added companyName)
        worksheet.columns = [
            { header: 'Student Name', key: 'name', width: 25 },
            { header: 'Phone Number', key: 'phoneNumber', width: 20 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Year', key: 'year', width: 15 },
            { header: 'Department', key: 'department', width: 20 },
            { header: 'Company Name', key: 'companyName', width: 25 },  // New column for companyName
        ];

        // Add title row
        worksheet.mergeCells('A1:F1');
        const titleRow = worksheet.getCell('A1');
        titleRow.value = 'Nowrosjee Wadia College Placement Report';
        titleRow.style = { 
            font: { bold: true, size: 16 }, 
            alignment: { horizontal: 'center' } 
        };

        // Add date row
        worksheet.mergeCells('A2:F2');
        const dateRow = worksheet.getCell('A2');
        dateRow.value = 'Generated on: ' + new Date().toLocaleDateString();
        dateRow.style = { 
            font: { size: 12 }, 
            alignment: { horizontal: 'center' } 
        };

        // Add a blank row after the title and date
        worksheet.addRow([]);

        // Add the header row (This ensures headers are explicitly inserted into the first data row)
        const headerRow = worksheet.addRow([
            'Student Name', 
            'Phone Number', 
            'Email', 
            'Year', 
            'Department', 
            'Company Name'
        ]);

        // Style the header row: Bold, increased font size, and center alignment
        headerRow.font = { bold: true, size: 12 };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };

        // Add borders to the header cells
        headerRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' },
                bottom: { style: 'thin' }
            };
        });

        // Add the students data to the Excel sheet (including companyName)
        students.forEach(student => {
            const studentRow = worksheet.addRow({
                name: student.name || 'N/A',
                phoneNumber: student.phoneNumber || 'N/A',
                email: student.email || 'N/A',
                year: student.year || 'N/A',
                department: student.department || 'N/A',
                companyName: student.company || 'N/A',  // Access companyName directly from the student
            });

            // Style the student rows: Increase font size and add borders
            studentRow.font = { size: 12 };
            studentRow.alignment = { horizontal: 'left', vertical: 'middle' };

            // Add borders to the student cells
            studentRow.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    right: { style: 'thin' },
                    bottom: { style: 'thin' }
                };
            });
        });

        // Set a response header to download the file
        res.setHeader('Content-Disposition', 'attachment; filename=placement_report.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Write to the response stream
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).send('Error generating report');
    }
});
*/
// app.post('/fetch-report', async (req, res) => {
//     try {
//         const { department, from_academicyear, to_academicyear, company } = req.body;

//         // Create filter object
//         const filter = {
//             department,
//             academicyear: { $gte: from_academicyear, $lte: to_academicyear },
//         };

//         // If a specific company is selected, add it to the filter
//         if (company !== 'all') {
//             filter.company = company;
//         } else {
//             // Include only students who are placed (company field is not null and exists)
//             filter.company = { $ne: null, $exists: true };
//         }

//         // Fetch filtered students from the database
//         const students = await Student.find(filter);

//         if (!students || students.length === 0) {
//             return res.status(404).send('No placed students found for the given criteria.');
//         }

//         // Create a new Excel workbook and worksheet
//         const workbook = new exceljs.Workbook();
//         const worksheet = workbook.addWorksheet('Placement Report');

//         // Set the headers for the Excel sheet
//         worksheet.columns = [
//             { header: 'Student Name', key: 'name', width: 25 },
//             { header: 'Phone Number', key: 'phoneNumber', width: 20 },
//             { header: 'Email', key: 'email', width: 30 },
//             { header: 'Department', key: 'department', width: 20 },
//             { header: 'Company Name', key: 'companyName', width: 25 },
//             { header: 'Academic Year', key: 'academicyear', width: 15 },
//         ];

//         // Add title and date rows (same as your current implementation)
//         worksheet.mergeCells('A1:F1');
//         const titleRow = worksheet.getCell('A1');
//         titleRow.value = 'Nowrosjee Wadia College Placement Report';
//         titleRow.style = { font: { bold: true, size: 16 }, alignment: { horizontal: 'center' } };

//         worksheet.mergeCells('A2:F2');
//         const dateRow = worksheet.getCell('A2');
//         dateRow.value = 'Generated on: ' + new Date().toLocaleDateString();
//         dateRow.style = { font: { size: 12 }, alignment: { horizontal: 'center' } };

//         // Add headers and student data
//         const headerRow = worksheet.addRow([
//             'Student Name',
//             'Phone Number',
//             'Email',
//             'Department',
//             'Company Name',
//             'Academic Year',
//         ]);

//         headerRow.font = { bold: true, size: 12 };
//         headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
//         headerRow.eachCell((cell) => {
//             cell.border = {
//                 top: { style: 'thin' },
//                 left: { style: 'thin' },
//                 right: { style: 'thin' },
//                 bottom: { style: 'thin' },
//             };
//         });

//         students.forEach((student) => {
//             worksheet.addRow({
//                 name: student.name || 'N/A',
//                 phoneNumber: student.phoneNumber || 'N/A',
//                 email: student.email || 'N/A',
//                 department: student.department || 'N/A',
//                 companyName: student.company || 'N/A',
//                 academicyear: student.academicyear || 'N/A',
//             });
//         });

//         // Set response headers for file download
//         res.setHeader('Content-Disposition', 'attachment; filename=placement_report.xlsx');
//         res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

//         // Write workbook to the response stream
//         await workbook.xlsx.write(res);
//         res.end();
//     } catch (error) {
//         console.error('Error generating report:', error);
//         res.status(500).send('Error generating report');
//     }
// });

app.post('/fetch-report', async (req, res) => {
    try {
        const { department, from_academicyear, to_academicyear, company } = req.body;

        // Create filter object
        const filter = {
            department,
            academicyear: { $gte: from_academicyear, $lte: to_academicyear },
        };

        // Add company filter if a specific company is selected
        if (company !== 'all') {
            filter.company = company;
        } else {
            // Include only students who are placed (company field is not null and exists)
            filter.company = { $ne: null, $exists: true };
        }

        // Fetch filtered students from the database
        const students = await Student.find(filter);

        if (!students || students.length === 0) {
            // return res.status(404).send('No placed students found for the given criteria.');
            // alert('No placed students found for the given criteria');
            return res.redirect('/report?success=no-students');
        }

        // Create a new Excel workbook and worksheet
        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Placement Report');

        // Add title row
        worksheet.mergeCells('A1:F1');
        const titleRow = worksheet.getCell('A1');
        titleRow.value = 'Nowrosjee Wadia College Placement Report';
        titleRow.style = { font: { bold: true, size: 16 }, alignment: { horizontal: 'center' } };

        // Add date row
        worksheet.mergeCells('A2:F2');
        const dateRow = worksheet.getCell('A2');
        dateRow.value = 'Generated on: ' + new Date().toLocaleDateString();
        dateRow.style = { font: { size: 12 }, alignment: { horizontal: 'center' } };

        // Add a blank row after the title and date
        worksheet.addRow([]);

        // Add the header row
        const headerRow = worksheet.addRow([
            'Student Name', 'Phone Number', 'Email', 'Department', 'Company Name', 'Academic Year'
        ]);

        // Style the header row: Bold and centered
        headerRow.font = { bold: true };
        headerRow.alignment = { horizontal: 'center' };

        // Add borders to the header row
        headerRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
        });

        // Add student data rows
        students.forEach((student) => {
            const row = worksheet.addRow([
                student.name || 'N/A',
                student.phoneNumber || 'N/A',
                student.email || 'N/A',
                student.department || 'N/A',
                student.company || 'N/A',
                student.academicyear || 'N/A',
            ]);

            // Add borders to each cell in the row
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            });
        });

        // Adjust column widths for better readability
        worksheet.columns.forEach((column) => {
            column.width = 20;
        });

        // Set response headers for file download
        res.setHeader('Content-Disposition', 'attachment; filename=placement_report.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Write workbook to the response stream
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).send('Error generating report');
    }
});



app.get('/edit-placement/:id', async (req, res) => {
    try {
        const placementId = req.params.id;
        const teacherId = req.session.teacherId;
        const companyId = req.session.companyId;
        const placement = await Placement.findById(placementId);
        if (!placement) {
            return res.status(404).send('Placement not found');
        }
        res.render('edit-placement', { placement, teacherId, companyId });
    } catch (error) {
        console.error('Error fetching placement:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle form submission
app.post('/update-placement', async (req, res) => {
    const { id, companyName, jobProfile, description, location, date, link } = req.body;
    try {
        await Placement.findByIdAndUpdate(id, { companyName, jobProfile, description, location, date, link });
        res.redirect('/view-placement-details');
    } catch (error) {
        console.error('Error updating placement:', error);
        res.status(500).send('Internal Server Error');
    }
});





app.get('/edit-student/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).send('student not found');
        }
        res.render('edit-student', { student });
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle form submission
app.post('/update-student', async (req, res) => {
    const { id, email, roll, name, academicyear, college, placementStatus, graduation, pgraduation, experience, phoneNumber, placeOfBirth, tenthPercentage, twelfthPercentage, year, department, skills, company } = req.body;
    try {
        await Student.findByIdAndUpdate(id, { email, roll, name, academicyear, college, placementStatus, graduation, pgraduation, experience, phoneNumber, placeOfBirth, tenthPercentage, twelfthPercentage, year, department, skills, company });
        res.redirect('/view_student');
    } catch (error) {
        console.error('Error updating student:', error);
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

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    try {
        let user;
        switch (role) {
            case 'student':
                user = await Student.findOne({ email });
                if (!user) return res.redirect('/login?role=student&success=false');
                break;
            case 'teacher':
                user = await Teacher.findOne({ email });
                if (!user) return res.redirect('/login?role=teacher&success=false');
                break;
            case 'company':
                user = await Company.findOne({ email });
                if (!user) return res.redirect('/login?role=company&success=false');
                break;
            case 'admin':
                user = await Admin.findOne({ email });
                if (!user) return res.redirect('/login?role=admin&success=false');
                break;
            default:
                return res.status(400).send('Invalid role');
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).send('Internal Server Error');
            }
            if (isMatch) {
                req.session[`${role}Id`] = user._id;
                if (role === 'company') {
                    req.session.companyName = user.name;
                }
                return res.redirect(`/${role}/dashboard`);
            } else {
                return res.redirect(`/login?role=${role}&success=false`);
            }
        });
    } catch (error) {
        console.error('Error logging in user:', error);
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
        return res.redirect('/login?success=true');
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
                    return res.redirect('/login?success=false');
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


//Admin Login
app.get('/admin/login', (req, res) => {
    res.render('admin_login');
});

app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const admin = await Admin.findOne({ email });
        console.log()
        if (!admin) {
            return res.redirect('/admin/login?success=false');
        }
        bcrypt.compare(password, admin.password, async (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.status(500).send('Internal Server Error');
            }
            if (isMatch) {
                req.session.adminId = admin._id;
                console.log(req.session.adminId)
                return res.redirect('/admin/dashboard');
            } else {
                return res.redirect('/admin/login?success=false');
            }
        });
    } catch (error) {
        console.error('Error logging in Admin:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/dashboard', async (req, res) => {
    try {
        const adminId = req.session.adminId;
        if (!adminId) {
            return res.redirect('/admin/login');
        }
        const admin = await Admin.findById(adminId);
        const placements = await Placement.find().sort({ date: 1 });
        if (!admin) {
            return res.status(404).send('Admin not found');
        }
        res.setHeader('Cache-Control', 'no-store');
        res.render('admin_dashboard', { admin, placements });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/admin/view_student', async (req, res) => {
    try {
        const adminId = req.session.adminId;
        if (!adminId) {
            return res.redirect('/login');
        }
        res.setHeader('Cache-Control', 'no-store');
        const students = await Student.find();
        const placedCount = await Student.countDocuments({ placementStatus: 'Placed' });
        const notPlacedCount = await Student.countDocuments({ placementStatus: 'Not Placed' });
        const admin = await Admin.findById(adminId);

        res.render('admin_view_stud', { admin, students, placedCount, notPlacedCount });
    } catch (error) {
        console.error('Error fetching students for admin:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/admin/logout', (req, res) => {
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
        const adminId = req.session.adminId; // Check for admin ID

        if (!teacherId && !studentId && !companyId && !companyName && !adminId) {
            return res.redirect('/');
        }

        res.setHeader('Cache-Control', 'no-store');

        let placements;

        if (adminId) {
            // Admin logic: Show all placements
            const admin = await Admin.findById(adminId); // Ensure Admin model is defined
            placements = await Placement.find().populate('companyId');
            res.render('admin_view_placement', { placements, admin });
        } else if (teacherId) {
            // Teacher logic: Show all placements
            const teacher = await Teacher.findById(teacherId);
            placements = await Placement.find().populate('companyId');
            res.render('view_placement_details', { placements, teacher });
        } else if (studentId) {
            // Student logic: Show all placements
            const student = await Student.findById(studentId);
            placements = await Placement.find().populate('companyId');
            res.render('stud_placement', { placements, student });
        } else if (companyId) {
            // Company logic: Show placements related to the company
            const company = await Company.findById(companyId);
            placements = await Placement.find({ companyName: companyName });
            res.render('view_placement_details_company', { placements, company });
        }
    } catch (err) {
        console.error('Error fetching placement details:', err);
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

//Report 

app.get('/report', async (req, res) => {
    try {
        // Fetch teacher data from the database
        const teacher = await Teacher.findOne(); // Adjust query as needed

        // Fetch distinct department values
        const departments = await Student.distinct('department');
        const academicyears = await Student.distinct('academicyear');
        const company = await Student.distinct('company');
        // Pass the teacher object and distinct departments to the EJS template
        res.render('report', { teacher, departments, academicyears , company });
    } catch (err) {
        // Handle errors
        console.error('Error fetching teacher:', err);
        res.status(500).send('Internal Server Error');
    }
});


// app.post('/fetch-report', async (req, res) => {
//     try {
//         const { department, from_academicyear, to_academicyear } = req.body;
//         const students = await Student.find({
//             department,
//             academicyear: { $gte: from_academicyear, $lte: to_academicyear }
//         });

//         // Generate Excel file
//         const excelBuffer = await generateExcel(students);
//         res.set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
//         res.set("Content-Disposition", `attachment; filename="students-${department}-${from_academicyear}-${to_academicyear}.xlsx"`);
//         res.send(excelBuffer);
//     } catch (err) {
//         console.error('Error fetching students:', err);
//         res.status(500).send('Internal Server Error');
//     }
// });


// Server Strating Port No.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
