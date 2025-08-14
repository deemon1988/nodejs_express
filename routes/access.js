const express = require("express");
const router = express.Router();
const csrf = require("csurf");
const csrfProtection = csrf();
const accessController = require('../controllers/accessController')
const paymentController = require('../controllers/paymentController')
const isAuth = require("../middleware/is-auth");

// Проверка доступа к гайду
router.get('/guide/:guideId/access', isAuth, accessController.checkAccess);
router.post('/payment/initiate', isAuth, accessController.initiatePayment);

// Инициализация оплаты
router.get('/payment', csrfProtection, isAuth, (req, res, next) => {
    const token = req.query.token
    const paymentId = req.query.paymentId
    res.render('payment/payment-page', {
        pageTitle: 'Прием платежа с помощью виджета ЮKassa',
        path: '/access/payment',
        csrfToken: req.csrfToken(),
        confirmation_token: token,
        paymentId: paymentId,

    })
});


// Создание платежа
router.post('/create', isAuth, paymentController.createPayment);

// Webhook от YooKassa
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.paymentWebhook);

// Страница успеха
router.get('/successPayment', isAuth, accessController.successPayment);

module.exports = router;
