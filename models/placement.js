const mongoose = require('mongoose');

const placementSchema = new mongoose.Schema({
    companyName: String,
    jobProfile: String,
    description: String,
    location: String,
    date: Date,
    link: String,
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
});

// Prevent model overwrite error
const Placement = mongoose.models.Placement || mongoose.model('Placement', placementSchema);

module.exports = Placement;
