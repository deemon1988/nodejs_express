const express = require("express");
const router = express.Router();
const csrf = require("csurf");
const csrfProtection = csrf();
const accessController = require('../controllers/accessController')
const isAuth = require("../middleware/is-auth");

// Проверка доступа к гайду
router.get('/guide/:guideId/access', isAuth, accessController.checkAccess);

// Инициализация оплаты
router.post('/payment/initiate', isAuth, accessController.initiatePayment);

module.exports = router;
