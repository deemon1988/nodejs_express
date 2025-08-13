async function deleteCategory(categoryId) {
    // Показываем SweetAlert2 с подтверждением
    const result = await Swal.fire({
        title: 'Вы уверены?',
        text: "Вы не сможете отменить это действие!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Да, удалить!',
        cancelButtonText: 'Отмена'
    });

    // Если пользователь подтвердил удаление
    if (result.isConfirmed) {
        try {
            // Отправляем DELETE запрос (или POST, зависит от вашего роута)
            const response = await fetch(`/admin/delete-category/${categoryId}`, {
                method: 'POST', // или 'DELETE'
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').getAttribute('content') // если нужен CSRF
                }
            });

            const data = await response.json();

            if (data.success) {
                // Показываем сообщение об успехе
                await Swal.fire(
                    'Удалено!',
                    data.message,
                    'success'
                );
                // Обновляем страницу
                window.location.href = '/admin/create-category'

            } else {
                // Показываем ошибку
                Swal.fire(
                    'Ошибка!',
                    data.message,
                    'error'
                );
            }
        } catch (error) {
            // Показываем ошибку сети
            Swal.fire(
                'Ошибка!',
                'Произошла ошибка при удалении категории',
                'error'
            );
        }
    }
}