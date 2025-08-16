function startDownload(guideId) {
    // Создаём скрытую ссылку и "кликаем" по ней
    const a = document.createElement('a');
    a.href = `/library/${guideId}`;
    a.download = true;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function showSubscriptionModal(guideId) {
    // Создаём простое модальное окно
    const modal = document.createElement('div');
    modal.id = 'subscription-modal';
    modal.innerHTML = `
      <div class="modal-container">
        <h3>Подпишитесь на рассылку!</h3>
        <p>Получайте полезные чек-листы и советы каждую неделю.</p>
        <div id="email-error-message" class="error-message"></div>
        <input id="subscriber-email" type="email" placeholder="Ваш email">
        <br>
        <button class="btn large modal-btn-subscribe" onclick="subscribeAndDownload('${guideId}')">
          Подписаться и скачать
        </button>
        <button class="button large modal-btn-download" onclick="skipAndDownload('${guideId}')">
          Пропустить и скачать
        </button>
      </div>
    `;

    document.body.appendChild(modal);
}

function closeSubscriptionModal() {
    const modal = document.getElementById('subscription-modal');
    if (modal) modal.remove();
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function subscribeAndDownload(guideId) {
    const emailInput = document.getElementById('subscriber-email');
    const errorElement = document.getElementById('email-error-message');
    // Убираем класс error при начале ввода
    emailInput.addEventListener('input', function () {
        this.classList.remove('error');
        // errorElement.style.display = 'none';
        errorElement.textContent = '';
    });

    const email = emailInput?.value.trim();
    if (!email) {
        alert('Введите email');
        return;
    }
    if (email && !isValidEmail(email)) {
        emailInput.classList.add('error')
        // Показываем сообщение под полем
        errorElement.textContent = 'Введите корректный email';
        errorElement.style.display = 'block';
        return;
    }
    fetch('/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    })
        .then(() => {
            closeSubscriptionModal();
            startDownload(guideId);
        })
        .catch(() => {
            alert('Не удалось подписаться, но вы можете скачать файл.');

            closeSubscriptionModal();
            startDownload(guideId);
        });
}

function skipAndDownload(guideId) {
    closeSubscriptionModal();
    startDownload(guideId);
}

module.exports = { showSubscriptionModal }