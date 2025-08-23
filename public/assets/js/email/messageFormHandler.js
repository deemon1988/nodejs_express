document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('admin-messages-select')) {
            const form = e.target.form;
            const csrfToken = form._csrf.value
            // Создаем URLSearchParams вместо FormData
            const params = new URLSearchParams();
            params.append('status', e.target.value);
            params.append('_csrf', csrfToken); // если CSRF передается как hidden input

            fetch(form.action, {
                method: 'POST',
                body: params,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'CSRF-Token': csrfToken
                }
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Можно добавить уведомление об успехе
                        console.log('Статус успешно обновлен');
                        window.location.href = data.url
                    } else {
                        // Обработка ошибки
                        console.error('Ошибка при обновлении статуса');
                    }
                })
                .catch(error => {
                    console.error('Ошибка:', error);
                });

        }
    })

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('toggle-reply-form-btn')) {
            const messageId = e.target.dataset.messageId
            const form = document.getElementById(`reply-form-${messageId}`);
            form.classList.toggle('show');
        }
    })

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('messages-delete-btn')) {
            const messageId = e.target.dataset.messageId
            const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            const messageItem = e.target.closest('.post.message-item')
            Swal.fire({
                title: 'Удалить файл?',
                text: 'Этот файл будет безвозвратно удалён.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: '<span class="btn-text">Удалить</span>',
                cancelButtonText: '<span class="btn-text">Отмена</span>',
                customClass: {
                    popup: 'swal2-custom-popup',
                    title: 'swal2-custom-title',
                    confirmButton: 'swal2-custom-btn swal2-confirm-btn large',
                    cancelButton: 'swal2-custom-btn swal2-cancel-btn large'
                }
            }).then(result => {
                if (result.isConfirmed) {
                    fetch(`/admin/messages/${+messageId}/delete`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'CSRF-Token': csrfToken
                        },
                    })
                        .then(response => {
                            return response.json()
                        })
                        .then(data => {
                            if (!data.success) {
                                Swal.fire({
                                    title: 'Ошибка',
                                    text: data.message || 'Не удалось удалить файл.',
                                    icon: 'error',
                                    confirmButtonText: '<span class="btn-text">ОК</span>',
                                    customClass: {
                                        popup: 'swal2-custom-popup',
                                        title: 'swal2-custom-title',
                                        confirmButton: 'swal2-custom-btn swal2-confirm-btn large'
                                    }
                                });

                            } else {
                                Swal.fire({
                                    title: 'Файл удалён!',
                                    text: data.message || 'Файл успешно удалён с сервера.',
                                    icon: 'success',
                                    confirmButtonText: '<span class="btn-text">ОК</span>',
                                    customClass: {
                                        popup: 'swal2-custom-popup',
                                        title: 'swal2-custom-title',
                                        confirmButton: 'swal2-custom-btn swal2-confirm-btn large'
                                    }
                                });
                                messageItem.remove()
                            }
                        })
                }
            })
        }
    })

})