// Показать модальное окно
function showSubscriptionForm() {
    document.getElementById('subscriptionModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Закрыть модальное окно
function closeModal() {
    document.getElementById('subscriptionModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Обработка отправки формы
async function submitSubscription(event) {
    event.preventDefault();

    // Проверка согласий
    if (!document.getElementById('termsAgreement').checked) {
        alert('Пожалуйста, примите условия использования');
        return;
    }

    if (!document.getElementById('refundAgreement').checked) {
        alert('Пожалуйста, ознакомьтесь с условиями возврата');
        return;
    }

    const formData = {
        plan: document.getElementById('subscriptionPlan').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        promoCode: document.getElementById('promoCode').value,
        emailConsent: document.getElementById('emailAgreement').checked
    };

    try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

        const response = await fetch('/subscribe/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'CSRF-Token': csrfToken
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            // Здесь интеграция с платежной системой
            // window.location.href = data.redirectUrl;
            alert('Подписка оформлена! Добро пожаловать в премиум!');
            closeModal();
            location.reload();
        } else {
            throw new Error(data.message || 'Ошибка оформления подписки');
        }
    } catch (err) {
        console.error('Ошибка:', err);
        alert('Не удалось оформить подписку: ' + err.message);
    }
}

// Закрытие модального окна по Escape
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});