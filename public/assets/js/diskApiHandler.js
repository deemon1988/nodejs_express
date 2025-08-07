const yandexDiskBtn = document.getElementById('yandex-disk-btn')
if (yandexDiskBtn) {
    yandexDiskBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/admin/api/yandex-disk-start');
            const data = await response.json();
            window.location.href = data.url;
        } catch (err) {
            console.error(err);
            alert('Ошибка при начале авторизации');
        }
    });
}

const getLinkForm = document.getElementById('get-link-form')

if (getLinkForm) {
    getLinkForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // блокируем стандартную отправку

        const fileUrlInput = document.getElementById('fileUrl')
        const fileSizeInput = document.getElementById('fileSize')
        const fileTypeInput = document.getElementById('fileType')

        const fileName = document.getElementById('fileName').value.trim();

        if (!fileName) {
            alert('Введите имя файла');
            return;
        }

        try {
            const response = await fetch(`/admin/api/yandex-disk-get-link?fileName=${encodeURIComponent(fileName)}`);

            if (!response.ok) {
                const data = await response.json();
                // ✅ Если сервер указал редирект — выполняем его
                if (data.redirect) {
                    window.location.href = data.redirect;
                    return;
                }
                // ✅ Иначе — показываем ошибку
                alert(data.error || 'Ошибка получения ссылки');
                return;
            }

            const data = await response.json();

            fileUrlInput.value = data.downloadLink
            fileSizeInput.value = data.fileSize
            fileTypeInput.value = data.fileType

            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = `
      <p><strong>✅ Ссылка на скачивание:</strong></p>
      <a href="${data.downloadLink}" target="_blank" style="color: blue; text-decoration: underline;">
        ${data.downloadLink}
      </a>
      <br><br>
      <small>Скопируйте ссылку или откройте в новой вкладке.</small>
    `;
        } catch (err) {
            console.error(err);
            alert('Не удалось получить ссылку: ' + err.message);
        }
    });
}
