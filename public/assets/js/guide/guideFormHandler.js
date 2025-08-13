document.addEventListener('DOMContentLoaded', function () {
    const paidRadio = document.getElementById('paid');
    const priceInput = document.getElementById('price');
    const form = document.getElementById('edit-create-guide-form'); // или укажите конкретную форму

    paidRadio.addEventListener('change', () => {
        priceInput.focus()
    })

    // Функция проверки
    function checkPriceRequirement() {
        if (paidRadio.checked) {
            priceInput.required = true;
            priceInput.min = "0.1"; // Минимальная цена для платного контента
        } else {
            priceInput.required = false;
            priceInput.min = "0";
        }
    }

    // Проверка при изменении радио
    document.querySelectorAll('input[name="accessType"]').forEach(radio => {
        radio.addEventListener('change', checkPriceRequirement);

    });

    // Проверка при отправке формы
    if (form) {
        form.addEventListener('submit', function (e) {
            checkPriceRequirement();
            if (paidRadio.checked && (!priceInput.value || parseFloat(priceInput.value) <= 0)) {
                e.preventDefault();
                alert('Укажите цену для платного контента');
                priceInput.focus();
            }
        });
    }

    // Инициализация
    checkPriceRequirement();
});

document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('edit-create-guide-form')
    const postImageBlocks = editForm.querySelectorAll('.post-image');

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