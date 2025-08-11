  document.addEventListener('DOMContentLoaded', () => {
    const radioButtons = document.querySelectorAll('input[name="aliasId"]');
    const updatedNameContainer = document.getElementById('updatedNameContainer');
    const updatedNameInput = document.getElementById('updatedName');

    radioButtons.forEach(radio => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          updatedNameContainer.style.display = 'block';
          updatedNameInput.value = radio.dataset.name;
        }
      });
    });
  });