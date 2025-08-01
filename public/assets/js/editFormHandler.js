document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('edit-create-post-form')
    const postImageBlocks = editForm.querySelectorAll('.post-image');
    const multiplePreviewContainer = editForm.querySelector('.image-preview');
    const galleryBlock = editForm.querySelector('.post-gallery');

    postImageBlocks.forEach(block => {
        const img = block.querySelector('img');
        const icon = block.querySelector('i.bi-x-square');
        const input = block.querySelector('input[type="file"]')

        if (img && icon) {
            const src = img.getAttribute('src');
            if (src && src.trim() !== '') {
                icon.classList.add('show');
            }
            icon.addEventListener('click', () => {
                img.src = ''
                icon.classList.remove('show')
                input.value = ''
                console.log('imnput listener')

            })
        }
        let isGalleryIconBound = false;
        // 2. При выборе файла — показать иконку
        input.addEventListener('change', () => {
            if (input.files && input.files.length > 0) {
                icon.classList.add('show');
            }
            // Если multiple и есть контейнер для превью — отобразить все
            if (input.multiple) {
                galleryBlock.innerHTML = ''; // очистка предыдущих превью

                Array.from(input.files).forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const previewImg = document.createElement('img');
                        previewImg.src = e.target.result;
                        // previewImg.style.maxWidth = '300px';
                        // previewImg.style.margin = '5px';
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
                            console.log('imnput multiple')
                        });
                    }
                });
            } else {
                const reader = new FileReader()
                reader.onload = (e) => {
                    img.src = e.target.result
                }
                reader.onerror = (err) => {
                    console.error(err)
                }
                reader.readAsDataURL(input.files[0])
            }
        })
    })
})