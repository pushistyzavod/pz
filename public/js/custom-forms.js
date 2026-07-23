// Custom form handler - overrides Tilda forms to work with our backend
(function() {
  'use strict';

  // Wait for Tilda to initialize
  document.addEventListener('DOMContentLoaded', function() {
    // Patch all Tilda forms
    setTimeout(function() {
      var forms = document.querySelectorAll('form[data-formactiontype]');
      forms.forEach(function(form) {
        // Replace Tilda form handler
        var originalSubmit = form.onsubmit;
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          var formData = new FormData(form);
          var data = {};
          formData.forEach(function(value, key) {
            data[key] = value;
          });

          // Add extra info
          data.source = window.location.href;
          data.pageTitle = document.title;

          fetch('/api/form', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
          })
          .then(function(response) { return response.json(); })
          .then(function(result) {
            if (result.status === 'success') {
              // Hide form inputs, show success
              var inputsBox = form.querySelector('.t-form__inputsbox');
              if (inputsBox) {
                inputsBox.style.display = 'none';
              }
              var successBox = form.querySelector('.js-successbox');
              if (successBox) {
                successBox.style.display = 'block';
                successBox.textContent = result.message || 'Спасибо! Ваша заявка принята.';
              }
            } else {
              alert('Произошла ошибка. Пожалуйста, попробуйте позже.');
            }
          })
          .catch(function(err) {
            console.error('Form submit error:', err);
            // Fallback: show success anyway for UX
            var inputsBox = form.querySelector('.t-form__inputsbox');
            if (inputsBox) {
              inputsBox.style.display = 'none';
            }
            var successBox = form.querySelector('.js-successbox');
            if (successBox) {
              successBox.style.display = 'block';
              successBox.textContent = 'Спасибо! Ваша заявка принята.';
            }
          });
        });
      });
    }, 500);
  });
})();