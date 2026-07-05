const Menu = require('../models/menu');
const User = require('../models/user');

exports.getMenus = async (req, res) => {
    try {
        const query = { creator: req.userId };
        const menus = await Menu.find(query)
            .populate('creator', 'email')
            .populate('analysis')
            .populate('nutritionistEdits.editedBy', 'email')
            .sort({ createdAt: -1 });
        res.status(200).json({ menus });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.postMenu = async (req, res) => {
    try {
        const {
            name, analysis_id, daily_calories_target, meals, days,
            nutritional_rationale, analysis_summary, disclaimer, preferences,
        } = req.body;

        const menu = new Menu({
            creator: req.userId,
            analysis: analysis_id || null,
            name: name || 'Personalized Menu',
            daily_calories_target,
            days: days || [],
            meals: meals || [],
            nutritional_rationale,
            analysis_summary,
            disclaimer,
            preferences,
        });

        await menu.save();
        res.status(201).json({ menu });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getMenu = async (req, res) => {
    try {
        const query = { _id: req.params.id, creator: req.userId };
        const menu = await Menu.findOne(query)
            .populate('analysis')
            .populate('creator', 'email')
            .populate('nutritionistEdits.editedBy', 'email');
        if (!menu) return res.status(404).json({ message: 'Not found' });
        res.status(200).json({ menu });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.putMenu = async (req, res) => {
    try {
        const { meals, days, day_number, comment } = req.body;
        if (!comment || !comment.trim()) {
            return res.status(422).json({ message: 'Comentariul este obligatoriu.' });
        }

        const menu = await Menu.findById(req.params.id);
        if (!menu) return res.status(404).json({ message: 'Not found' });

        menu.nutritionistEdits.push({
            editedBy: req.userId,
            comment: comment.trim(),
            days: menu.days,
            meals: menu.meals,
            editedAt: new Date(),
        });

        if (days && days.length > 0) {
            menu.days = days;
        } else if (meals && meals.length > 0 && day_number != null) {
            const idx = menu.days.findIndex(d => d.day_number === day_number);
            if (idx !== -1) menu.days[idx].meals = meals;
        } else if (meals && meals.length > 0) {
            menu.meals = meals;
        }

        await menu.save();
        await menu.populate('nutritionistEdits.editedBy', 'email');
        res.status(200).json({ menu });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteMenu = async (req, res) => {
    try {
        const menu = await Menu.findOneAndDelete({ _id: req.params.id, creator: req.userId });
        if (!menu) return res.status(404).json({ message: 'Not found' });
        res.status(200).json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
