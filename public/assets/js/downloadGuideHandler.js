
document.addEventListener('click', function (event) {
    // Находим ближайший элемент с классом .download-btn
    const button = event.target.closest('.download-btn');

    // Если клик НЕ по кнопке скачивания — выходим
    if (!button) return;

    // Отменяем переход по ссылке
    event.preventDefault();

    // Получаем guideId
    const guideId = button.getAttribute('data-guide-id');
    if (!guideId) {
        console.error('Не найден data-guide-id');
        return;
    }

    downloadGuide(guideId)
})

function downloadGuide(guideId) {
    fetch(`/library/download/${guideId}`)
        .then(response => {
            if (response.ok) {
                const data = response.json()
                return data;
            }
            throw new Error('Ошибка при запросе');
        })
        .then(data => {
            if (data.subscribed) {
                // Если подписан — сразу скачиваем
                startDownload(guideId);
            } else {
                // Если не подписан — показываем модальное окно
                showSubscriptionPrompt(guideId);
            }
        })
        .catch(err => {
            console.error(err);
            alert("Произошла ошибка при загрузке файла.");
        });
}

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
        // Swal.fire({
        //     icon: 'error',
        //     title: 'Ошибка',
        //     text: 'Введите корректный email',
        //     confirmButtonText: 'Закрыть'
        // });
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

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showSubscriptionPrompt(guideId) {
    console.log('📥 Начало: guideId =', guideId, typeof guideId);

    Swal.fire({
        title: '<strong>Подпишитесь на рассылку!</strong>',
        html: `
      <p>Получайте полезные чек-листы и советы каждую неделю</p>
      <input type="email" id="swal-input-email" class="swal2-input" placeholder="Ваш email">
    `,
        icon: 'info',
        showCloseButton: true,
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: 'Подписаться и скачать',
        cancelButtonText: 'Пропустить и скачать',
        customClass: {
            popup: 'swal2-custom-popup',
            title: 'swal2-custom-title',
            confirmButton: 'swal2-custom-btn swal2-confirm-btn large',
            cancelButton: 'swal2-custom-btn swal2-cancel-btn large'
        },
        buttonsStyling: false,
        preConfirm: () => {
            const input = document.getElementById('swal-input-email');
            const email = input.value.trim();
            input.classList.remove('error');

            if (!email) {
                // Пустое поле
                input.classList.add('error');
                Swal.showValidationMessage('Введите email');
                return false;
            }

            if (!/^\S+@\S+\.\S+$/.test(email)) {
                // Неверный формат
                input.classList.add('error');
                Swal.showValidationMessage('Введите корректный email');
                return false;
            }

            return { email };
        },
        // Сброс стилей при каждом вводе (опционально)
        didOpen: () => {
            const input = document.getElementById('swal-input-email');
            input.addEventListener('input', () => {
                input.classList.remove('error');
                Swal.resetValidationMessage();
            });
        }
    }).then((result) => {
        if (result.dismiss === Swal.DismissReason.cancel) {
            console.log('✅ Пропустить: guideId =', guideId); // ← Здесь должно быть то же значение
            startDownload(guideId);
        } else if (result.dismiss === Swal.DismissReason.backdrop) {
            console.log('❌ Закрыто кликом мимо: guideId =', guideId);
        } else if (result.dismiss === Swal.DismissReason.esc) {
            console.log('❌ Закрыто Esc: guideId =', guideId);
        } else if (result.dismiss === Swal.DismissReason.close) {
            console.log('❌ Закрыто крестиком: guideId =', guideId);
        }
        if (result.isConfirmed) {
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
            // Подписался — отправляем email
            fetch('/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken },
                body: JSON.stringify({ email: result.value.email })
            })
                .catch(console.warn)
                .finally(() => {
                    // startDownload(guideId); // Скачиваем в любом случае
                });
        }
        else if (result.dismiss === Swal.DismissReason.cancel) {
            // Кнопка "Пропустить и скачать"
            console.log("id - ", guideId)
            startDownload(guideId);
        }
    });
}