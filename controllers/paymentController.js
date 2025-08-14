const Payment = require('../models/payment');

const shopId = process.env.YOOKASSA_SHOP_ID
const secretKey = process.env.YOOKASSA_SECRET_KEY

// Создание платежа и получение токена
exports.createPayment = async (req, res, next) => {
    try {
        // Получаем данные из тела запроса
        // const { plan, email, username, password } = req.body;
        const userId = req.user?.id || null;
        const guideId = req.body.guideId;
        // Определяем стоимость
        let amount = 100.00;
        let description = '';

        // if (plan === 'monthly') {
        //   amount = 299;
        //   description = 'Премиум подписка на 1 месяц';
        // } else if (plan === 'annual') {
        //   amount = 2990;
        //   description = 'Премиум подписка на 1 год';
        // }

        // Создаем платеж с типом confirmation = embedded (для виджета)
        const payment = ({
            amount: {
                value: amount.toFixed(2),
                currency: 'RUB'
            },
            confirmation: {
                type: 'embedded' // ← ВАЖНО для виджета
            },
            description: description,
            meta: {
                userId: userId,
                // plan: plan
            },
            capture: false
        });
        const result = await fetch('https://api.yookassa.ru/v3/payments/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64'),
                'Idempotence-Key': require('crypto').randomUUID() // уникальный ключ
            },
            body: JSON.stringify(payment)
        })

        const data = await result.json()
        console.log(data)

        if (!result.ok) {
            throw new Error(data.description || 'Ошибка при создании платежа');
        }

        await Payment.create({
            amount: amount,
            status: 'pending',
            paymentId: data.id,
            userId: req.user.id,
            guideId: guideId
        })
        res.json({
            success: true,
            token: data.confirmation.confirmation_token, // ← Токен для виджета
            paymentId: data.id
        });

    } catch (err) {
        console.error('Ошибка создания платежа:', err);
        res.status(500).json({
            success: false,
            message: 'Не удалось создать платёж'
        });
    }
}

// Webhook для уведомлений
exports.paymentWebhook = async (req, res, next) => {
  try {
    const event = req.body.event;
    const paymentObject = req.body.object;

    if (event === 'payment.succeeded') {
      // Обработка успешной оплаты
      console.log('Платёж успешен:', paymentObject.id);
      // Здесь обновляем БД, активируем подписку и т.д.
    } else if (event === 'payment.canceled') {
      console.log('Платёж отменён:', paymentObject.id);
      // Обработка отмены
    }

    res.status(200).send({ result: 'ok' });
  } catch (err) {
    console.error('Ошибка webhook:', err);
    res.status(500).send({ error: 'Webhook error' });
  }
};