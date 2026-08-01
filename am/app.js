const steps = [...document.querySelectorAll('.form-step')];
const nextButton = document.querySelector('#nextButton');
const backButton = document.querySelector('#backButton');
const form = document.querySelector('#leadForm');
const error = document.querySelector('#formError');
const titles = ['Sobre suas obras', 'Seu maior desafio', 'Seus dados de contato'];
let currentStep = 1;

function updateStep() {
  steps.forEach(step => step.classList.toggle('active', Number(step.dataset.step) === currentStep));
  const percentage = Math.round((currentStep / 3) * 100);
  document.querySelector('#stepLabel').textContent = `ETAPA ${currentStep} DE 3`;
  document.querySelector('#stepTitle').textContent = titles[currentStep - 1];
  document.querySelector('#progressPercent').textContent = `${percentage}%`;
  document.querySelector('#progressBar').style.width = `${percentage}%`;
  backButton.hidden = currentStep === 1;
  nextButton.innerHTML = currentStep === 3 ? 'Quero meu diagnóstico <span>→</span>' : 'Continuar <span>→</span>';
  error.textContent = '';
}

function validateCurrentStep() {
  const fields = [...steps[currentStep - 1].querySelectorAll('[required]')];
  for (const field of fields) {
    if (field.type === 'radio') {
      if (!form.querySelector(`[name="${field.name}"]:checked`)) {
        error.textContent = 'Escolha uma opção para continuar.';
        field.closest('fieldset').querySelector('legend')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }
    } else if (!field.checkValidity()) {
      error.textContent = field.type === 'email' ? 'Digite um e-mail válido.' : 'Preencha todos os campos para continuar.';
      field.focus();
      return false;
    }
  }
  return true;
}

nextButton.addEventListener('click', () => {
  if (!validateCurrentStep()) return;
  if (currentStep < 3) {
    currentStep += 1;
    updateStep();
    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const data = Object.fromEntries(new FormData(form));
  console.info('Lead pronto para integração:', data);
  form.hidden = true;
  document.querySelector('.form-progress').hidden = true;
  document.querySelector('.progress-track').hidden = true;
  document.querySelector('#successName').textContent = data.nome.split(' ')[0];
  document.querySelector('#successState').hidden = false;
});

backButton.addEventListener('click', () => {
  if (currentStep > 1) currentStep -= 1;
  updateStep();
});

const phone = document.querySelector('#whatsapp');
phone.addEventListener('input', event => {
  const value = event.target.value.replace(/\D/g, '').slice(0, 11);
  event.target.value = value.length > 10
    ? value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
    : value.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
});

updateStep();
