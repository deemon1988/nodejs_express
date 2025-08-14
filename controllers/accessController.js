// controllers/accessController.js

const { Sequelize } = require("sequelize");
const Guide = require("../models/guide");
const Payment = require("../models/payment");
const Subscription = require("../models/subscription");

// Проверка, есть ли доступ к гайду
exports.checkAccess = async (req, res, next) => {
  try {
    const guideId = req.params.guideId;
    const guide = await Guide.findByPk(guideId);

    if (!guide) {
      return res.status(404).json({ error: 'Гайд не найден' });
    }

    // Если гайд бесплатный - доступ есть
    if (guide.accessType === 'free') {
      return res.json({
        hasAccess: true,
        downloadUrl: guide.fileUrl,
        message: 'Доступ разрешен'
      });
    }

    // Если пользователь не авторизован
    if (!req.user) {
      return res.status(401).json({
        hasAccess: false,
        message: 'Требуется авторизация',
        action: 'login'
      });
    }

    // Платный гайд
    if (guide.accessType === 'paid') {
      const payment = await Payment.findOne({
        where: {
          userId: req.user.id,
          guideId: guide.id,
          status: 'completed'
        }
      });

      if (payment) {
        return res.json({
          hasAccess: true,
          downloadUrl: guide.fileUrl,
          message: 'Доступ разрешен'
        });
      } else {
        return res.json({
          hasAccess: false,
          message: 'Требуется оплата',
          action: 'pay',
          price: guide.price,
          guideId: guide.id,
          userId: req.user.id
        });
      }
    }

    // Гайд по подписке
    if (guide.accessType === 'subscription') {
      const subscription = await Subscription.findOne({
        where: {
          userId: req.user.id,
          isActive: true,
          endDate: {
            [Sequelize.Op.gt]: new Date()
          }
        }
      });

      if (subscription) {
        return res.json({
          hasAccess: true,
          downloadUrl: guide.fileUrl,
          message: 'Доступ разрешен'
        });
      } else {
        return res.json({
          hasAccess: false,
          message: 'Требуется подписка',
          action: 'subscribe'
        });
      }
    }

  } catch (err) {
    next(err);
  }
};

// Инициализация оплаты
exports.initiatePayment = async (req, res, next) => {
  try {
    const { guideId } = req.body;
    const guide = await Guide.findByPk(guideId);

    if (!guide || guide.accessType !== 'paid') {
      return res.status(400).json({ error: 'Неверный гайд для оплаты' });
    }

    // Здесь интеграция с платежной системой (например, Stripe, YooKassa)
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: guide.price * 100,
    //   currency: 'rub',
    //   meta { guideId: guide.id, userId: req.user.id }
    // });

    // Создаем запись об оплате
    const payment = await Payment.create({
      userId: req.user.id,
      guideId: guide.id,
      amount: guide.price,
      status: 'pending'
      // paymentId: paymentIntent.id
    });

    res.json({
      success: true,
      // clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
      message: 'Оплата инициализирована'
    });

  } catch (err) {
    next(err);
  }
};




// Страница успеха
exports.successPayment = async (req, res, next) => {
  try {
    const paymentId = req.query.paymentId;
    const payment = await Payment.findOne({
      where: { paymentId: paymentId },
      // include: [Subscription]
    });
    const guide = await Guide.findOne({where: {id: payment.guideId}})

    res.render('payment/payment-success', {
      pageTitle: 'Успешно оплачено',
      payment: payment,
      guide: guide
      // subscription: payment?.Subscription
    });
  } catch (err) {
    next(err);
  }
};