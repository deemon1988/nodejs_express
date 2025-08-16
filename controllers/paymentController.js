const Guide = require('../models/guide');
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

        const guide = await Guide.findByPk(guideId)
        // Определяем стоимость
        let amount = +guide.price;

        // Проверяем есть ли уже созданный платеж для этого гайда и пользователя 
        // со статусом 'pending'
        const pendingPayment = await Payment.findOne({
            where: { userId: userId, guideId: guideId, status: 'pending' }
        })
        console.log('Существующий платеж в БД - ' , pendingPayment)

        if (pendingPayment) {
            const result = await fetch(`https://api.yookassa.ru/v3/payments/${pendingPayment.paymentId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64'),
                    'Idempotence-Key': require('crypto').randomUUID() // уникальный ключ
                },
            })
            const exist_data = await result.json()
            console.log('Существующий платеж Юмани - ' , pendingPayment)

            if (exist_data.status === 'pending' && exist_data.confirmation?.confirmation_token) {
                return res.json({
                    success: true,
                    token: exist_data.confirmation.confirmation_token, // ← Токен для виджета
                    paymentId: exist_data.id,
                    userEmail: req.user.email,
                    amount: amount,
                    productName: guide.title,
                    orderDate: new Date()
                });
            }
        } else if(pendingPayment){
            // Платёж истёк или неактивен — удаляем его и создаём новый
            await pendingPayment.destroy();
        }



        // if (plan === 'monthly') {
        //   amount = 299;
        //   description = 'Премиум подписка на 1 месяц';
        // } else if (plan === 'annual') {
        //   amount = 2990;
        //   description = 'Премиум подписка на 1 год';
        // }

        // Генерируем номер заказа заранее
        const orderNumber = 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        let description = `Оплата заказа №${orderNumber} для ${req.user.email}`;

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
            metadata: {
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

        const paymnet = await Payment.create({
            amount: amount,
            status: 'pending',
            paymentId: data.id,
            userId: req.user.id,
            guideId: guideId
        })
        res.json({
            success: true,
            token: data.confirmation.confirmation_token, // ← Токен для виджета
            paymentId: data.id,
            userEmail: req.user.email,
            amount: amount,
            productName: guide.title,
            orderDate: data.created_at
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
        const payment = await Payment.findOne({ where: { paymentId: paymentObject.id } });

        if (event === 'payment.succeeded') {
            // Обработка успешной оплаты
            console.log('Платёж успешен:', paymentObject.id);
            // Здесь обновляем БД, активируем подписку и т.д.
            if (payment) {
                payment.status = 'succeeded';
                await payment.save();
            }
        } else if (event === 'payment.canceled') {
            console.log('Платёж отменён:', paymentObject.id);
            // Обработка отмены
            if (payment) {
                payment.status = 'canceled';
                await payment.save();
            }
        }
        res.status(200).send({ result: 'ok' });
    } catch (err) {
        console.error('Ошибка webhook:', err);
        res.status(500).send({ error: 'Webhook error' });
    }
};