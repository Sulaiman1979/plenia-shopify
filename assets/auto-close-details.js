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
    const uiForm =
      section.querySelector('[data-ui-form]') ||
      document.getElementById(`PlenniaCustomerForm-${section.dataset.sectionId}`) ||
      section.querySelector('.plennia-coming-soon__ui-form');
    const nameInput = section.querySelector('[data-name-input]');
    let contactRow = section.querySelector('[data-contact-row]');
    const contactInput = section.querySelector('[data-contact-input]');
    let countryCodeWrap = section.querySelector('[data-country-code-wrap]');
    let countryCodeSelect = section.querySelector('[data-country-code-select]');
    let phoneChannelGroup = section.querySelector('[data-phone-channel-group]');
    let phoneChannelButtons = section.querySelectorAll('[data-phone-channel-button]');
    const submitButton = section.querySelector('[data-submit-button]');
    const fields = section.querySelector('.plennia-coming-soon__fields');
    const successState = section.querySelector('[data-success-state]');
    const statusLive = section.querySelector('[data-status-live]');
    let customerForm =
      uiForm instanceof HTMLFormElement ? uiForm : document.getElementById(`PlenniaCustomerForm-${section.dataset.sectionId}`);
    let customerEmail = section.querySelector('[data-customer-email]');
    let customerTags = section.querySelector('[data-customer-tags]');
    let customerFirstName = section.querySelector('[data-customer-first-name]');
    let customerLastName = section.querySelector('[data-customer-last-name]');
    const contactError = section.querySelector('[data-contact-error]');
    const generalError = section.querySelector('[data-general-error]');
    const serverStateMarker = section.querySelector('[data-customer-transport-state]');
    const localeButtons = section.querySelectorAll('[data-locale-button]');
    const methodButtons = section.querySelectorAll('[data-method-button]');
    let textTargets = section.querySelectorAll('[data-i18n-key]');
    const placeholderTargets = section.querySelectorAll('[data-i18n-placeholder]');
    const animationItems = Array.from(section.querySelectorAll('[data-animation-item]'));

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
    const animationDelayMs = 20000;
    const countryCodeOptions = [
      ['+355', 'AL +355'],
      ['+376', 'AD +376'],
      ['+374', 'AM +374'],
      ['+43', 'AT +43'],
      ['+61', 'AU +61'],
      ['+994', 'AZ +994'],
      ['+973', 'BH +973'],
      ['+32', 'BE +32'],
      ['+359', 'BG +359'],
      ['+387', 'BA +387'],
      ['+55', 'BR +55'],
      ['+1', 'CA +1'],
      ['+385', 'HR +385'],
      ['+357', 'CY +357'],
      ['+420', 'CZ +420'],
      ['+45', 'DK +45'],
      ['+372', 'EE +372'],
      ['+20', 'EG +20'],
      ['+358', 'FI +358'],
      ['+33', 'FR +33'],
      ['+995', 'GE +995'],
      ['+49', 'DE +49'],
      ['+350', 'GI +350'],
      ['+30', 'GR +30'],
      ['+852', 'HK +852'],
      ['+36', 'HU +36'],
      ['+354', 'IS +354'],
      ['+91', 'IN +91'],
      ['+62', 'ID +62'],
      ['+353', 'IE +353'],
      ['+972', 'IL +972'],
      ['+39', 'IT +39'],
      ['+962', 'JO +962'],
      ['+81', 'JP +81'],
      ['+965', 'KW +965'],
      ['+371', 'LV +371'],
      ['+961', 'LB +961'],
      ['+423', 'LI +423'],
      ['+370', 'LT +370'],
      ['+352', 'LU +352'],
      ['+356', 'MT +356'],
      ['+60', 'MY +60'],
      ['+52', 'MX +52'],
      ['+31', 'NL +31'],
      ['+64', 'NZ +64'],
      ['+389', 'MK +389'],
      ['+47', 'NO +47'],
      ['+968', 'OM +968'],
      ['+92', 'PK +92'],
      ['+63', 'PH +63'],
      ['+48', 'PL +48'],
      ['+351', 'PT +351'],
      ['+974', 'QA +974'],
      ['+40', 'RO +40'],
      ['+966', 'SA +966'],
      ['+381', 'RS +381'],
      ['+65', 'SG +65'],
      ['+421', 'SK +421'],
      ['+386', 'SI +386'],
      ['+27', 'ZA +27'],
      ['+82', 'KR +82'],
      ['+34', 'ES +34'],
      ['+46', 'SE +46'],
      ['+41', 'CH +41'],
      ['+66', 'TH +66'],
      ['+90', 'TR +90'],
      ['+380', 'UA +380'],
      ['+971', 'AE +971'],
      ['+44', 'UK +44'],
      ['+1', 'US +1'],
      ['+84', 'VN +84'],
    ];
    const animationInfoCache = new Map();
    let pendingResetTimeout = null;
    let animationSequenceStarted = false;

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
          font-size: 1.14rem;
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

        countryCodeOptions.forEach(([value, label]) => {
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

    const syncCountryCodeOptions = () => {
      if (!(countryCodeSelect instanceof HTMLSelectElement)) {
        return;
      }

      const currentOptions = Array.from(countryCodeSelect.options).map(
        (option) => `${option.value}|${option.textContent || ''}`
      );
      const expectedOptions = countryCodeOptions.map(([value, label]) => `${value}|${label}`);

      if (
        currentOptions.length === expectedOptions.length &&
        currentOptions.every((option, index) => option === expectedOptions[index])
      ) {
        return;
      }

      const selectedValue = countryCodeSelect.value;
      const nextValue = countryCodeOptions.some(([value]) => value === selectedValue)
        ? selectedValue
        : '+966';

      countryCodeSelect.textContent = '';

      countryCodeOptions.forEach(([value, label]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        countryCodeSelect.appendChild(option);
      });

      countryCodeSelect.value = nextValue;
    };

    syncCountryCodeOptions();

    const wait = (durationMs) =>
      new Promise((resolve) => {
        window.setTimeout(resolve, durationMs);
      });

    const readChunkId = (view, offset) => {
      if (offset + 4 > view.byteLength) return '';

      return String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
    };

    const parseGifDuration = (arrayBuffer) => {
      const bytes = new Uint8Array(arrayBuffer);

      if (bytes.length < 13) {
        return null;
      }

      const header = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5]);

      if (header !== 'GIF87a' && header !== 'GIF89a') {
        return null;
      }

      let offset = 13;
      let totalDurationMs = 0;
      let frameCount = 0;

      if ((bytes[10] & 0x80) !== 0) {
        offset += 3 * (1 << ((bytes[10] & 0x07) + 1));
      }

      while (offset < bytes.length) {
        const blockId = bytes[offset];

        if (blockId === 0x3b) {
          break;
        }

        if (blockId === 0x21) {
          const label = bytes[offset + 1];

          if (label === 0xf9 && bytes[offset + 2] === 0x04 && offset + 7 < bytes.length) {
            let frameDurationMs = (bytes[offset + 4] | (bytes[offset + 5] << 8)) * 10;

            if (frameDurationMs <= 0) {
              frameDurationMs = 100;
            }

            totalDurationMs += frameDurationMs;
            frameCount += 1;
          }

          offset += 2;

          while (offset < bytes.length) {
            const subBlockSize = bytes[offset];
            offset += 1;

            if (subBlockSize === 0) {
              break;
            }

            offset += subBlockSize;
          }

          continue;
        }

        if (blockId === 0x2c) {
          if (offset + 9 >= bytes.length) {
            break;
          }

          const packed = bytes[offset + 9];
          offset += 10;

          if ((packed & 0x80) !== 0) {
            offset += 3 * (1 << ((packed & 0x07) + 1));
          }

          offset += 1;

          while (offset < bytes.length) {
            const subBlockSize = bytes[offset];
            offset += 1;

            if (subBlockSize === 0) {
              break;
            }

            offset += subBlockSize;
          }

          continue;
        }

        break;
      }

      return frameCount > 0 ? totalDurationMs : null;
    };

    const parseAnimatedWebPDuration = (arrayBuffer) => {
      const view = new DataView(arrayBuffer);

      if (view.byteLength < 16 || readChunkId(view, 0) !== 'RIFF' || readChunkId(view, 8) !== 'WEBP') {
        return null;
      }

      let offset = 12;
      let totalDurationMs = 0;
      let frameCount = 0;

      while (offset + 8 <= view.byteLength) {
        const chunkId = readChunkId(view, offset);
        const chunkSize = view.getUint32(offset + 4, true);
        const chunkDataOffset = offset + 8;

        if (chunkDataOffset + chunkSize > view.byteLength) {
          break;
        }

        if (chunkId === 'ANMF' && chunkSize >= 16) {
          let frameDurationMs =
            view.getUint8(chunkDataOffset + 12) |
            (view.getUint8(chunkDataOffset + 13) << 8) |
            (view.getUint8(chunkDataOffset + 14) << 16);

          if (frameDurationMs <= 0) {
            frameDurationMs = 100;
          }

          totalDurationMs += frameDurationMs;
          frameCount += 1;
        }

        offset = chunkDataOffset + chunkSize + (chunkSize % 2);
      }

      return frameCount > 0 ? totalDurationMs : null;
    };

    const parseAnimationDuration = (arrayBuffer, contentType = '') => {
      const normalizedContentType = contentType.toLowerCase();

      if (normalizedContentType.includes('gif')) {
        return parseGifDuration(arrayBuffer);
      }

      if (normalizedContentType.includes('webp')) {
        return parseAnimatedWebPDuration(arrayBuffer);
      }

      return parseAnimatedWebPDuration(arrayBuffer) || parseGifDuration(arrayBuffer);
    };

    const loadAnimationInfo = async (src) => {
      if (!src) return null;

      if (!animationInfoCache.has(src)) {
        const infoPromise = fetch(src, { credentials: 'same-origin' })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Animation request failed: ${response.status}`);
            }

            return response.arrayBuffer().then((arrayBuffer) => ({
              arrayBuffer,
              contentType: response.headers.get('content-type') || '',
            }));
          })
          .then(({ arrayBuffer, contentType }) => {
            const durationMs = parseAnimationDuration(arrayBuffer, contentType);

            if (!durationMs) {
              throw new Error('Animation duration could not be detected');
            }

            const blob = new Blob([arrayBuffer], { type: contentType || 'application/octet-stream' });

            return {
              blobUrl: URL.createObjectURL(blob),
              durationMs,
            };
          })
          .catch(() => null);

        animationInfoCache.set(src, infoPromise);
      }

      return animationInfoCache.get(src);
    };

    const waitForImageReady = (image) =>
      new Promise((resolve) => {
        if (image.complete && image.naturalWidth > 0) {
          resolve();
          return;
        }

        const finish = () => {
          image.removeEventListener('load', finish);
          image.removeEventListener('error', finish);
          resolve();
        };

        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });
      });

    const playAnimationItem = async (item) => {
      if (!(item instanceof HTMLElement)) return;

      const src = item.dataset.animationSrc;
      const info = await loadAnimationInfo(src);

      if (!info || !info.blobUrl || !info.durationMs) {
        return;
      }

      const image = new Image();
      image.alt = '';
      image.className = 'plennia-coming-soon__animation-frame';
      image.decoding = 'async';
      image.loading = 'eager';

      item.replaceChildren(image);
      item.hidden = false;
      image.src = info.blobUrl;

      await waitForImageReady(image);

      if (!image.naturalWidth) {
        item.hidden = true;
        item.replaceChildren();
        return;
      }

      await wait(info.durationMs);

      item.hidden = true;
      item.replaceChildren();
    };

    const startAnimationSequence = () => {
      if (animationSequenceStarted || !animationItems.length) {
        return;
      }

      animationSequenceStarted = true;

      animationItems.forEach((item) => {
        void loadAnimationInfo(item.dataset.animationSrc);
      });

      void (async () => {
        while (section.isConnected) {
          for (const item of animationItems) {
            await wait(animationDelayMs);

            if (!section.isConnected) {
              return;
            }

            await playAnimationItem(item);
          }
        }
      })();
    };

    window.addEventListener(
      'pagehide',
      () => {
        animationInfoCache.forEach((infoPromise) => {
          Promise.resolve(infoPromise).then((info) => {
            if (info && info.blobUrl) {
              URL.revokeObjectURL(info.blobUrl);
            }
          });
        });
      },
      { once: true }
    );

    const ensureCustomerField = (name, dataAttribute, value = '') => {
      if (!(customerForm instanceof HTMLFormElement)) {
        return null;
      }

      let field = customerForm.querySelector(`[name="${name}"]`);

      if (!(field instanceof HTMLInputElement)) {
        field = document.createElement('input');
        field.type = 'hidden';
        field.name = name;
        customerForm.appendChild(field);
      }

      if (dataAttribute) {
        field.setAttribute(dataAttribute, '');
      }

      if (value && !field.value) {
        field.value = value;
      }

      return field;
    };

    const ensureCustomerFormSetup = () => {
      if (!(uiForm instanceof HTMLFormElement)) {
        return;
      }

      customerForm = uiForm;
      customerForm.id = `PlenniaCustomerForm-${section.dataset.sectionId}`;
      customerForm.method = 'post';
      customerForm.action = `/contact#${customerForm.id}`;
      customerForm.acceptCharset = 'UTF-8';
      customerForm.setAttribute('novalidate', 'novalidate');
      customerForm.removeAttribute('target');

      ensureCustomerField('form_type', null, 'customer');
      ensureCustomerField('utf8', null, '?');

      customerEmail = ensureCustomerField('contact[email]', 'data-customer-email');
      customerTags = ensureCustomerField('contact[tags]', 'data-customer-tags');
      customerFirstName = ensureCustomerField('contact[first_name]', 'data-customer-first-name');
      customerLastName = ensureCustomerField('contact[last_name]', 'data-customer-last-name');
    };

    ensureCustomerFormSetup();

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
      [contactError, generalError].forEach((element) => {
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

      if (generalError && generalError.dataset.serverError === 'true') {
        generalError.textContent = localeCopy.validation.submit;
        setHidden(generalError, false);
      }

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
    startAnimationSequence();

    if (
      !uiForm ||
      !contactInput ||
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

      if (!pending && pendingResetTimeout) {
        window.clearTimeout(pendingResetTimeout);
        pendingResetTimeout = null;
      }
    };

    const markSuccess = () => {
      state.submitted = true;
      setPending(false);
      clearErrors();

      if (fields) {
        setHidden(fields, true);
      }

      if (successState) {
        setHidden(successState, false);
      }

      [nameInput, contactInput].forEach((element) => {
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

    const serverState = serverStateMarker ? serverStateMarker.dataset.state : 'idle';

    if (serverState === 'success' || (successState && !successState.hidden)) {
      markSuccess();
    } else if (serverState === 'error' || (generalError && generalError.dataset.serverError === 'true')) {
      setError(generalError, currentCopy().validation.submit);
    }

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

      return true;
    };

    const prepareCustomerForm = () => {
      const { firstName, lastName } = splitName(nameInput ? nameInput.value : '');

      customerEmail.value = contactInput.value.trim();
      customerTags.value = `coming-soon,waitlist,language_${state.locale}`;
      customerFirstName.value = firstName;
      customerLastName.value = lastName;
    };

    const handleSubmit = (event) => {
      if (state.pending || state.submitted) {
        event.preventDefault();
        return;
      }

      if (!validate()) {
        event.preventDefault();
        return;
      }

      if (state.method === 'phone') {
        event.preventDefault();
        setError(contactError, currentCopy().validation.phoneUnavailable);
        return;
      }

      ensureCustomerFormSetup();
      setPending(true);
      prepareCustomerForm();
      pendingResetTimeout = window.setTimeout(() => {
        if (!state.submitted) {
          setPending(false);
        }
      }, 30000);
    };

    methodButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const method = button.dataset.methodButton;
        if (method !== 'email' && method !== 'phone') return;
        if (method === state.method) return;

        state.method = method;
        if (contactInput) {
          contactInput.value = '';
        }
        if (method === 'phone' && countryCodeSelect && !countryCodeSelect.value) {
          countryCodeSelect.value = '+966';
        }
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
