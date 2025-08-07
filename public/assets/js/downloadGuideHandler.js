

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

async function startDownload(guideId) {
    try {
        const result = await fetch(`/library/guide/${guideId}`, {
            headers: {
                "Content-Type": 'application/json'
            }
        })
        if (!result.ok) {
            throw new Error("Не получилось скачать файл")
        }
        const data = await result.json()
        window.location.href = data.downloadUrl;
    } catch (err) {
        console.error('Ошибка загрузки:', err);
        alert('Не удалось начать загрузку файла');
    }
}



function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showSubscriptionPrompt(guideId) {
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
        if (result.isConfirmed) {
            handleSubscription(result.value.email, guideId)
        }
        else if (result.dismiss === Swal.DismissReason.cancel) {
            // Кнопка "Пропустить и скачать"
            console.log("id - ", guideId)
            startDownload(guideId);
        }
    });
}

async function handleSubscription(email, guideId) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
    try {
        // Подписался — отправляем email
        const response = await fetch('/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'CSRF-Token': csrfToken },
            body: JSON.stringify({ email: email })
        })

        if (!response.ok) throw new Error('Не удалось оформить подписку')

        const data = await response.json()
        if (data.success) {
            // Сообщение об успешной подписке
            await Swal.fire({
                title: 'Успешно!',
                text: 'Вы успешно подписались на рассылку',
                icon: 'success',
                timer: 3000,
                showConfirmButton: false
            })
        }

    } catch (err) {
        console.error('Ошибка подписки:', err);
        await Swal.fire({
            title: 'Ошибка',
            text: 'Не удалось оформить подписку: ' + err.message,
            icon: 'error',
            timer: 3000,
            showConfirmButton: false
        })

    } finally {
        // ✅ Всегда скачиваем файл — в finally
        startDownload(guideId);
    }


}