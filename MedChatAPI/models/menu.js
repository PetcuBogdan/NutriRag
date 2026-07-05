const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    portion_grams: { type: Number },
    key_nutrients: [{ type: String }],
    addresses_marker: { type: String },
    source: { type: String, enum: ['FooDB', 'PubChem', 'ADMETLab3', 'General', 'Cookbook'] },
}, { _id: false });

const mealSchema = new mongoose.Schema({
    meal: { type: String, required: true },
    time: { type: String },
    foods: [foodItemSchema],
    meal_calories: { type: Number },
}, { _id: false });

const daySchema = new mongoose.Schema({
    day_number: { type: Number, required: true },
    day_name: { type: String },
    day_calories: { type: Number },
    meals: [mealSchema],
}, { _id: false });

const menuSchema = new mongoose.Schema({
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    analysis: { type: mongoose.Schema.Types.ObjectId, ref: 'Analysis' },
    name: { type: String, default: 'Personalized Menu' },
    daily_calories_target: { type: Number },
    days: [daySchema],
    meals: [mealSchema],
    nutritional_rationale: { type: Map, of: String },
    analysis_summary: {
        total_markers: Number,
        abnormal_count: Number,
        abnormal_markers: [String],
    },
    disclaimer: { type: String },
    preferences: { type: Map, of: mongoose.Schema.Types.Mixed },
    nutritionistEdits: [{
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, required: true },
        days: [daySchema],
        meals: [mealSchema],
        editedAt: { type: Date, default: Date.now },
    }],
}, { timestamps: true });

module.exports = mongoose.model('Menu', menuSchema);
