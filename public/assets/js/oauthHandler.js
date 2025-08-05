

document.getElementById('yandex-login-btn').addEventListener('click', function () {
    const clientId = 'ac49ae0a499f434c961365432f7503f3'; // вставь свой client_id
    const redirectUri = 'http://localhost:3000/oauth/yandex/callback'; // должен быть настроен в Яндексе

    const authUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    window.location.href = authUrl;
});
