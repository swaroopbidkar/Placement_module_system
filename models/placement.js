const mongoose = require('mongoose');

const placementSchema = new mongoose.Schema({
    companyName: String,
    jobProfile: String,
    description: String,
    location: String,
    date: Date,
    link:String,
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
});

module.exports = mongoose.model('Placement', placementSchema);
