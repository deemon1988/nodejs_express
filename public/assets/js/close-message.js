document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById('logout-btn')
  if(logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.setItem('isLogout', true)
    })
  } else if( localStorage.getItem('isLogout')) {
    localStorage.removeItem('isLogout')
  }

  const messages = document.querySelectorAll(".flash-message");

  messages.forEach((msg) => {
    // Клик по кнопке закрытия
    const closeBtn = msg.querySelector(".close-button");
    if (msg.classList.contains("success")) {
      setTimeout(() => {
        fadeAndRemove(msg);
        // msg.classList.add("fade-out");
      }, 4000);
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        fadeAndRemove(msg);
        // msg.classList.add("fade-out");
      });
    }
  });

  function fadeAndRemove(element) {
    element.classList.add("fade-out");
    // Подождать завершения анимации (300ms) и удалить
    setTimeout(() => {
      element.remove(); // Полностью удаляем из DOM
    }, 300);
  }
});
