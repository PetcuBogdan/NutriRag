const express = require('express');
const router = express.Router();
const isAuth = require('../middleware/is-auth');
const isNutritionist = require('../middleware/is-nutritionist');
const menuController = require('../controllers/menu');

router.get('/', isAuth, menuController.getMenus);
router.post('/', isAuth, menuController.postMenu);
router.get('/:id', isAuth, menuController.getMenu);
router.put('/:id', isAuth, isNutritionist, menuController.putMenu);
router.delete('/:id', isAuth, menuController.deleteMenu);

module.exports = router;
