// public/js/guideAccess.js

async function checkGuideAccess(guideId) {
  try {
    const response = await fetch(`/access/guide/${guideId}/access`);

    const data = await response.json();

    if (data.hasAccess) {
      // Начинаем загрузку
      window.location.href = data.downloadUrl;
    } else {
      // Показываем модалку в зависимости от типа доступа
      showAccessModal(data);
    }
  } catch (err) {
    console.error('Ошибка проверки доступа:', err);
    alert('Не удалось проверить доступ');
  }
}

function showAccessModal(data) {
  if (data.action === 'login') {
    Swal.fire({
      title: 'Требуется авторизация',
      text: 'Войдите в аккаунт для доступа к материалу',
      icon: 'info',
      confirmButtonText: '<span class="btn-text" style="padding: 0 10px;">Войти</span>',
      cancelButtonText: '<span class="btn-text">Отмена</span>',
      showCancelButton: true,
      customClass: {
        popup: 'swal2-custom-popup',
        // title: 'swal2-custom-title',
        confirmButton: 'swal2-custom-btn swal2-confirm-btn large',
        cancelButton: 'swal2-custom-btn swal2-cancel-btn large'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        window.location.href = '/login';
      }
    });
  }
  else if (data.action === 'pay') {
    Swal.fire({
      title: 'Платный контент',
      html: `
        <p>Этот гайд доступен за ${data.price} руб.</p>
        <p>Оплатите для получения доступа</p>
      `,
      icon: 'info',
      confirmButtonText: '<span class="btn-text">Оплатить</span>',
      cancelButtonText: '<span class="btn-text">Отмена</span>',
      showCancelButton: true,
      customClass: {
        popup: 'swal2-custom-popup',
        // title: 'swal2-custom-title',
        confirmButton: 'swal2-custom-btn swal2-confirm-btn large',
        cancelButton: 'swal2-custom-btn swal2-cancel-btn large'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        initiatePayment(data.guideId, data.userId);
      }
    });
  }
  else if (data.action === 'subscribe') {
    Swal.fire({
      title: 'Требуется подписка',
      text: 'Этот гайд доступен только по подписке',
      icon: 'info',
      confirmButtonText: '<span class="btn-text">Оформить подписку</span>',
      cancelButtonText: '<span class="btn-text">Отмена</span>',
      showCancelButton: true,
      customClass: {
        popup: 'swal2-custom-popup',
        confirmButton: 'swal2-custom-btn swal2-confirm-btn large',
        cancelButton: 'swal2-custom-btn swal2-cancel-btn large'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // window.location.href = '/subscribe-page';
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        return fetch('/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CSRF-Token': csrfToken
          },
        })
          .then(result => result.json())
          .then(data => {
            if (data.success) {
              swalConfirmSubsribtion()
            } else {
              swalErrorSubsribtion()
            }
          })
      }
    })
      .catch(err => {
        console.log(err)
        swalErrorSubsribtion()
      })
  }
}

async function initiatePayment(guideId) {
  try {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    const response = await fetch('/access/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken
      },
      body: JSON.stringify({ guideId })
    });

    const data = await response.json();

    if (data.success) {
      // Здесь интеграция с платежной системой
      // stripe.confirmCardPayment(data.clientSecret)
      // alert('Оплата инициализирована');

      const params = new URLSearchParams({
        token: data.token,
        paymentId: data.paymentId,
        userEmail: data.userEmail,
        amount: data.amount,
        productName: data.productName,
        orderDate: data.orderDate
      });

      window.location.href = `/access/payment?${params.toString()}`;
    } else {
      throw new Error(data.error || 'Ошибка оплаты');
    }
  } catch (err) {
    console.error('Ошибка оплаты:', err);
    alert('Не удалось инициализировать оплату');
  }
}

function swalConfirmSubsribtion() {
  return Swal.fire({
    title: 'Поздравляем!',
    text: 'Подписка успешно оформлена',
    icon: 'info',
    confirmButtonText: '<span class="btn-text">ОК</span>',
    showCloseButton: true,
    timer: 3000, // Автоматическое закрытие через 3 секунды (3000 мс)
    timerProgressBar: true,
    customClass: {
      popup: 'swal2-custom-popup',
      confirmButton: 'swal2-custom-btn swal2-confirm-btn large',
    }
  })
}

function swalErrorSubsribtion() {
  return Swal.fire({
    title: 'Ошибка',
    text: 'Не получилось оформить подписку',
    icon: 'error',
    confirmButtonText: '<span class="btn-text">Закрыть</span>',
    customClass: {
      popup: 'swal2-custom-popup',
      confirmButton: 'swal2-custom-btn swal2-confirm-btn large',
    }
  })
}