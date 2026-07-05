const mongoose = require('mongoose');

const markerSchema = new mongoose.Schema({
    key: { type: String, required: true },
    label: { type: String, required: true },
    value: { type: Number, required: true },
    unit: { type: String },
    reference_min: { type: Number },
    reference_max: { type: Number },
    status: { type: String, enum: ['normal', 'low', 'high', 'unknown'], default: 'unknown' },
}, { _id: false });

const analysisSchema = new mongoose.Schema({
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, default: 'Medical Analysis' },
    markers: [markerSchema],
    abnormal: [markerSchema],
    abnormal_count: { type: Number, default: 0 },
    total_markers: { type: Number, default: 0 },
    input_method: { type: String, enum: ['manual', 'pdf'], default: 'manual' },
}, { timestamps: true });

module.exports = mongoose.model('Analysis', analysisSchema);
