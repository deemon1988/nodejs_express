const deletePost = async (btn) => {
    try {
        const postId = btn.parentNode.querySelector("[name=postId]").value
        const csrf = btn.parentNode.querySelector("[name=_csrf]").value
        const postElement = btn.closest('.post.page-preview')

        const confirmResult = await Swal.fire(swalDeleteConfig())

        if (confirmResult.isConfirmed) {
            const result = await fetch('/admin/delete-post/' + postId, {
                method: 'DELETE',
                headers: {
                    'csrf-token': csrf,
                    'Content-Type': 'application/json'
                }
            })
            if (!result.ok) {
                throw new Error(result.message)
            }

            const data = await result.json()
            postElement.parentNode.removeChild(postElement)
            await Swal.fire(swalConfirmConfig())
                window.location.href = '/admin/posts'
        } else {
            return
        }

    } catch (error) {
        console.log(error)
    }
}

const swalDeleteConfig = (title = "Удалить этот пост ?") => {
    return {
        title: title,
        icon: 'info',
        showCloseButton: true,
        showCancelButton: true,
        confirmButtonText: '<span class="btn-text">Удалить</span>',
        cancelButtonText: '<span class="btn-text">Отменить</span>',
        customClass: {
            popup: 'swal2-custom-popup',
            title: 'swal2-custom-title',
            confirmButton: 'swal2-custom-btn swal2-confirm-btn large',
            cancelButton: 'swal2-custom-btn swal2-cancel-btn large'
        }
    }
}

const swalConfirmConfig = (title = "Пост удален") => {
    return {
        title: title,
        showCloseButton: true,
        confirmButtonText: '<span class="btn-text">OK</span>',
        customClass: {
            popup: 'swal2-custom-popup',
            title: 'swal2-custom-title',
            confirmButton: 'swal2-custom-btn swal2-confirm-btn large',
        }
    }
}