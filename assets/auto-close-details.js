(function autoCloseDetails() {
  document.addEventListener('click', function (event) {
    const detailsToClose = [...document.querySelectorAll('details[data-auto-close-details][open]')].filter(
      (element) => {
        const closingOn = window.innerWidth < 750 ? 'mobile' : 'desktop';
        return (
          element.getAttribute('data-auto-close-details')?.includes(closingOn) &&
          !(event.target instanceof Node && element.contains(event.target))
        );
      }
    );

    for (const detailsElement of detailsToClose) detailsElement.removeAttribute('open');
  });
})();

(function plenniaComingSoonBootstrap() {
  const initializedSections = new WeakSet();

  const initSection = (section) => {
    if (
      !(section instanceof HTMLElement) ||
      initializedSections.has(section) ||
      section.dataset.localeReady === 'true'
    ) {
      return;
    }

    initializedSections.add(section);
    section.dataset.localeReady = 'true';

    const copyElement = section.querySelector('[data-plennia-copy]');
    if (!copyElement) return;

    let copy;

    try {
      copy = JSON.parse(copyElement.textContent);
    } catch (error) {
      return;
    }

    const storageKey = 'plennia-coming-soon-locale';
    const defaultLocale = section.dataset.defaultLocale === 'en' ? 'en' : 'es';
    const uiForm = section.querySelector('[data-ui-form]');
    const nameInput = section.querySelector('[data-name-input]');
    const contactRow = section.querySelector('[data-contact-row]');
    const contactInput = section.querySelector('[data-contact-input]');
    const countryCodeWrap = section.querySelector('[data-country-code-wrap]');
    const countryCodeSelect = section.querySelector('[data-country-code-select]');
    const phoneChannelGroup = section.querySelector('[data-phone-channel-group]');
    const phoneChannelButtons = section.querySelectorAll('[data-phone-channel-button]');
    const consentInput = section.querySelector('[data-consent-input]');
    const submitButton = section.querySelector('[data-submit-button]');
    const successState = section.querySelector('[data-success-state]');
    const statusLive = section.querySelector('[data-status-live]');
    const customerForm = document.getElementById(`PlenniaCustomerForm-${section.dataset.sectionId}`);
    const customerEmail = section.querySelector('[data-customer-email]');
    const customerTags = section.querySelector('[data-customer-tags]');
    const customerFirstName = section.querySelector('[data-customer-first-name]');
    const customerLastName = section.querySelector('[data-customer-last-name]');
    const contactError = section.querySelector('[data-contact-error]');
    const consentError = section.querySelector('[data-consent-error]');
    const generalError = section.querySelector('[data-general-error]');
    const localeButtons = section.querySelectorAll('[data-locale-button]');
    const methodButtons = section.querySelectorAll('[data-method-button]');
    const textTargets = section.querySelectorAll('[data-i18n-key]');
    const placeholderTargets = section.querySelectorAll('[data-i18n-placeholder]');
    const consentText = section.querySelector('[data-consent-text]');

    const state = {
      locale: defaultLocale,
      method: 'email',
      phoneChannel: 'sms',
      submitted: false,
      pending: false,
    };

    const localeMeta = {
      es: {
        currentLabel: 'Spanish',
        destinationLabel: 'Spanish',
      },
      en: {
        currentLabel: 'English',
        destinationLabel: 'English',
      },
    };

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^\+?[0-9\s().-]{7,}$/;

    const setMetaDescription = (value) => {
      let meta = document.querySelector('meta[name="description"]');

      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }

      meta.setAttribute('content', value || '');
    };

    const splitName = (value) => {
      const trimmed = value.trim().replace(/\s+/g, ' ');

      if (!trimmed) {
        return { firstName: '', lastName: '' };
      }

      const parts = trimmed.split(' ');

      if (parts.length === 1) {
        return { firstName: parts[0], lastName: '' };
      }

      return {
        firstName: parts.shift() || '',
        lastName: parts.join(' '),
      };
    };

    const currentCopy = () => copy[state.locale] || copy[defaultLocale];

    const clearErrors = () => {
      [contactError, consentError, generalError].forEach((element) => {
        if (!element) return;

        element.textContent = '';
        element.hidden = true;
      });
    };

    const setError = (element, message) => {
      if (!element) return;

      element.textContent = message;
      element.hidden = false;
    };

    const syncLocaleUrl = () => {
      try {
        const url = new URL(window.location.href);

        if (state.locale === defaultLocale) {
          url.searchParams.delete('lang');
        } else {
          url.searchParams.set('lang', state.locale);
        }

        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      } catch (error) {
        /* no-op */
      }
    };

    const syncMethodCopy = () => {
      const localeCopy = currentCopy();
      const isPhone = state.method === 'phone';

      if (contactInput) {
        contactInput.type = isPhone ? 'tel' : 'email';
        contactInput.inputMode = isPhone ? 'tel' : 'email';
        contactInput.autocomplete = isPhone ? 'tel-national' : 'email';
        contactInput.placeholder = isPhone ? localeCopy.phonePlaceholder : localeCopy.emailPlaceholder;
        contactInput.setAttribute(
          'aria-label',
          `${localeCopy.contactLabel} ${isPhone ? localeCopy.phoneTab : localeCopy.emailTab}`
        );
      }

      if (contactRow) {
        contactRow.classList.toggle('is-phone', isPhone);
      }

      if (countryCodeWrap) {
        countryCodeWrap.hidden = !isPhone;
      }

      if (countryCodeSelect) {
        countryCodeSelect.disabled = !isPhone;
        if (localeCopy.countryCodeLabel) {
          countryCodeSelect.setAttribute('aria-label', localeCopy.countryCodeLabel);
        }
      }

      if (phoneChannelGroup) {
        phoneChannelGroup.hidden = !isPhone;
      }

      if (consentText) {
        consentText.textContent =
          !isPhone
            ? localeCopy.consentEmail
            : state.phoneChannel === 'whatsapp'
              ? localeCopy.consentPhoneWhatsapp
              : localeCopy.consentPhoneSms;
      }

      methodButtons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.methodButton === state.method));
      });

      phoneChannelButtons.forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.phoneChannelButton === state.phoneChannel));
      });
    };

    const applyLocale = (locale) => {
      state.locale = locale === 'en' ? 'en' : 'es';
      const localeCopy = currentCopy();

      textTargets.forEach((element) => {
        const key = element.dataset.i18nKey;
        if (!key || localeCopy[key] == null) return;

        if (key === 'heading') {
          element.innerHTML = String(localeCopy[key]).replace(/\n/g, '<br>');
        } else {
          element.textContent = localeCopy[key];
        }
      });

      placeholderTargets.forEach((element) => {
        const key = element.dataset.i18nPlaceholder;
        if (!key || localeCopy[key] == null) return;

        element.setAttribute('placeholder', localeCopy[key]);
      });

      document.title = localeCopy.metaTitle || document.title;
      setMetaDescription(localeCopy.metaDescription || '');
      document.documentElement.lang = state.locale;

      localeButtons.forEach((button) => {
        const buttonLocale = button.dataset.localeButton === 'en' ? 'en' : 'es';
        const isCurrentLocale = buttonLocale === state.locale;
        const labels = localeMeta[buttonLocale];

        button.setAttribute('aria-pressed', 'false');
        if (isCurrentLocale) {
          button.setAttribute('aria-current', 'true');
        } else {
          button.removeAttribute('aria-current');
        }
        button.hidden = isCurrentLocale;
        button.disabled = isCurrentLocale;
        button.setAttribute('aria-hidden', String(isCurrentLocale));
        button.tabIndex = isCurrentLocale ? -1 : 0;
        button.setAttribute(
          'aria-label',
          isCurrentLocale
            ? `Current language: ${labels.currentLabel}`
            : `Switch to ${labels.destinationLabel}`
        );
      });

      syncMethodCopy();
      syncLocaleUrl();

      try {
        window.localStorage.setItem(storageKey, state.locale);
      } catch (error) {
        /* no-op */
      }
    };

    let initialLocale = defaultLocale;

    try {
      const urlLocale = new URL(window.location.href).searchParams.get('lang');

      if (urlLocale === 'es' || urlLocale === 'en') {
        initialLocale = urlLocale;
      } else {
        const storedLocale = window.localStorage.getItem(storageKey);
        if (storedLocale === 'es' || storedLocale === 'en') {
          initialLocale = storedLocale;
        }
      }
    } catch (error) {
      /* no-op */
    }

    localeButtons.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const locale = button.dataset.localeButton === 'en' ? 'en' : 'es';
        if (locale === state.locale) return;
        applyLocale(locale);
      });
    });

    applyLocale(initialLocale);

    if (
      !uiForm ||
      !contactInput ||
      !consentInput ||
      !submitButton ||
      !customerForm ||
      !customerEmail ||
      !customerTags ||
      !customerFirstName ||
      !customerLastName
    ) {
      return;
    }

    const setPending = (pending) => {
      state.pending = pending;
      submitButton.disabled = pending || state.submitted;
      uiForm.setAttribute('aria-busy', String(pending));
    };

    const markSuccess = () => {
      state.submitted = true;
      setPending(false);

      if (successState) {
        successState.hidden = false;
      }

      [nameInput, contactInput, consentInput].forEach((element) => {
        if (element) element.disabled = true;
      });

      if (countryCodeSelect) {
        countryCodeSelect.disabled = true;
      }

      methodButtons.forEach((button) => {
        button.disabled = true;
      });

      phoneChannelButtons.forEach((button) => {
        button.disabled = true;
      });

      submitButton.disabled = true;

      if (statusLive) {
        statusLive.textContent = `${currentCopy().successTitle}. ${currentCopy().successBody}`;
      }
    };

    const submitCustomerForm = async () => {
      const response = await fetch(customerForm.action, {
        method: 'POST',
        body: new FormData(customerForm),
        credentials: 'same-origin',
        headers: {
          Accept: 'text/html',
        },
      });

      const responseText = await response.text();
      const parser = new DOMParser();
      const documentResponse = parser.parseFromString(responseText, 'text/html');
      const marker = documentResponse.querySelector(
        `[data-customer-transport-state="${section.dataset.sectionId}"]`
      );

      if (marker && marker.dataset.state === 'success') {
        return;
      }

      throw new Error('Customer form submission failed');
    };

    const validate = () => {
      clearErrors();
      const localeCopy = currentCopy();
      const contactValue = contactInput.value.trim();
      const phoneValue = `${countryCodeSelect ? countryCodeSelect.value : ''} ${contactValue}`.trim();

      if (state.method === 'email') {
        if (!emailPattern.test(contactValue)) {
          setError(contactError, localeCopy.validation.email);
          return false;
        }
      } else {
        if (!phonePattern.test(phoneValue)) {
          setError(contactError, localeCopy.validation.phone);
          return false;
        }
      }

      if (!consentInput.checked) {
        setError(consentError, localeCopy.validation.consent);
        return false;
      }

      return true;
    };

    const prepareCustomerForm = () => {
      const { firstName, lastName } = splitName(nameInput ? nameInput.value : '');

      customerEmail.value = contactInput.value.trim();
      customerTags.value = `coming-soon,waitlist,language_${state.locale}`;
      customerFirstName.value = firstName;
      customerLastName.value = lastName;
    };

    const handleSubmit = async (event) => {
      event.preventDefault();

      if (state.pending || state.submitted) return;
      if (!validate()) return;

      if (state.method === 'phone') {
        setError(contactError, currentCopy().validation.phoneUnavailable);
        return;
      }

      try {
        setPending(true);
        prepareCustomerForm();
        await submitCustomerForm();
        markSuccess();
      } catch (error) {
        setPending(false);
        setError(generalError, currentCopy().validation.submit);
      }
    };

    methodButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const method = button.dataset.methodButton;
        if (method !== 'email' && method !== 'phone') return;

        state.method = method;
        if (method === 'phone' && !state.phoneChannel) {
          state.phoneChannel = 'sms';
        }
        clearErrors();
        syncMethodCopy();
      });
    });

    phoneChannelButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const phoneChannel = button.dataset.phoneChannelButton;
        if (phoneChannel !== 'sms' && phoneChannel !== 'whatsapp') return;

        state.phoneChannel = phoneChannel;
        clearErrors();
        syncMethodCopy();
      });
    });

    [nameInput, contactInput].forEach((element) => {
      if (!element) return;

      element.addEventListener('input', () => {
        clearErrors();
      });
    });

    if (countryCodeSelect) {
      countryCodeSelect.addEventListener('change', () => {
        clearErrors();
      });
    }

    consentInput.addEventListener('change', () => {
      if (!consentError) return;

      if (consentInput.checked) {
        consentError.textContent = '';
        consentError.hidden = true;
      }
    });

    uiForm.addEventListener('submit', handleSubmit);
  };

  const initAll = (root = document) => {
    root.querySelectorAll('.plennia-coming-soon[data-section-id]').forEach((section) => {
      initSection(section);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAll(), { once: true });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', (event) => {
    const root = event.target instanceof HTMLElement ? event.target : document;
    const section =
      root.matches('.plennia-coming-soon[data-section-id]')
        ? root
        : root.querySelector('.plennia-coming-soon[data-section-id]');

    if (section) {
      initSection(section);
    }
  });
})();
