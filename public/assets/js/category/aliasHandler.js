document.addEventListener('DOMContentLoaded', () => {
  const radioButtons = document.querySelectorAll('input[name="updated-aliasId"]');
  const updatedNameContainer = document.getElementById('updatedNameContainer');
  const updatedNameInput = document.getElementById('updatedName');
  const cancelBtn = updatedNameContainer.querySelector('#edit-cancel');
  let checkedRadioBtn;

  radioButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (radio.checked) {
        checkedRadioBtn = e.target;
        updatedNameContainer.classList.add('show');
        updatedNameInput.value = radio.dataset.name;
      }
    });
  });

  cancelBtn.addEventListener('click', () => {
    updatedNameContainer.classList.remove('show');
    // Добавлена проверка, что элемент существует
    if (checkedRadioBtn) {
      checkedRadioBtn.checked = false;
    }
  });


});

