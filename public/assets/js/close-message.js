document.addEventListener("DOMContentLoaded", () => {
  const messages = document.querySelectorAll(".flash-message");

  messages.forEach((msg) => {
    // Клик по кнопке закрытия
    const closeBtn = msg.querySelector(".close-button");
    if (msg.classList.contains("success")) {
      setTimeout(() => {
        fadeAndRemove(msg);
      }, 4000);
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        fadeAndRemove(msg);
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
