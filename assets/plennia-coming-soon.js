(() => {
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

    const fallbackCopy = {
      es: {
        countryCodeLabel: 'CODIGO DE PAIS',
        notifyByLabel: 'NOTIFICARME POR *',
        consentPhoneSms: 'Notifícame por SMS',
        consentPhoneWhatsapp: 'Notifícame por WhatsApp',
        successTitle: 'Estas en la lista',
        successBody: 'Estamos deseando que formes parte de nuestra comunidad.',
        validation: {
          phoneUnavailable:
            'La inscripcion por SMS o WhatsApp requiere una integracion adicional de Shopify. Usa correo electronico por ahora.',
        },
      },
      en: {
        countryCodeLabel: 'COUNTRY CODE',
        notifyByLabel: 'NOTIFY ME BY *',
        consentPhoneSms: 'Notify me by SMS',
        consentPhoneWhatsapp: 'Notify me by WhatsApp',
        successTitle: "You're on the list",
        successBody: "We can't wait for you to be part of our community.",
        validation: {
          phoneUnavailable:
            'SMS or WhatsApp waitlist signup needs an additional Shopify app or backend. Please use email for now.',
        },
      },
    };

    const legacySuccessBody = {
      es: 'Te avisaremos cuando lancemos.',
      en: "We'll let you know when we launch.",
    };

    copy = ['es', 'en'].reduce((accumulator, locale) => {
      const localeCopy = copy && typeof copy === 'object' ? copy[locale] || {} : {};

      accumulator[locale] = {
        ...fallbackCopy[locale],
        ...localeCopy,
        validation: {
          ...fallbackCopy[locale].validation,
          ...(localeCopy.validation || {}),
        },
      };

      if (!localeCopy.successBody || localeCopy.successBody === legacySuccessBody[locale]) {
        accumulator[locale].successBody = fallbackCopy[locale].successBody;
      }

      return accumulator;
    }, {});

    const storageKey = 'plennia-coming-soon-locale';
    const defaultLocale = section.dataset.defaultLocale === 'en' ? 'en' : 'es';
    const uiForm = section.querySelector('[data-ui-form]');
    const nameInput = section.querySelector('[data-name-input]');
    let contactRow = section.querySelector('[data-contact-row]');
    const contactInput = section.querySelector('[data-contact-input]');
    let countryCodeWrap = section.querySelector('[data-country-code-wrap]');
    let countryCodeSelect = section.querySelector('[data-country-code-select]');
    let phoneChannelGroup = section.querySelector('[data-phone-channel-group]');
    let phoneChannelButtons = section.querySelectorAll('[data-phone-channel-button]');
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
    let textTargets = section.querySelectorAll('[data-i18n-key]');
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
    const transportFrameId = `PlenniaCustomerTransport-${section.dataset.sectionId}`;
    let pendingTransportSubmission = null;

    const ensureFallbackPhoneStyles = () => {
      if (document.getElementById('plennia-coming-soon-phone-fallback-styles')) {
        return;
      }

      const style = document.createElement('style');
      style.id = 'plennia-coming-soon-phone-fallback-styles';
      style.textContent = `
        .plennia-coming-soon__contact-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 0.7rem;
          align-items: stretch;
        }

        .plennia-coming-soon__contact-row.is-phone {
          grid-template-columns: minmax(6.75rem, 8.5rem) minmax(0, 1fr);
        }

        .plennia-coming-soon__country-code-wrap {
          position: relative;
        }

        .plennia-coming-soon__country-code-wrap::after {
          content: '';
          position: absolute;
          top: 50%;
          right: 1rem;
          width: 0.45rem;
          height: 0.45rem;
          border-right: 1px solid var(--plennia-muted);
          border-bottom: 1px solid var(--plennia-muted);
          pointer-events: none;
          transform: translateY(-65%) rotate(45deg);
        }

        .plennia-coming-soon__select {
          appearance: none;
          width: 100%;
          min-height: 3.55rem;
          border: 1px solid var(--plennia-border);
          border-radius: 8px;
          background: rgb(252 250 246 / 0.52);
          color: var(--plennia-text-soft);
          cursor: pointer;
          font-family: var(--font-body--family);
          font-size: 0.95rem;
          font-weight: 400;
          line-height: 1.45;
          padding: 0.95rem 2rem 0.95rem 1rem;
          transition:
            border-color 150ms ease-in-out,
            background-color 150ms ease-in-out;
        }

        .plennia-coming-soon__select:focus-visible {
          outline: none;
          border-color: var(--plennia-border-focus);
          background: var(--plennia-surface);
        }

        @media screen and (max-width: 479px) {
          .plennia-coming-soon__contact-row.is-phone {
            grid-template-columns: 1fr;
          }
        }
      `;

      document.head.appendChild(style);
    };

    const createPhoneControls = () => {
      if (!contactInput) return;

      const contactFieldGroup = contactInput.closest('.plennia-coming-soon__field-group');
      if (!contactFieldGroup) return;

      if (!contactRow || !countryCodeWrap || !phoneChannelGroup) {
        ensureFallbackPhoneStyles();
      }

      if (!contactRow) {
        contactRow = document.createElement('div');
        contactRow.className = 'plennia-coming-soon__contact-row';
        contactRow.setAttribute('data-contact-row', '');
        contactInput.parentNode.insertBefore(contactRow, contactInput);
        contactRow.appendChild(contactInput);
      }

      if (!countryCodeWrap && contactRow) {
        const localeCopy = copy[defaultLocale] || fallbackCopy[defaultLocale];

        countryCodeWrap = document.createElement('div');
        countryCodeWrap.className = 'plennia-coming-soon__country-code-wrap';
        countryCodeWrap.setAttribute('data-country-code-wrap', '');
        countryCodeWrap.hidden = true;

        const countryCodeLabel = document.createElement('label');
        countryCodeLabel.className = 'visually-hidden';
        countryCodeLabel.htmlFor = `PlenniaCountryCode-${section.dataset.sectionId}`;
        countryCodeLabel.setAttribute('data-i18n-key', 'countryCodeLabel');
        countryCodeLabel.textContent = localeCopy.countryCodeLabel;

        countryCodeSelect = document.createElement('select');
        countryCodeSelect.id = `PlenniaCountryCode-${section.dataset.sectionId}`;
        countryCodeSelect.className = 'plennia-coming-soon__select';
        countryCodeSelect.setAttribute('data-country-code-select', '');
        countryCodeSelect.setAttribute('autocomplete', 'tel-country-code');
        countryCodeSelect.setAttribute('aria-label', localeCopy.countryCodeLabel);

        [
          ['+34', 'ES +34'],
          ['+1', 'US +1'],
          ['+44', 'UK +44'],
          ['+52', 'MX +52'],
          ['+966', 'SA +966'],
          ['+971', 'AE +971'],
        ].forEach(([value, label]) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = label;
          countryCodeSelect.appendChild(option);
        });

        countryCodeWrap.append(countryCodeLabel, countryCodeSelect);
        contactRow.insertBefore(countryCodeWrap, contactInput);
      }

      if (!phoneChannelGroup) {
        const localeCopy = copy[defaultLocale] || fallbackCopy[defaultLocale];

        phoneChannelGroup = document.createElement('div');
        phoneChannelGroup.className = 'plennia-coming-soon__field-group';
        phoneChannelGroup.setAttribute('data-phone-channel-group', '');
        phoneChannelGroup.hidden = true;

        const notifyByLabel = document.createElement('span');
        notifyByLabel.className = 'plennia-coming-soon__label';
        notifyByLabel.setAttribute('data-i18n-key', 'notifyByLabel');
        notifyByLabel.textContent = localeCopy.notifyByLabel;

        const toggle = document.createElement('div');
        toggle.className = 'plennia-coming-soon__method-toggle';
        toggle.setAttribute('role', 'tablist');
        toggle.setAttribute('aria-label', 'Notification channel');

        [
          ['sms', 'SMS'],
          ['whatsapp', 'WHATSAPP'],
        ].forEach(([channel, label]) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'plennia-coming-soon__method-button';
          button.setAttribute('data-phone-channel-button', channel);
          button.setAttribute('aria-pressed', 'false');
          button.textContent = label;
          toggle.appendChild(button);
        });

        phoneChannelGroup.append(notifyByLabel, toggle);
        contactFieldGroup.insertAdjacentElement('afterend', phoneChannelGroup);
      }

      phoneChannelButtons = section.querySelectorAll('[data-phone-channel-button]');
      textTargets = section.querySelectorAll('[data-i18n-key]');
    };

    createPhoneControls();

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
        setHidden(element, true);
      });
    };

    const setError = (element, message) => {
      if (!element) return;

      element.textContent = message;
      setHidden(element, false);
    };

    const setHidden = (element, hidden) => {
      if (!element) return;

      element.hidden = hidden;
      element.style.display = hidden ? 'none' : '';
      element.setAttribute('aria-hidden', String(hidden));
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
        setHidden(countryCodeWrap, !isPhone);
      }

      if (countryCodeSelect) {
        countryCodeSelect.disabled = !isPhone || state.submitted;
        if (localeCopy.countryCodeLabel) {
          countryCodeSelect.setAttribute('aria-label', localeCopy.countryCodeLabel);
        }
      }

      if (phoneChannelGroup) {
        setHidden(phoneChannelGroup, !isPhone);
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
        button.disabled = !isPhone || state.submitted;
        button.tabIndex = !isPhone || state.submitted ? -1 : 0;
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
      clearErrors();

      if (successState) {
        setHidden(successState, false);
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
        statusLive.textContent = [currentCopy().successTitle, currentCopy().successBody].filter(Boolean).join('. ');
      }
    };

    const hasSubmissionErrors = (documentResponse) => {
      if (!documentResponse) return false;

      return Boolean(
        documentResponse.querySelector('[data-customer-transport-state][data-state="error"]') ||
          documentResponse.querySelector('.errors') ||
          documentResponse.querySelector('.form-status-list') ||
          documentResponse.querySelector('[aria-invalid="true"]')
      );
    };

    const ensureTransportFrame = () => {
      let frame = document.getElementById(transportFrameId);

      if (frame instanceof HTMLIFrameElement) {
        return frame;
      }

      frame = document.createElement('iframe');
      frame.id = transportFrameId;
      frame.name = transportFrameId;
      frame.hidden = true;
      frame.tabIndex = -1;
      frame.setAttribute('aria-hidden', 'true');
      frame.style.display = 'none';
      frame.src = 'about:blank';
      section.appendChild(frame);

      return frame;
    };

    const submitCustomerForm = async () => {
      if (pendingTransportSubmission) {
        return pendingTransportSubmission;
      }

      pendingTransportSubmission = new Promise((resolve, reject) => {
        const transportFrame = ensureTransportFrame();
        const originalTarget = customerForm.getAttribute('target');
        let settled = false;

        const cleanup = () => {
          transportFrame.removeEventListener('load', handleLoad);
          window.clearTimeout(timeoutId);
          pendingTransportSubmission = null;

          if (originalTarget == null) {
            customerForm.removeAttribute('target');
          } else {
            customerForm.setAttribute('target', originalTarget);
          }
        };

        const finish = (callback) => {
          if (settled) return;

          settled = true;
          cleanup();
          callback();
        };

        const handleLoad = () => {
          try {
            const frameWindow = transportFrame.contentWindow;
            const frameDocument = transportFrame.contentDocument;
            const frameHref = frameWindow && frameWindow.location ? frameWindow.location.href : '';

            if (!frameDocument || !frameHref || frameHref === 'about:blank') {
              return;
            }

            const marker = frameDocument.querySelector(
              `[data-customer-transport-state="${section.dataset.sectionId}"]`
            );

            if (marker && marker.dataset.state === 'success') {
              finish(resolve);
              return;
            }

            if (hasSubmissionErrors(frameDocument)) {
              finish(() => reject(new Error('Customer form submission failed')));
              return;
            }

            finish(resolve);
          } catch (error) {
            finish(() => reject(new Error('Customer form submission failed')));
          }
        };

        const timeoutId = window.setTimeout(() => {
          finish(() => reject(new Error('Customer form submission timed out')));
        }, 20000);

        transportFrame.addEventListener('load', handleLoad);
        customerForm.setAttribute('target', transportFrame.name);

        if (typeof customerForm.requestSubmit === 'function') {
          customerForm.requestSubmit();
        } else {
          customerForm.submit();
        }
      });

      return pendingTransportSubmission;
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
