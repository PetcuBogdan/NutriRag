const Analysis = require('../models/analysis');
const User = require('../models/user');

exports.getAnalyses = async (req, res) => {
    try {
        const user = await User.findById(req.userId).populate('analyses');
        res.status(200).json({ analyses: user.analyses || [] });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.postAnalysis = async (req, res) => {
    try {
        const { name, markers, abnormal, abnormal_count, total_markers, input_method } = req.body;

        const analysis = new Analysis({
            creator: req.userId,
            name: name || 'Medical Analysis',
            markers: markers || [],
            abnormal: abnormal || [],
            abnormal_count: abnormal_count || 0,
            total_markers: total_markers || 0,
            input_method: input_method || 'manual',
        });

        await analysis.save();
        await User.findByIdAndUpdate(req.userId, { $push: { analyses: analysis._id } });

        res.status(201).json({ analysis });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAnalysis = async (req, res) => {
    try {
        const analysis = await Analysis.findOne({ _id: req.params.id, creator: req.userId });
        if (!analysis) return res.status(404).json({ message: 'Not found' });
        res.status(200).json({ analysis });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteAnalysis = async (req, res) => {
    try {
        const analysis = await Analysis.findOneAndDelete({ _id: req.params.id, creator: req.userId });
        if (!analysis) return res.status(404).json({ message: 'Not found' });
        await User.findByIdAndUpdate(req.userId, { $pull: { analyses: analysis._id } });
        res.status(200).json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
