document.getElementById('contactButton').addEventListener('click', async function () {
    await showSendFormModal()
});

async function showSendFormModal() {
    try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        const result = await Swal.fire({
            title: 'Отправить письмо',
            html: `
        <div style="text-align: left; margin-bottom: 15px;">
            <label for="swal-input1" style="display: block; margin-bottom: 5px; font-size: 14px;">Имя *</label>
            <input id="swal-input1" class="swal2-input" placeholder="Введите ваше имя" style="width: 100%;">
        </div>
        <div style="text-align: left; margin-bottom: 15px;">
            <label for="swal-input2" style="display: block; margin-bottom: 5px; font-size: 14px;">Фамилия</label>
            <input id="swal-input2" class="swal2-input" placeholder="Введите вашу фамилию" style="width: 100%;">
        </div>
        <div style="text-align: left; margin-bottom: 15px;">
            <label for="swal-input3" style="display: block; margin-bottom: 5px; font-size: 14px;">Email *</label>
            <input id="swal-input3" class="swal2-input" type="email" placeholder="Введите ваш email" style="width: 100%;">
        </div>
        <div style="text-align: left; margin-bottom: 15px;">
            <label for="swal-input4" style="display: block; margin-bottom: 5px; font-size: 14px;">Сообщение *</label>
            <textarea id="swal-input4" class="swal2-textarea" placeholder="Введите ваш вопрос или сообщение" style="width: 100%; min-height: 100px; resize: vertical;"></textarea>
        </div>
    `,
            focusConfirm: false,
            preConfirm: () => {
                const firstname = document.getElementById('swal-input1').value;
                const lastname = document.getElementById('swal-input2').value;
                const email = document.getElementById('swal-input3').value;
                const content = document.getElementById('swal-input4').value;

                if (!firstname || !email || !content) {
                    Swal.showValidationMessage('Пожалуйста, заполните все обязательные поля (*)');
                    return false;
                }

                return { firstname, lastname, email, content };
            },
            confirmButtonText: '<span class="btn-text" style="padding: 0 10px;">Отправить</span>',
            cancelButtonText: '<span class="btn-text">Отмена</span>',
            showCancelButton: true,
            customClass: {
                popup: 'swal2-custom-popup',
                confirmButton: 'swal2-custom-btn swal2-confirm-btn large',
                cancelButton: 'swal2-custom-btn swal2-cancel-btn large'
            }
        })
        if (result.isConfirmed) {
            const formData = result.value;

            const response = await fetch('/user/send-email', {
                method: 'POST',
                headers: {
                    'CSRF-Token': csrfToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })
            const data = await response.json()
            if (!response.ok) {
                throw new Error("Ошибка при отправке письма: ", response.description)
            }
            if (data.success) {
                Swal.fire({
                    title: "Письмо успешно отправлено!",
                    icon: "success",
                    timer: 3000, // Автозакрытие через 3 секунды
                    timerProgressBar: true, // Показывает прогресс-бар
                    showConfirmButton: true,
                    confirmButtonText: '<span class="btn-text" style="padding: 0 15px;">OK</span>',
                    customClass: {
                        popup: 'swal2-custom-popup',
                        confirmButton: 'swal2-custom-btn swal2-confirm-btn large',
                    }
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Ошибка",
                    text: "Не получилось отправить письмо!",
                    timer: 3000, // Автозакрытие через 3 секунды
                    timerProgressBar: true, // Показывает прогресс-бар
                    showConfirmButton: true,
                    confirmButtonText: '<span class="btn-text" style="padding: 0 15px;">OK</span>',
                    customClass: {
                        popup: 'swal2-custom-popup',
                        confirmButton: 'swal2-custom-btn swal2-confirm-btn large',
                        icom: 'swal2-icon swal2-error '
                    }
                });
            }

        }
    } catch (error) {
        console.error(error.message)
    }

}