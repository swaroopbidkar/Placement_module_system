const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const Placement = require('../models/placement');

// Auto-delete past placements (date < today)
const deleteOldPlacements = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const oldPlacements = await Placement.find({ date: { $lt: today } });

    if (oldPlacements.length === 0) {
      console.log('Auto-cleanup: No old placement drives to delete.');
      return;
    }

    const filePath = path.join(__dirname, '../viewPreviousDrives.xlsx');
    const workbook = new ExcelJS.Workbook();
    let worksheet;

    // If file exists, read and load it
    if (fs.existsSync(filePath)) {
      await workbook.xlsx.readFile(filePath);
      worksheet = workbook.getWorksheet('Deleted Placements');
    } else {
      // Else, create new file and worksheet
      worksheet = workbook.addWorksheet('Deleted Placements');

      // Add headers
      worksheet.columns = [
        { header: 'Deleted On', key: 'deletedOn', width: 25 },
        { header: 'Company', key: 'company', width: 30 },
        { header: 'Job Description', key: 'jobDescription', width: 50 },
      ];
    }

    // Append each deleted placement
    oldPlacements.forEach(placement => {
      worksheet.addRow({
        deletedOn: new Date().toLocaleString(),
        company: placement.company,
        jobDescription: placement.jobDescription || 'N/A'
      });
    });

    // Save the file
    await workbook.xlsx.writeFile(filePath);

    // Now delete the entries from DB
    const result = await Placement.deleteMany({ date: { $lt: today } });
    console.log(`Auto-cleanup: Deleted ${result.deletedCount} old placement drives.`);
  } catch (error) {
    console.error('Auto-cleanup error:', error);
  }
};

module.exports = deleteOldPlacements;
