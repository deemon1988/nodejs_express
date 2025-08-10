document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('edit-create-post-form')
    const postImageBlocks = editForm.querySelectorAll('.post-image');
    const galleryBlock = editForm.querySelector('.post-gallery');

    if (galleryBlock.innerHTML !== '') {
        const postImageBlocks = galleryBlock.closest('.post-image');
        const icon = postImageBlocks.querySelector('i.bi-x-square');
        icon.addEventListener('click', () => {
            galleryBlock.innerHTML = ''
            icon.classList.remove('show')
        })
    }

    postImageBlocks.forEach(block => {
        const img = block.querySelector('img');
        const icon = block.querySelector('i.bi-x-square');
        const input = block.querySelector('input[type="file"]')
        const hiddenInput = block.querySelector('input[type="hidden"]')

        if (img && icon) {
            const src = img.getAttribute('src');
            if (src && src.trim() !== '') {
                icon.classList.add('show');
            }
            icon.addEventListener('click', () => {
                img.removeAttribute('src');
                icon.classList.remove('show')
                input.value = ''
                if (hiddenInput) {
                    hiddenInput.value = 'true'
                }
            })
        }
        let isGalleryIconBound = false;

        // 2. При выборе файла — показать иконку
        input.addEventListener('change', () => {
            if (input.files && input.files.length > 0) {
                icon.classList.add('show');
                hiddenInput.value = 'false'
            }

            // Если multiple и есть контейнер для превью — отобразить все
            if (input.multiple) {
                galleryBlock.innerHTML = ''; // очистка предыдущих превью

                Array.from(input.files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const previewImg = document.createElement('img');
                        previewImg.src = e.target.result;
                        galleryBlock.appendChild(previewImg);
                    };
                    reader.readAsDataURL(file);
                    // Назначаем обработчик удаления только один раз
                    if (!isGalleryIconBound) {
                        isGalleryIconBound = true;

                        icon.addEventListener('click', () => {
                            galleryBlock.innerHTML = '';
                            icon.classList.remove('show');
                            input.value = '';
                            // Отмечаем, что файл был удален
                            if (hiddenInput) {
                                hiddenInput.value = 'true'
                            }
                        });
                    }
                });
            } else {
                const reader = new FileReader()
                reader.onload = (e) => {
                    img.setAttribute('src', e.target.result);
                }
                reader.onerror = (err) => {
                    console.error(err)
                }
                reader.readAsDataURL(input.files[0])
            }
        })
    })
})