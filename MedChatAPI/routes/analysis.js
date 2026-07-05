const express = require('express');
const router = express.Router();
const isAuth = require('../middleware/is-auth');
const analysisController = require('../controllers/analysis');

router.get('/', isAuth, analysisController.getAnalyses);
router.post('/', isAuth, analysisController.postAnalysis);
router.get('/:id', isAuth, analysisController.getAnalysis);
router.delete('/:id', isAuth, analysisController.deleteAnalysis);

module.exports = router;
