(() => {
  const STORAGE_KEY = 'plennia:create-plan';
  const validChoices = new Set(['dog', 'cat']);

  const readStoredState = () => {
    try {
      return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || '{}');
    } catch (error) {
      return {};
    }
  };

  const writeStoredState = (value) => {
    try {
      const nextState = {
        ...readStoredState(),
        petType: value,
      };
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch (error) {
      // Storage can fail in private browsing; keep the form usable.
    }
  };

  const getInitialChoice = () => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('petType');

    if (validChoices.has(fromQuery)) {
      return fromQuery;
    }

    return null;
  };

  const clearCheckedInputs = (form) => {
    form.querySelectorAll('[data-plan-intro-choice]').forEach((choice) => {
      choice.checked = false;
    });
  };

  const updateState = (form, value) => {
    const normalizedValue = validChoices.has(value) ? value : '';
    const hiddenField = form.querySelector('[data-plan-intro-value]');
    const continueButton = document.querySelector(`[data-plan-intro-continue][form="${form.id}"]`);

    if (hiddenField) {
      hiddenField.value = normalizedValue;
    }

    if (continueButton) {
      const hasSelection = normalizedValue !== '';
      continueButton.disabled = !hasSelection;
      continueButton.setAttribute('aria-disabled', String(!hasSelection));
    }

    if (normalizedValue) {
      writeStoredState(normalizedValue);
    }
  };

  const syncCheckedInput = (form, value) => {
    const choices = form.querySelectorAll('[data-plan-intro-choice]');

    choices.forEach((choice) => {
      choice.checked = choice.value === value;
    });
  };

  document.querySelectorAll('[data-plan-intro-form]').forEach((form) => {
    const initialChoice = getInitialChoice();

    if (initialChoice) {
      syncCheckedInput(form, initialChoice);
    } else {
      clearCheckedInputs(form);
    }

    updateState(form, initialChoice);

    form.addEventListener('change', (event) => {
      const target = event.target;

      if (!(target instanceof HTMLInputElement) || !target.matches('[data-plan-intro-choice]')) {
        return;
      }

      updateState(form, target.value);
    });

    form.addEventListener('submit', (event) => {
      const checkedChoice = form.querySelector('[data-plan-intro-choice]:checked');

      if (!(checkedChoice instanceof HTMLInputElement)) {
        event.preventDefault();
        updateState(form, '');
        return;
      }

      updateState(form, checkedChoice.value);
    });
  });
})();
