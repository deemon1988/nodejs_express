document.getElementById('yandex-disk-btn').addEventListener('click', async () => {
    const response = await fetch('/admin/api/yandex-disk-start');
    const data = await response.json();
    window.location.href = data.url;
});