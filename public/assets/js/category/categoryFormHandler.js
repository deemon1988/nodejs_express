
document.addEventListener('DOMContentLoaded', () => {
    const categoryForm = document.querySelector('.category-form')

    const postImageBlocks = categoryForm.querySelectorAll('.category-image');

    postImageBlocks.forEach(block => {
        const img = block.querySelector('img');
        const icon = block.querySelector('i.bi-x-square');
        const input = block.querySelector('input[type="file"]')
        const hiddenInput = block.querySelector('input[type="hidden"]')
        if (hiddenInput) {
            hiddenInput.value = 'false'; // Всегда начинаем с false
        }

        if (img && icon) {
            const src = img.getAttribute('src');
            if (src && src.trim() !== '') {
                icon.classList.add('show');
            }
            icon.addEventListener('click', async () => {
                img.removeAttribute('src');
                icon.classList.remove('show')
                input.value = ''
                if (hiddenInput) {
                    hiddenInput.value = 'true'
                }
                // const result = await fetch(`/admin/delete-file?path=${src}`, {
                //     method: 'GET',
                //     headers: {
                //         'Content-Type': 'application/json'
                //     }
                // })
                // const data = await result.json()
                // if (data.success) {
                //     img.removeAttribute('src');
                //     icon.classList.remove('show')
                //     input.value = ''
                //     if (hiddenInput) {
                //         hiddenInput.value = 'true'
                //     }
                // } else {
                //     return
                // }
            })
        }

        // 2. При выборе файла — показать иконку
        input.addEventListener('change', () => {
            if (input.files && input.files.length > 0) {
                icon.classList.add('show');
                hiddenInput.value = 'false'
            }

            const reader = new FileReader()
            reader.onload = (e) => {
                img.setAttribute('src', e.target.result);
            }
            reader.onerror = (err) => {
                console.error(err)
            }
            reader.readAsDataURL(input.files[0])

        })
    })
})