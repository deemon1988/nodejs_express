document.getElementById('yandex-login-btn').addEventListener('click', async () => {
    const response = await fetch('/api/auth/yandex/start');
    const data = await response.json();
    window.location.href = data.url;
});
