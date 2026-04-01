(function () {
  const STORAGE_KEYS = {
    quiz: 'plennia:quiz',
    pets: 'plennia:pets',
    activePet: 'plennia:active-pet',
    pendingPetProfile: 'plennia:pending-pet-profile',
    quizContext: 'plennia:quiz-context',
  };

  const GOAL_TAG_MAP = {
    none: ['goal_general'],
    skin_coat: ['goal_skin_coat', 'support_skin_coat'],
    joints_mobility: ['goal_joints', 'support_joint_health'],
    dental_oral: ['goal_dental', 'support_dental'],
    weight_control: ['goal_weight', 'support_weight_management'],
  };

  const HEALTH_TAG_MAP = {
    none: ['goal_general'],
    skin_hair: ['support_skin_coat', 'goal_skin_coat'],
    dental_oral: ['support_dental', 'goal_dental'],
    diabetes: ['support_weight_management', 'goal_weight'],
    allergies: ['support_sensitive_digestion', 'support_digestive'],
    joint_problems: ['support_joint_health', 'goal_joints'],
    sensitive_digestion: ['support_sensitive_digestion', 'support_digestive'],
    heart_problems: ['goal_general'],
    cancer: ['goal_general'],
    obesity: ['support_weight_management', 'goal_weight'],
    ear_infection: ['support_skin_coat'],
    shedding: ['support_skin_coat'],
    trouble_breathing: ['goal_general'],
    urinary_infection: ['support_urinary'],
  };

  const BODY_TAG_MAP = {
    underweight: 'body_underweight',
    ideal: 'body_ideal',
    overweight: 'body_overweight',
  };

  const ACTIVITY_TAG_MAP = {
    low: 'activity_low',
    medium: 'activity_medium',
    high: 'activity_high',
  };

  const FOOD_TAG_MAP = {
    dry: 'format_dry',
    wet: 'format_wet',
    treats: 'format_treat',
  };

  const ALLERGY_TAG_MAP = {
    beef: 'protein_beef',
    fish: 'protein_fish',
    chicken: 'protein_chicken',
    turkey: 'protein_turkey',
    pork: 'protein_pork',
  };

  const FRIENDLY_LABELS = {
    pet_dog: 'Dog match',
    pet_cat: 'Cat match',
    goal_skin_coat: 'Skin and coat',
    goal_joints: 'Joints and mobility',
    goal_dental: 'Dental support',
    goal_weight: 'Weight support',
    goal_general: 'General wellbeing',
    support_sensitive_digestion: 'Sensitive digestion',
    support_skin_coat: 'Skin support',
    support_joint_health: 'Joint support',
    support_urinary: 'Urinary support',
    support_weight_management: 'Weight management',
    support_dental: 'Dental care',
    support_digestive: 'Digestive support',
    body_underweight: 'Underweight support',
    body_ideal: 'Ideal condition',
    body_overweight: 'Overweight support',
    activity_low: 'Low activity',
    activity_medium: 'Medium activity',
    activity_high: 'High activity',
    life_puppy: 'Puppy life stage',
    life_kitten: 'Kitten life stage',
    life_adult: 'Adult life stage',
    life_senior: 'Senior life stage',
    quiz_priority_high: 'High quiz priority',
    quiz_priority_medium: 'Medium quiz priority',
    bestseller: 'Best seller',
    hero_product: 'Hero product',
  };

  const PRODUCT_DATA_SELECTORS = [
    '[data-plennia-dashboard-products]',
    '[data-plennia-plan-products]',
    '[data-plennia-recommendation-products]',
    '[data-plennia-quiz-products]',
  ];

  const PRODUCT_FETCH_LIMIT = 250;
  const productCollectionCache = new Map();

  function getThemeConfig() {
    return window.PlenniaThemeConfig || {};
  }

  function getPlanUrl() {
    return String(getThemeConfig().planUrl || '/pages/plan').trim() || '/pages/plan';
  }

  function getPetUrl() {
    return String(getThemeConfig().petUrl || '/pages/pet').trim() || '/pages/pet';
  }

  function getAccountUrl() {
    return String(getThemeConfig().accountUrl || '/account').trim() || '/account';
  }

  function getCustomerPetsEndpoint() {
    return String(getThemeConfig().customerPetsEndpoint || '').trim();
  }

  function hasCustomerPetsEndpoint() {
    return Boolean(getCustomerPetsEndpoint());
  }

  function customerPetsStorageMessage() {
    if (hasCustomerPetsEndpoint()) {
      return 'Pet profiles save in this browser now and can sync to Shopify customer data through the configured storefront endpoint.';
    }

    return 'Pet profiles save in this browser right now. To persist them in Shopify customer metafields or metaobjects across devices, connect an app proxy endpoint in Theme settings.';
  }

  function parseJSON(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function readStorage(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value ? parseJSON(value, fallback) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      return;
    }
  }

  function removeStorage(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      return;
    }
  }

  function arrayify(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (value === undefined || value === null || value === '') return [];
    return [value];
  }

  function uniq(items) {
    return [...new Set(arrayify(items).flat().filter(Boolean))];
  }

  function normalizeChoiceList(items) {
    const normalized = uniq(items).map((item) => String(item).trim()).filter(Boolean);

    if (normalized.length > 1) {
      return normalized.filter((item) => item !== 'none');
    }

    return normalized;
  }

  function capitalize(value) {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function stripHtml(value) {
    return String(value || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeProductTags(tags) {
    if (Array.isArray(tags)) return tags.map((tag) => String(tag).trim()).filter(Boolean);

    return String(tags || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function normalizeAjaxProduct(product) {
    if (!product || typeof product !== 'object') return null;

    const variants = arrayify(product.variants);
    const preferredVariant = variants.find((variant) => variant && variant.available) || variants[0] || {};
    const productPrice = Number(preferredVariant.price || product.price || 0);
    const compareAtPrice = Number(preferredVariant.compare_at_price || product.compare_at_price || 0);
    const productImage =
      product.featured_image ||
      product.image?.src ||
      (Array.isArray(product.images) && product.images[0] && product.images[0].src) ||
      '';

    return {
      id: product.id,
      title: product.title || 'Untitled product',
      url: product.url || (product.handle ? `/products/${product.handle}` : '#'),
      tags: normalizeProductTags(product.tags),
      price: Math.round(productPrice * 100),
      compare_at_price: compareAtPrice ? Math.round(compareAtPrice * 100) : null,
      description: stripHtml(product.body_html || product.description || '').split(/\s+/).slice(0, 20).join(' '),
      featured_image: productImage,
      variant_id: preferredVariant.id || null,
      available: preferredVariant.available !== false,
    };
  }

  function iconForPetType(type) {
    return type === 'cat' ? 'CAT' : 'DOG';
  }

  function formatMoney(cents, currencyCode) {
    const amount = Number(cents || 0) / 100;

    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currencyCode || 'USD',
      }).format(amount);
    } catch (error) {
      return `${amount.toFixed(2)} ${currencyCode || 'USD'}`;
    }
  }

  function readJSONScript(scope, selector, fallback) {
    const node = scope.querySelector(selector);
    if (!node) return fallback;
    return parseJSON(node.textContent, fallback);
  }

  function getProductsFromScripts(scope = document) {
    for (const selector of PRODUCT_DATA_SELECTORS) {
      const products = readJSONScript(scope, selector, null);
      if (Array.isArray(products) && products.length) return products;
    }

    return [];
  }

  function buildCollectionProductsUrl(handle, page) {
    const collectionHandle = String(handle || 'all').trim() || 'all';
    const pathname =
      collectionHandle === 'all'
        ? '/products.json'
        : `/collections/${encodeURIComponent(collectionHandle)}/products.json`;
    const url = new URL(pathname, window.location.origin);
    url.searchParams.set('limit', String(PRODUCT_FETCH_LIMIT));
    url.searchParams.set('page', String(page));
    return url.toString();
  }

  function fetchCollectionProducts(handle) {
    const collectionHandle = String(handle || 'all').trim() || 'all';

    if (!productCollectionCache.has(collectionHandle)) {
      const request = (async () => {
        const products = [];
        let page = 1;

        while (page <= 20) {
          const response = await fetch(buildCollectionProductsUrl(collectionHandle, page), {
            headers: { Accept: 'application/json' },
          });
          if (!response.ok) throw new Error('Unable to fetch collection products');

          const payload = await response.json();
          const batch = arrayify(payload.products).map(normalizeAjaxProduct).filter(Boolean);
          products.push(...batch);

          if (batch.length < PRODUCT_FETCH_LIMIT) break;
          page += 1;
        }

        return products;
      })().catch((error) => {
        productCollectionCache.delete(collectionHandle);
        throw error;
      });

      productCollectionCache.set(collectionHandle, request);
    }

    return productCollectionCache.get(collectionHandle);
  }

  function getQuizContext() {
    return readStorage(STORAGE_KEYS.quizContext, {});
  }

  function setQuizContext(context) {
    writeStorage(STORAGE_KEYS.quizContext, context || {});
  }

  function clearQuizContext() {
    removeStorage(STORAGE_KEYS.quizContext);
  }

  function setDisclosureState(details) {
    if (!details) return;
    const summary = details.querySelector('summary');
    if (!summary) return;
    summary.setAttribute('aria-expanded', details.hasAttribute('open') ? 'true' : 'false');
  }

  function syncHeaderHeight(wrapper) {
    if (!wrapper) return;
    const headerHeight = Math.round(wrapper.getBoundingClientRect().height);
    if (!headerHeight) return;
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    document.documentElement.style.setProperty('--plennia-header-height', `${headerHeight}px`);
  }

  function syncAnnouncementHeight() {
    const announcement = document.querySelector('.plennia-announcement-bar');
    const announcementHeight = announcement ? Math.round(announcement.getBoundingClientRect().height) : 0;
    document.documentElement.style.setProperty('--plennia-announcement-height', `${announcementHeight}px`);
    return announcementHeight;
  }

  function initPlenniaHeader() {
    const header = document.querySelector('[data-plennia-header]');
    if (!header || header.dataset.plenniaHeaderInitialized === 'true') return;

    header.dataset.plenniaHeaderInitialized = 'true';

    const wrapper = header.closest('.plennia-header-wrapper');
    const disclosures = Array.from(
      header.querySelectorAll('.plennia-header__desktop-details, .plennia-header__mobile-drawer')
    );

    const closeDisclosures = (activeDisclosure) => {
      disclosures.forEach((details) => {
        if (activeDisclosure && details === activeDisclosure) return;
        if (details.hasAttribute('open')) {
          details.removeAttribute('open');
        }
        setDisclosureState(details);
      });
    };

    disclosures.forEach((details) => {
      setDisclosureState(details);
      details.addEventListener('toggle', () => {
        setDisclosureState(details);
        if (details.hasAttribute('open')) {
          closeDisclosures(details);
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (!header.contains(event.target)) {
        closeDisclosures();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeDisclosures();
      }
    });

    if (wrapper) {
      const updateScrollState = () => {
        const forceScrolled = !document.body.classList.contains('template-index');
        const isScrolled = forceScrolled || window.scrollY > 20;
        const announcementHeight = Number.parseInt(
          getComputedStyle(document.documentElement).getPropertyValue('--plennia-announcement-height'),
          10
        ) || 0;
        const headerTop = Math.max(announcementHeight - window.scrollY, 0);

        document.documentElement.style.setProperty('--plennia-header-top', `${headerTop}px`);
        wrapper.classList.toggle('is-scrolled', isScrolled);
        wrapper.classList.toggle('scrolled', isScrolled);
      };

      const syncStickyHeader = () => {
        const announcementHeight = syncAnnouncementHeight();
        syncHeaderHeight(wrapper);
        const headerHeight = Math.round(wrapper.getBoundingClientRect().height) || 0;
        document.documentElement.style.setProperty(
          '--plennia-header-offset',
          `${announcementHeight + headerHeight}px`
        );
        updateScrollState();
      };

      syncStickyHeader();
      window.addEventListener('resize', syncStickyHeader);
      window.addEventListener('scroll', updateScrollState, { passive: true });
    }
  }

  function buildLifeStage(state) {
    const age = Number(state.age);
    if (Number.isNaN(age)) return '';
    if (state.petType === 'dog' && age < 1) return 'life_puppy';
    if (state.petType === 'cat' && age < 1) return 'life_kitten';
    if (age >= 7) return 'life_senior';
    return 'life_adult';
  }

  function deriveTagIntent(state) {
    const desired = [];
    const exclusions = [];

    if (state.petType === 'dog') desired.push('pet_dog');
    if (state.petType === 'cat') desired.push('pet_cat');

    const lifeStage = buildLifeStage(state);
    if (lifeStage) desired.push(lifeStage);
    if (BODY_TAG_MAP[state.bodyCondition]) desired.push(BODY_TAG_MAP[state.bodyCondition]);
    if (ACTIVITY_TAG_MAP[state.activityLevel]) desired.push(ACTIVITY_TAG_MAP[state.activityLevel]);

    arrayify(state.currentFood).forEach((item) => {
      if (FOOD_TAG_MAP[item]) desired.push(FOOD_TAG_MAP[item]);
    });

    arrayify(state.goals).forEach((goal) => {
      desired.push(...(GOAL_TAG_MAP[goal] || []));
    });

    arrayify(state.healthProblems).forEach((healthItem) => {
      desired.push(...(HEALTH_TAG_MAP[healthItem] || []));
    });

    arrayify(state.allergies).forEach((allergy) => {
      if (ALLERGY_TAG_MAP[allergy]) exclusions.push(ALLERGY_TAG_MAP[allergy]);
    });

    return { desired: uniq(desired), exclusions: uniq(exclusions) };
  }

  function inferFormat(tags) {
    if (tags.includes('format_dry')) return 'dry';
    if (tags.includes('format_wet')) return 'wet';
    if (tags.includes('format_treat')) return 'treat';
    if (tags.includes('format_booster')) return 'booster';
    return 'other';
  }

  function tagToLabel(tag) {
    return FRIENDLY_LABELS[tag] || tag.replace(/_/g, ' ');
  }

  function normalizeQuizState(state) {
    return {
      petType: state.petType || state.pet_type || '',
      petName: state.petName || state.pet_name || '',
      sex: state.sex || '',
      age: state.age || '',
      breed: state.breed || '',
      neuteredStatus: state.neuteredStatus || state.neutered_status || '',
      weight: state.weight || '',
      bodyCondition: state.bodyCondition || state.body_condition || '',
      activityLevel: state.activityLevel || state.activity_level || '',
      currentFood: normalizeChoiceList(state.currentFood || state.current_food || []),
      healthProblems: normalizeChoiceList(state.healthProblems || state.health_problems || []),
      allergies: normalizeChoiceList(state.allergies || []),
      goals: normalizeChoiceList(state.goals || []),
      email: state.email || '',
    };
  }

  function buildQuizStateFromPetProfile(profile) {
    const normalizedProfile = normalizePetProfile(profile);
    if (!normalizedProfile) return normalizeQuizState({});

    return normalizeQuizState({
      ...(normalizedProfile.savedQuizAnswers || {}),
      pet_type: normalizedProfile.type,
      pet_name: normalizedProfile.name,
      sex: normalizedProfile.sex,
      age: normalizedProfile.age,
      breed: normalizedProfile.breed,
      neutered_status: normalizedProfile.neuteredStatus,
      weight: normalizedProfile.weight,
      allergies: normalizedProfile.allergies,
      health_problems: normalizedProfile.healthProblems,
      goals: normalizedProfile.goals,
    });
  }

  function parseCommaList(value) {
    return normalizeChoiceList(
      String(value || '')
        .split(',')
        .map((item) =>
          item
            .trim()
            .toLowerCase()
            .replace(/[^\w\s/+-]+/g, '')
            .replace(/[\/+\s-]+/g, '_')
            .replace(/^_+|_+$/g, '')
        )
        .filter(Boolean)
    );
  }

  function listToInputValue(items) {
    return arrayify(items)
      .map((item) => String(item).replace(/_/g, ' '))
      .join(', ');
  }

  function getQuizState(storageKey) {
    return normalizeQuizState(readStorage(storageKey || STORAGE_KEYS.quiz, {}));
  }

  function setQuizState(nextState, storageKey) {
    writeStorage(storageKey || STORAGE_KEYS.quiz, nextState);
    document.dispatchEvent(new CustomEvent('plennia:quiz:updated', { detail: { state: nextState } }));
  }

  function scoreProduct(product, state) {
    if (!product || !product.tags || !state.petType) return null;

    const tags = product.tags;
    const { exclusions } = deriveTagIntent(state);
    if (state.petType === 'dog' && !tags.includes('pet_dog')) return null;
    if (state.petType === 'cat' && !tags.includes('pet_cat')) return null;
    if (exclusions.some((tag) => tags.includes(tag))) return null;

    let score = 0;
    const reasons = [];

    if (state.petType === 'dog' && tags.includes('pet_dog')) {
      score += 50;
      reasons.push('Dog match');
    }

    if (state.petType === 'cat' && tags.includes('pet_cat')) {
      score += 50;
      reasons.push('Cat match');
    }

    arrayify(state.goals).forEach((goal) => {
      const matched = (GOAL_TAG_MAP[goal] || []).find((tag) => tags.includes(tag));
      if (matched) {
        score += 25;
        reasons.push(tagToLabel(matched));
      }
    });

    arrayify(state.healthProblems).forEach((healthItem) => {
      const matched = (HEALTH_TAG_MAP[healthItem] || []).find((tag) => tags.includes(tag));
      if (matched) {
        score += 20;
        reasons.push(tagToLabel(matched));
      }
    });

    const lifeStage = buildLifeStage(state);
    if (lifeStage && tags.includes(lifeStage)) {
      score += 15;
      reasons.push(tagToLabel(lifeStage));
    }

    if (BODY_TAG_MAP[state.bodyCondition] && tags.includes(BODY_TAG_MAP[state.bodyCondition])) {
      score += 15;
      reasons.push(tagToLabel(BODY_TAG_MAP[state.bodyCondition]));
    }

    if (ACTIVITY_TAG_MAP[state.activityLevel] && tags.includes(ACTIVITY_TAG_MAP[state.activityLevel])) {
      score += 10;
      reasons.push(tagToLabel(ACTIVITY_TAG_MAP[state.activityLevel]));
    }

    if (tags.includes('quiz_priority_high')) {
      score += 20;
      reasons.push(tagToLabel('quiz_priority_high'));
    } else if (tags.includes('quiz_priority_medium')) {
      score += 10;
      reasons.push(tagToLabel('quiz_priority_medium'));
    }

    if (tags.includes('hero_product')) {
      score += 15;
      reasons.push(tagToLabel('hero_product'));
    }

    if (tags.includes('bestseller')) {
      score += 10;
      reasons.push(tagToLabel('bestseller'));
    }

    return {
      ...product,
      score,
      reasons: uniq(reasons).slice(0, 3),
      format: inferFormat(tags),
    };
  }

  function groupRecommendations(products) {
    const groups = { dry: [], wet: [], treat: [], booster: [] };
    products.forEach((product) => {
      if (groups[product.format]) groups[product.format].push(product);
    });
    return groups;
  }

  function buildSummaryChips(state) {
    const chips = [];
    if (state.petType) chips.push(capitalize(state.petType));
    if (state.petName) chips.push(state.petName);
    if (state.breed) chips.push(state.breed);
    if (state.weight) chips.push(`${state.weight} kg`);
    if (state.bodyCondition) chips.push(capitalize(state.bodyCondition));
    if (state.activityLevel) chips.push(`${capitalize(state.activityLevel)} activity`);
    arrayify(state.healthProblems).forEach((item) => chips.push(capitalize(item.replace(/_/g, ' '))));
    arrayify(state.goals).forEach((item) => chips.push(capitalize(item.replace(/_/g, ' '))));
    return uniq(chips);
  }

  function serializePlanGroups(groups) {
    return Object.entries(groups || {}).reduce((result, [format, products]) => {
      result[format] = arrayify(products)
        .slice(0, 3)
        .map((product) => ({
          id: product.id,
          title: product.title,
          url: product.url,
          price: product.price,
          featured_image: product.featured_image,
          variant_id: product.variant_id,
          score: product.score,
          reasons: arrayify(product.reasons),
          format: product.format,
          tags: arrayify(product.tags),
        }));
      return result;
    }, {});
  }

  function buildSavedPlan(state, products) {
    const normalizedState = normalizeQuizState(state);
    const scored = arrayify(products)
      .map((product) => scoreProduct(product, normalizedState))
      .filter(Boolean)
      .sort((first, second) => second.score - first.score);
    const groups = groupRecommendations(scored);
    const copy = buildPlanResultsCopy(normalizedState);

    return {
      savedAt: new Date().toISOString(),
      title: copy.title,
      body: copy.body,
      chips: buildSummaryChips(normalizedState),
      groups: serializePlanGroups(groups),
    };
  }

  function normalizePetProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;

    const savedQuizAnswers = profile.savedQuizAnswers ? normalizeQuizState(profile.savedQuizAnswers) : null;
    const normalizedProfile = {
      id: profile.id || `pet-${Date.now()}`,
      name: profile.name || profile.petName || savedQuizAnswers?.petName || 'New pet',
      type: profile.type || profile.petType || savedQuizAnswers?.petType || 'dog',
      sex: profile.sex || savedQuizAnswers?.sex || '',
      age: profile.age || savedQuizAnswers?.age || '',
      breed: profile.breed || savedQuizAnswers?.breed || '',
      weight: profile.weight || savedQuizAnswers?.weight || '',
      neuteredStatus:
        profile.neuteredStatus || profile.neutered_status || savedQuizAnswers?.neuteredStatus || '',
      allergies: normalizeChoiceList(profile.allergies || savedQuizAnswers?.allergies || []),
      healthProblems: normalizeChoiceList(profile.healthProblems || savedQuizAnswers?.healthProblems || []),
      goals: normalizeChoiceList(profile.goals || savedQuizAnswers?.goals || []),
      savedQuizAnswers,
      savedRecommendedPlan: profile.savedRecommendedPlan || null,
      createdAt: profile.createdAt || new Date().toISOString(),
      updatedAt: profile.updatedAt || new Date().toISOString(),
    };

    return normalizedProfile;
  }

  function normalizePetProfiles(profiles) {
    return arrayify(profiles).map(normalizePetProfile).filter(Boolean);
  }

  function buildPetProfileFromQuiz(state, products, overrides = {}) {
    const normalizedState = normalizeQuizState(state);
    const timestamp = new Date().toISOString();

    return normalizePetProfile({
      id: overrides.id || `pet-${Date.now()}`,
      name: overrides.name || normalizedState.petName || 'New pet',
      type: overrides.type || normalizedState.petType || 'dog',
      sex: overrides.sex || normalizedState.sex || '',
      age: overrides.age || normalizedState.age || '',
      breed: overrides.breed || normalizedState.breed || '',
      weight: overrides.weight || normalizedState.weight || '',
      neuteredStatus: overrides.neuteredStatus || normalizedState.neuteredStatus || '',
      allergies: overrides.allergies || normalizedState.allergies || [],
      healthProblems: overrides.healthProblems || normalizedState.healthProblems || [],
      goals: overrides.goals || normalizedState.goals || [],
      savedQuizAnswers: normalizedState,
      savedRecommendedPlan: buildSavedPlan(normalizedState, products),
      createdAt: overrides.createdAt || timestamp,
      updatedAt: timestamp,
    });
  }

  function currentCustomerIdFromDocument() {
    const accountNode = document.querySelector('[data-customer-id]');
    return accountNode ? accountNode.dataset.customerId : '';
  }

  function upsertPetProfile(profiles, profile) {
    const pets = normalizePetProfiles(profiles);
    const nextProfile = normalizePetProfile(profile);
    if (!nextProfile) return pets;

    const existingIndex = pets.findIndex((pet) => pet.id === nextProfile.id);
    if (existingIndex >= 0) {
      pets[existingIndex] = nextProfile;
    } else {
      pets.push(nextProfile);
    }

    return pets;
  }

  function getPetStorageKeys(customerId) {
    return {
      pets: `${STORAGE_KEYS.pets}:${customerId || 'guest'}`,
      activePet: `${STORAGE_KEYS.activePet}:${customerId || 'guest'}`,
    };
  }

  function readCustomerPets(customerId, fallback = []) {
    const keys = getPetStorageKeys(customerId);
    return normalizePetProfiles(readStorage(keys.pets, fallback));
  }

  function writeCustomerPets(customerId, pets, activePetId) {
    const keys = getPetStorageKeys(customerId);
    writeStorage(keys.pets, normalizePetProfiles(pets));
    if (activePetId) {
      writeStorage(keys.activePet, activePetId);
    } else {
      removeStorage(keys.activePet);
    }
  }

  function persistPendingPetProfile(profile) {
    writeStorage(STORAGE_KEYS.pendingPetProfile, {
      profile,
      createdAt: new Date().toISOString(),
    });
  }

  function consumePendingPetProfile() {
    const pending = readStorage(STORAGE_KEYS.pendingPetProfile, null);
    removeStorage(STORAGE_KEYS.pendingPetProfile);
    return pending && pending.profile ? normalizePetProfile(pending.profile) : null;
  }

  function getInitialPetProfilesFromDocument() {
    return normalizePetProfiles(readJSONScript(document, '[data-initial-pets]', []));
  }

  function getActivePetProfile(customerId, fallback = []) {
    const resolvedCustomerId = customerId || currentCustomerIdFromDocument() || 'guest';
    const fallbackPets = arrayify(fallback).length ? fallback : getInitialPetProfilesFromDocument();
    const pets = readCustomerPets(resolvedCustomerId, fallbackPets);
    const keys = getPetStorageKeys(resolvedCustomerId);
    const activePetId = readStorage(keys.activePet, pets[0] ? pets[0].id : null);
    return pets.find((pet) => pet.id === activePetId) || pets[0] || null;
  }

  function getCurrentPetPlanProducts() {
    return getProductsFromScripts(document);
  }

  function currentCollectionHandleFromDocument() {
    const node = document.querySelector('[data-source-collection-handle]');
    return node ? node.dataset.sourceCollectionHandle || 'all' : 'all';
  }

  function resolvePlanProducts(handle, fallbackProducts = []) {
    const fallback = arrayify(fallbackProducts).length ? fallbackProducts : getCurrentPetPlanProducts();
    return fetchCollectionProducts(handle || currentCollectionHandleFromDocument()).catch(() => fallback);
  }

  function syncCustomerPets(customerId, pets, activePetId) {
    const endpoint = getCustomerPetsEndpoint();
    if (!customerId || !endpoint) {
      return Promise.resolve({ synced: false, disabled: true });
    }

    return fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        customerId,
        pets: normalizePetProfiles(pets),
        activePetId: activePetId || null,
      }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'Unable to sync pet profiles');
        }

        return {
          synced: true,
          pets: normalizePetProfiles(payload.pets || pets),
          activePetId: payload.activePetId || activePetId || null,
        };
      })
      .catch((error) => ({ synced: false, error }));
  }

  function renderSavedPlanMarkup(plan) {
    if (!plan) {
      return '<p class="plennia-note">No saved plan yet. Complete Create a Plan to save a recommendation set for this pet.</p>';
    }

    const formatHeadings = {
      dry: 'Dry food',
      wet: 'Wet food',
      treat: 'Treats',
      booster: 'Boosters',
    };

    const groupsMarkup = Object.entries(plan.groups || {})
      .filter(([, products]) => arrayify(products).length)
      .map(
        ([format, products]) => `
          <div class="plennia-note-list__item">
            <span>${formatHeadings[format] || capitalize(format)}</span>
            <span>${arrayify(products)
              .map((product) => product.title)
              .join(', ')}</span>
          </div>
        `
      )
      .join('');

    return `
      <div class="plennia-card__copy">
        <h3 class="plennia-card__title">${plan.title || 'Saved plan'}</h3>
        ${plan.body ? `<p class="plennia-card__excerpt">${plan.body}</p>` : ''}
      </div>
      <div class="plennia-saved-plan">
        ${arrayify(plan.chips)
          .map((chip) => `<span class="plennia-badge plennia-badge--muted">${chip}</span>`)
          .join('')}
      </div>
      ${groupsMarkup ? `<div class="plennia-note-list plennia-saved-plan__list">${groupsMarkup}</div>` : ''}
    `;
  }

  function productPetLabel(product) {
    if (product && arrayify(product.tags).includes('pet_cat')) return 'For cats';
    if (product && arrayify(product.tags).includes('pet_dog')) return 'For dogs';
    return 'For pets';
  }

  function formatLabel(format) {
    if (format === 'dry') return 'Dry food';
    if (format === 'wet') return 'Wet food';
    if (format === 'treat') return 'Treat';
    if (format === 'booster') return 'Booster';
    return 'Product';
  }

  function pronounsForState(state) {
    const sex = String(state.sex || '').toLowerCase();
    if (sex === 'male') return { subject: 'he', object: 'him', possessive: 'his' };
    if (sex === 'female') return { subject: 'she', object: 'her', possessive: 'her' };
    return { subject: 'they', object: 'them', possessive: 'their' };
  }

  function buildPlanResultsCopy(state) {
    const petName = state.petName || (state.petType ? capitalize(state.petType) : 'Your pet');
    const pronouns = pronounsForState(state);
    const lifeStage = buildLifeStage(state);
    const readableLifeStage = lifeStage ? tagToLabel(lifeStage).replace(' life stage', '') : 'daily needs';
    const firstGoal = arrayify(state.goals)[0];
    const goalText = firstGoal ? capitalize(firstGoal.replace(/_/g, ' ')) : 'general wellbeing';

    return {
      petName,
      pronouns,
      title: `${petName}'s first tailored plan.`,
      body: `Built around ${pronouns.possessive} ${readableLifeStage.toLowerCase()}, ${goalText.toLowerCase()}, and current feeding routine.`,
    };
  }

  function renderPlanProductCardMarkup(product, currencyCode) {
    const comparePrice = Number(product.compare_at_price || 0);
    const hasCompare = comparePrice > Number(product.price || 0);
    const imageMarkup = product.featured_image
      ? `<img src="${product.featured_image}" alt="${product.title}">`
      : '<div class="plennia-plan-product-card__placeholder"></div>';

    return `
      <article class="plennia-plan-product-card">
        <div class="plennia-plan-product-card__tile">${imageMarkup}</div>
        <div class="plennia-plan-product-card__body">
          <p class="plennia-plan-product-card__meta">${productPetLabel(product)} <span>&bull;</span> ${formatLabel(product.format)}</p>
          <h3>${product.title}</h3>
          <div class="plennia-plan-product-card__price">
            ${hasCompare ? `<span class="plennia-plan-product-card__compare">${formatMoney(comparePrice, currencyCode)}</span>` : ''}
            <span>${formatMoney(product.price, currencyCode)}</span>
          </div>
          <div class="plennia-plan-product-card__actions">
            <a class="button button--secondary plennia-button-secondary" href="${product.url}">View product</a>
            ${
              product.available === false
                ? ''
                : `<button class="button" type="button" data-plennia-add-item data-variant-id="${product.variant_id}">Add to cart</button>`
            }
          </div>
        </div>
      </article>
    `;
  }

  function renderPlanGroupsMarkup(groups, currencyCode) {
    return ['dry', 'wet', 'treat']
      .map((format) => {
        const items = groups[format].slice(0, 2);
        if (!items.length) return '';

        return `
          <section class="plennia-plan-results-products__group">
            <div class="plennia-plan-results-products__group-head">
              <p>${formatLabel(format)}</p>
              <h3>Selected for your current plan</h3>
            </div>
            <div class="plennia-plan-results-products__grid">
              ${items.map((product) => renderPlanProductCardMarkup(product, currencyCode)).join('')}
            </div>
          </section>
        `;
      })
      .join('');
  }

  function renderReasonBadges(reasons) {
    return arrayify(reasons)
      .map((reason) => `<span class="plennia-badge plennia-badge--muted">${reason}</span>`)
      .join('');
  }

  function renderRecommendationMarkup(groups, currencyCode) {
    const labels = {
      dry: 'Recommended dry food',
      wet: 'Recommended wet food',
      treat: 'Recommended treats',
      booster: 'Optional boosters',
    };

    return ['dry', 'wet', 'treat', 'booster']
      .map((format) => {
        const items = groups[format].slice(0, 2);
        if (!items.length) return '';

        return `
          <section class="plennia-quiz__result-group">
            <div class="plennia-featured-products__header">
              <div>
                <p class="plennia-section__eyebrow">${labels[format]}</p>
                <h3 class="plennia-card__title">Built from Plennia's launch tag system</h3>
              </div>
            </div>
            <div class="plennia-quiz__result-cards">
              ${items
                .map((product) => {
                  const imageMarkup = product.featured_image
                    ? `<img class="plennia-recommendation-card__image" src="${product.featured_image}" alt="${product.title}">`
                    : '<div class="plennia-recommendation-card__image"></div>';

                  return `
                    <article class="plennia-recommendation-card">
                      <div class="plennia-recommendation-card__media">${imageMarkup}</div>
                      <div class="plennia-recommendation-card__body">
                        <div class="plennia-card__badges">
                          <span class="plennia-badge">${labels[format].replace('Recommended ', '')}</span>
                          <span class="plennia-badge plennia-badge--muted">Score ${product.score}</span>
                        </div>
                        <h3 class="plennia-card__title"><a href="${product.url}">${product.title}</a></h3>
                        <p class="plennia-card__excerpt">${product.description || 'Tag-based recommendation scaffolded for expansion.'}</p>
                        <div class="plennia-result-reasons">${renderReasonBadges(product.reasons)}</div>
                        <div class="plennia-card__footer">
                          <strong>${formatMoney(product.price, currencyCode)}</strong>
                          <button class="button button--secondary plennia-button-secondary" type="button" data-plennia-add-item data-variant-id="${product.variant_id}">
                            Add to cart
                          </button>
                        </div>
                      </div>
                    </article>
                  `;
                })
                .join('')}
            </div>
          </section>
        `;
      })
      .join('');
  }

  function buildCartItems(groups) {
    return ['dry', 'wet', 'treat', 'booster']
      .map((format) => groups[format][0])
      .filter(Boolean)
      .map((product) => ({ id: Number(product.variant_id), quantity: 1 }));
  }

  function addItemsToCart(items) {
    if (!items.length) return Promise.resolve();
    const endpoint = window.routes && window.routes.cart_add_url ? `${window.routes.cart_add_url}.js` : '/cart/add.js';

    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ items }),
    }).then((response) => {
      if (!response.ok) throw new Error('Unable to add items');
      return response.json();
    });
  }

  class PlenniaQuiz extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.storageKey = this.dataset.storageKey || STORAGE_KEYS.quiz;
      this.currencyCode = this.dataset.currency || 'USD';
      this.resultsUrl = this.dataset.resultsUrl || '';
      this.customerId = this.dataset.customerId || currentCustomerIdFromDocument() || '';
      this.collectionHandle = this.dataset.sourceCollectionHandle || 'all';
      this.form = this.querySelector('form');
      this.steps = Array.from(this.querySelectorAll('[data-quiz-step]'));
      this.summaryTarget = this.querySelector('[data-quiz-summary]');
      this.resultsTarget = this.querySelector('[data-quiz-results]');
      this.progressText = this.querySelector('[data-quiz-step-label]');
      this.progressBar = this.querySelector('[data-quiz-progress-bar]');
      this.prevButton = this.querySelector('[data-quiz-prev]');
      this.nextButton = this.querySelector('[data-quiz-next]');
      this.restartButton = this.querySelector('[data-quiz-restart]');
      this.products = getProductsFromScripts(this);
      this.state = getQuizState(this.storageKey);
      this.currentStepIndex = 0;

      this.prepareProfileContext();
      this.bindEvents();
      this.hydrateForm();
      this.goToStep(this.findFirstIncompleteStep());
      this.renderResults();
      this.loadProductCatalog();
    }

    prepareProfileContext() {
      const currentUrl = new URL(window.location.href);
      const petId = currentUrl.searchParams.get('pet');

      if (!petId) {
        clearQuizContext();
        return;
      }

      const pets = readCustomerPets(this.customerId, []);
      const activePet = getActivePetProfile(this.customerId, pets);
      const pet = activePet && activePet.id === petId ? activePet : pets.find((profile) => profile.id === petId);
      if (!pet) {
        clearQuizContext();
        return;
      }

      this.state = buildQuizStateFromPetProfile(pet);
      setQuizContext({ petProfileId: pet.id, customerId: this.customerId || '' });
      setQuizState(this.state, this.storageKey);
    }

    loadProductCatalog() {
      fetchCollectionProducts(this.collectionHandle)
        .then((products) => {
          if (!Array.isArray(products) || !products.length) return;
          this.products = products;
          this.renderResults();
        })
        .catch(() => {
          return;
        });
    }

    bindEvents() {
      this.addEventListener('click', (event) => {
        const nextButton = event.target.closest('[data-quiz-next]');
        const prevButton = event.target.closest('[data-quiz-prev]');
        const restartButton = event.target.closest('[data-quiz-restart]');
        const addAllButton = event.target.closest('[data-quiz-add-all]');
        const addItemButton = event.target.closest('[data-plennia-add-item]');

        if (nextButton) {
          event.preventDefault();
          if (!this.validateStep(this.currentStepIndex)) return;
          this.captureState();
          const nextIndex = this.currentStepIndex + 1;
          const nextStep = this.steps[nextIndex];

          if (nextStep && nextStep.dataset.stepKey === 'results' && this.resultsUrl) {
            window.location.href = this.resultsUrl;
            return;
          }

          this.goToStep(nextIndex);
        }

        if (prevButton) {
          event.preventDefault();
          this.goToStep(this.currentStepIndex - 1);
        }

        if (restartButton) {
          event.preventDefault();
          this.resetQuiz();
        }

        if (addAllButton) {
          event.preventDefault();
          const items = parseJSON(addAllButton.dataset.items, []);
          addItemsToCart(items).then(() => {
            window.location.href = window.routes ? window.routes.cart_url : '/cart';
          });
        }

        if (addItemButton) {
          event.preventDefault();
          const variantId = Number(addItemButton.dataset.variantId);
          if (!variantId) return;
          addItemsToCart([{ id: variantId, quantity: 1 }]).then(() => {
            addItemButton.textContent = 'Added';
          });
        }
      });

      this.form.addEventListener('change', () => {
        this.captureState();
        this.renderResults();
      });

      this.form.addEventListener('input', () => {
        this.captureState();
      });
    }

    findFirstIncompleteStep() {
      const state = this.state;
      if (!state.petType) return 0;
      if (!state.petName || !state.age || !state.weight) return 1;
      if (!state.bodyCondition || !state.activityLevel) return 2;
      if (!arrayify(state.currentFood).length) return 3;
      if (!arrayify(state.healthProblems).length) return 4;
      if (!arrayify(state.allergies).length) return 5;
      if (!arrayify(state.goals).length) return 6;
      return 7;
    }

    hydrateForm() {
      Object.entries(this.state).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((item) => {
            const selector = `[name="${key}"][value="${item}"], [name="${this.toSnakeCase(key)}"][value="${item}"]`;
            const checkbox = this.form.querySelector(selector);
            if (checkbox) checkbox.checked = true;
          });
          return;
        }

        const field =
          this.form.querySelector(`[name="${key}"]`) || this.form.querySelector(`[name="${this.toSnakeCase(key)}"]`);
        if (field) field.value = value;
      });
    }

    toSnakeCase(value) {
      return String(value).replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
    }

    captureState() {
      const data = new FormData(this.form);
      const context = getQuizContext();
      const nextState = normalizeQuizState({
        pet_type: data.get('pet_type'),
        pet_name: data.get('pet_name'),
        sex: data.get('sex'),
        age: data.get('age'),
        breed: data.get('breed'),
        neutered_status: data.get('neutered_status'),
        weight: data.get('weight'),
        body_condition: data.get('body_condition'),
        activity_level: data.get('activity_level'),
        current_food: data.getAll('current_food'),
        health_problems: data.getAll('health_problems'),
        allergies: data.getAll('allergies'),
        goals: data.getAll('goals'),
        email: data.get('email'),
        pet_profile_id: context.petProfileId || '',
      });

      this.state = nextState;
      setQuizState(nextState, this.storageKey);
      this.renderSummary();
      return nextState;
    }

    validateStep(index) {
      const step = this.steps[index];
      const stepKey = step ? step.dataset.stepKey : '';
      const state = this.captureState();
      if (stepKey === 'pet_type' && !state.petType) return false;
      if (stepKey === 'basic_info' && (!state.petName || !state.age || !state.weight)) return false;
      if (stepKey === 'body_activity' && (!state.bodyCondition || !state.activityLevel)) return false;
      if (stepKey === 'current_food' && !state.currentFood.length) return false;
      if (stepKey === 'health' && !state.healthProblems.length) return false;
      if (stepKey === 'allergies' && !state.allergies.length) return false;
      if (stepKey === 'goals' && !state.goals.length) return false;
      return true;
    }

    goToStep(index) {
      this.currentStepIndex = Math.max(0, Math.min(index, this.steps.length - 1));
      this.steps.forEach((step, stepIndex) => {
        const isActive = stepIndex === this.currentStepIndex;
        step.classList.toggle('is-active', isActive);
        step.toggleAttribute('hidden', !isActive);
      });

      const stepNumber = this.currentStepIndex + 1;
      const totalSteps = this.steps.length;
      if (this.progressText) this.progressText.textContent = `Step ${stepNumber} of ${totalSteps}`;
      if (this.progressBar) this.progressBar.style.width = `${(stepNumber / totalSteps) * 100}%`;
      if (this.prevButton) this.prevButton.hidden = this.currentStepIndex === 0;
      if (this.nextButton) this.nextButton.hidden = this.currentStepIndex === this.steps.length - 1;
      if (this.restartButton) this.restartButton.hidden = this.currentStepIndex !== this.steps.length - 1;
      this.renderSummary();
      this.renderResults();
    }

    renderSummary() {
      if (!this.summaryTarget) return;
      const chips = buildSummaryChips(this.state);
      this.summaryTarget.innerHTML = chips
        .map((chip) => `<span class="plennia-badge plennia-badge--muted">${chip}</span>`)
        .join('');
    }

    renderResults() {
      if (!this.resultsTarget || !this.products.length) return;
      const scored = this.products
        .map((product) => scoreProduct(product, this.state))
        .filter(Boolean)
        .sort((first, second) => second.score - first.score);
      const groups = groupRecommendations(scored);
      const items = buildCartItems(groups);
      const hasRecommendations = Object.values(groups).some((group) => group.length);

      if (!hasRecommendations) {
        this.resultsTarget.innerHTML = `
          <div class="plennia-summary-card plennia-card__body">
            <p class="plennia-section__eyebrow">Results</p>
            <h3 class="plennia-card__title">Complete a few more answers to unlock recommendations.</h3>
            <p class="plennia-card__excerpt">The scoring engine is wired to Shopify product tags and will populate as soon as the quiz has enough data.</p>
          </div>
        `;
        return;
      }

      this.resultsTarget.innerHTML = `
        <div class="plennia-quiz__results">
          <div class="plennia-quiz__results-actions">
            <button class="button" type="button" data-quiz-add-all data-items='${JSON.stringify(items)}'>Add all to cart</button>
            <a class="button button--secondary plennia-button-secondary" href="/">Back to homepage</a>
          </div>
          <div class="plennia-quiz__result-groups">${renderRecommendationMarkup(groups, this.currencyCode)}</div>
        </div>
      `;
    }

    resetQuiz() {
      this.form.reset();
      this.state = normalizeQuizState({});
      setQuizState(this.state, this.storageKey);
      this.goToStep(0);
    }
  }

  class PlenniaRecommendations extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.storageKey = this.dataset.storageKey || STORAGE_KEYS.quiz;
      this.currencyCode = this.dataset.currency || 'USD';
      this.customerId = this.dataset.customerId || currentCustomerIdFromDocument() || '';
      this.collectionHandle = this.dataset.sourceCollectionHandle || 'all';
      this.stateSource = this.dataset.stateSource || 'quiz';
      this.accountUrl = this.dataset.accountUrl || getAccountUrl();
      this.planLink = this.dataset.planLink || getPlanUrl();
      this.products = getProductsFromScripts(this);
      this.resultsTarget = this.querySelector('[data-recommendation-results]');
      this.actionsTarget = this.querySelector('[data-recommendation-actions]');
      this.summaryTarget = this.querySelector('[data-recommendation-summary]');

      document.addEventListener('plennia:quiz:updated', () => this.render());
      document.addEventListener('plennia:pets:updated', () => this.render());
      this.addEventListener('click', (event) => {
        const addAllButton = event.target.closest('[data-recommendation-add-all]');
        const addItemButton = event.target.closest('[data-plennia-add-item]');

        if (addAllButton) {
          event.preventDefault();
          const items = parseJSON(addAllButton.dataset.items, []);
          addItemsToCart(items).then(() => {
            window.location.href = window.routes ? window.routes.cart_url : '/cart';
          });
        }

        if (addItemButton) {
          event.preventDefault();
          const variantId = Number(addItemButton.dataset.variantId);
          if (!variantId) return;
          addItemsToCart([{ id: variantId, quantity: 1 }]).then(() => {
            addItemButton.textContent = 'Added';
          });
        }
      });

      this.render();
      this.loadProductCatalog();
    }

    loadProductCatalog() {
      fetchCollectionProducts(this.collectionHandle)
        .then((products) => {
          if (!Array.isArray(products) || !products.length) return;
          this.products = products;
          this.render();
        })
        .catch(() => {
          return;
        });
    }

    resolveState() {
      if (this.stateSource === 'active_pet') {
        const activePet = getActivePetProfile(this.customerId);
        return activePet ? buildQuizStateFromPetProfile(activePet) : null;
      }

      return getQuizState(this.storageKey);
    }

    render() {
      if (!this.products.length || !this.resultsTarget) return;
      const state = this.resolveState();

      if (!state || !state.petType) {
        if (this.summaryTarget) this.summaryTarget.innerHTML = '';
        if (this.actionsTarget) this.actionsTarget.innerHTML = '';
        this.resultsTarget.innerHTML =
          this.stateSource === 'active_pet'
            ? `
              <article class="plennia-dashboard-card plennia-pet-card">
                <div class="plennia-card__copy">
                  <h3 class="plennia-card__title">Choose a pet to unlock recommendations</h3>
                  <p class="plennia-card__excerpt">Select or create a pet profile in your account, then rerun Create a Plan to keep recommendations tied to that pet.</p>
                  <div class="plennia-pet-card__actions">
                    <a class="button" href="${this.accountUrl}">Manage pets</a>
                    <a class="button button--secondary plennia-button-secondary" href="${this.planLink}">Create a plan</a>
                  </div>
                </div>
              </article>
            `
            : `
              <article class="plennia-dashboard-card plennia-pet-card">
                <div class="plennia-card__copy">
                  <h3 class="plennia-card__title">Create a plan to unlock recommendations</h3>
                  <p class="plennia-card__excerpt">Answer the quiz first, then this block will rank the catalog from Shopify product tags.</p>
                  <div class="plennia-pet-card__actions">
                    <a class="button" href="${this.planLink}">Create a plan</a>
                  </div>
                </div>
              </article>
            `;
        return;
      }

      const scored = this.products
        .map((product) => scoreProduct(product, state))
        .filter(Boolean)
        .sort((first, second) => second.score - first.score);

      const groups = groupRecommendations(scored);
      const items = buildCartItems(groups);
      const chips = buildSummaryChips(state);
      const hasRecommendations = Object.values(groups).some((group) => group.length);

      if (this.summaryTarget) {
        this.summaryTarget.innerHTML = chips
          .map((chip) => `<span class="plennia-badge plennia-badge--muted">${chip}</span>`)
          .join('');
      }

      if (!hasRecommendations) {
        this.resultsTarget.innerHTML = `
          <article class="plennia-dashboard-card plennia-pet-card">
            <div class="plennia-card__copy">
              <h3 class="plennia-card__title">No matching products yet</h3>
              <p class="plennia-card__excerpt">Keep the pet profile saved, then add more tagged products to the catalog and this block will pick them up automatically.</p>
            </div>
          </article>
        `;
        if (this.actionsTarget) this.actionsTarget.innerHTML = '';
        return;
      }

      this.resultsTarget.innerHTML = renderRecommendationMarkup(groups, this.currencyCode);

      if (this.actionsTarget) {
        this.actionsTarget.innerHTML = `
          <button class="button" type="button" data-recommendation-add-all data-items='${JSON.stringify(items)}'>
            Add top recommendations
          </button>
        `;
      }
    }
  }

  class PlenniaPetDashboard extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.customerId = this.dataset.customerId || 'guest';
      this.currencyCode = this.dataset.currency || 'USD';
      this.collectionHandle = this.dataset.sourceCollectionHandle || 'all';
      this.storageKey = `${STORAGE_KEYS.pets}:${this.customerId}`;
      this.activePetKey = `${STORAGE_KEYS.activePet}:${this.customerId}`;
      this.flashTarget = this.querySelector('[data-pet-save-flash]');
      this.switcherTarget = this.querySelector('[data-pet-switcher-controls]');
      this.cardsTarget = this.querySelector('[data-pet-cards]');
      this.form = this.querySelector('[data-pet-form]');
      this.formFields = {
        id: this.querySelector('[name="pet_id"]'),
        name: this.querySelector('[name="pet_profile_name"]'),
        type: this.querySelector('[name="pet_profile_type"]'),
        sex: this.querySelector('[name="pet_profile_sex"]'),
        age: this.querySelector('[name="pet_profile_age"]'),
        breed: this.querySelector('[name="pet_profile_breed"]'),
        weight: this.querySelector('[name="pet_profile_weight"]'),
        neuteredStatus: this.querySelector('[name="pet_profile_neutered_status"]'),
        allergies: this.querySelector('[name="pet_profile_allergies"]'),
        healthProblems: this.querySelector('[name="pet_profile_health_problems"]'),
        goals: this.querySelector('[name="pet_profile_goals"]'),
      };
      this.savedPlanTarget = this.querySelector('[data-saved-plan-summary]');
      this.products = getProductsFromScripts(this);
      this.accountUrl = this.dataset.accountUrl || getAccountUrl();
      this.planLink = this.dataset.planLink || getPlanUrl();
      this.petUrl = this.dataset.petUrl || getPetUrl();
      this.pets = normalizePetProfiles(readStorage(this.storageKey, readJSONScript(this, '[data-initial-pets]', [])));
      this.activePetId = readStorage(this.activePetKey, this.pets[0] ? this.pets[0].id : null);
      this.importPendingProfile();

      this.bindEvents();
      this.render();
      this.loadProductCatalog();
    }

    loadProductCatalog() {
      fetchCollectionProducts(this.collectionHandle)
        .then((products) => {
          if (!Array.isArray(products) || !products.length) return;
          this.products = products;
          this.render();
        })
        .catch(() => {
          return;
        });
    }

    bindEvents() {
      this.addEventListener('click', (event) => {
        const addTrigger = event.target.closest('[data-pet-add-trigger]');
        const switchTrigger = event.target.closest('[data-pet-switch]');
        const editTrigger = event.target.closest('[data-pet-edit]');
        const archiveTrigger = event.target.closest('[data-pet-archive]');
        const cancelTrigger = event.target.closest('[data-pet-cancel]');
        const viewTrigger = event.target.closest('[data-pet-view]');
        const shopTrigger = event.target.closest('[data-pet-shop]');
        const planTrigger = event.target.closest('[data-pet-plan]');

        if (addTrigger) {
          event.preventDefault();
          this.openForm();
        }

        if (switchTrigger) {
          event.preventDefault();
          this.activePetId = switchTrigger.dataset.petSwitch;
          writeStorage(this.activePetKey, this.activePetId);
          this.render();
        }

        if (editTrigger) {
          event.preventDefault();
          this.openForm(editTrigger.dataset.petEdit);
        }

        if (archiveTrigger) {
          event.preventDefault();
          this.archivePet(archiveTrigger.dataset.petArchive);
        }

        if (viewTrigger) {
          event.preventDefault();
          this.setActivePet(viewTrigger.dataset.petView);
          window.location.href = viewTrigger.getAttribute('href') || this.petUrl;
        }

        if (shopTrigger) {
          event.preventDefault();
          this.setActivePet(shopTrigger.dataset.petShop);
          window.location.href = shopTrigger.getAttribute('href') || '/collections/all';
        }

        if (planTrigger) {
          this.setActivePet(planTrigger.dataset.petPlan);
        }

        if (cancelTrigger) {
          event.preventDefault();
          this.closeForm();
        }
      });

      if (this.form) {
        this.form.addEventListener('submit', (event) => {
          event.preventDefault();
          this.savePet();
        });
      }
    }

    openForm(petId) {
      const pet = this.pets.find((item) => item.id === petId);
      if (pet) {
        this.formFields.id.value = pet.id;
        this.formFields.name.value = pet.name || '';
        this.formFields.type.value = pet.type || 'dog';
        this.formFields.sex.value = pet.sex || '';
        this.formFields.age.value = pet.age || '';
        this.formFields.breed.value = pet.breed || '';
        this.formFields.weight.value = pet.weight || '';
        this.formFields.neuteredStatus.value = pet.neuteredStatus || '';
        this.formFields.allergies.value = listToInputValue(pet.allergies);
        this.formFields.healthProblems.value = listToInputValue(pet.healthProblems);
        this.formFields.goals.value = listToInputValue(pet.goals);
      } else {
        this.form.reset();
        this.formFields.id.value = '';
        this.formFields.type.value = 'dog';
      }

      this.form.classList.add('is-visible');
    }

    closeForm() {
      if (!this.form) return;
      this.form.classList.remove('is-visible');
      this.form.reset();
      this.formFields.id.value = '';
      this.formFields.type.value = 'dog';
    }

    setActivePet(petId) {
      this.activePetId = petId;
      writeStorage(this.activePetKey, this.activePetId);
      this.render();
    }

    importPendingProfile() {
      if (!this.customerId || this.customerId === 'guest') return;
      const pendingProfile = consumePendingPetProfile();
      if (!pendingProfile) return;

      this.pets = upsertPetProfile(this.pets, pendingProfile);
      this.activePetId = pendingProfile.id;
      this.persist();
      this.showFlash(`${pendingProfile.name} was saved as a pet profile in this account.`);
    }

    showFlash(message) {
      if (!this.flashTarget || !message) return;
      this.flashTarget.hidden = false;
      this.flashTarget.innerHTML = `<p>${message}</p>`;
    }

    getActivePet() {
      return this.pets.find((pet) => pet.id === this.activePetId) || this.pets[0] || null;
    }

    savePet() {
      const petId = this.formFields.id.value || `pet-${Date.now()}`;
      const existingPet = this.pets.find((pet) => pet.id === petId);
      const nextQuizAnswers = normalizeQuizState({
        pet_type: this.formFields.type.value,
        pet_name: this.formFields.name.value.trim(),
        sex: this.formFields.sex.value,
        age: this.formFields.age.value.trim(),
        breed: this.formFields.breed.value.trim(),
        neutered_status: this.formFields.neuteredStatus.value,
        weight: this.formFields.weight.value.trim(),
        allergies: parseCommaList(this.formFields.allergies.value),
        health_problems: parseCommaList(this.formFields.healthProblems.value),
        goals: parseCommaList(this.formFields.goals.value),
        current_food: existingPet?.savedQuizAnswers?.currentFood || [],
        body_condition: existingPet?.savedQuizAnswers?.bodyCondition || '',
        activity_level: existingPet?.savedQuizAnswers?.activityLevel || '',
        email: existingPet?.savedQuizAnswers?.email || '',
      });
      const mergedQuizAnswers = normalizeQuizState({
        ...(existingPet?.savedQuizAnswers || {}),
        ...nextQuizAnswers,
      });
      const planProducts = this.products.length ? this.products : getCurrentPetPlanProducts();
      const nextPet = normalizePetProfile({
        id: petId,
        name: mergedQuizAnswers.petName || 'New pet',
        type: mergedQuizAnswers.petType || 'dog',
        sex: mergedQuizAnswers.sex,
        age: mergedQuizAnswers.age,
        breed: mergedQuizAnswers.breed,
        weight: mergedQuizAnswers.weight,
        neuteredStatus: mergedQuizAnswers.neuteredStatus,
        allergies: mergedQuizAnswers.allergies,
        healthProblems: mergedQuizAnswers.healthProblems,
        goals: mergedQuizAnswers.goals,
        savedQuizAnswers: mergedQuizAnswers,
        savedRecommendedPlan: buildSavedPlan(mergedQuizAnswers, planProducts),
        createdAt: existingPet?.createdAt,
        updatedAt: new Date().toISOString(),
      });

      this.pets = upsertPetProfile(this.pets, nextPet);
      this.activePetId = petId;
      this.persist();
      this.closeForm();
      this.showFlash(`${nextPet.name} is ready inside this account.`);
      this.render();
    }

    archivePet(petId) {
      this.pets = this.pets.filter((pet) => pet.id !== petId);
      if (this.activePetId === petId) this.activePetId = this.pets[0] ? this.pets[0].id : null;
      this.persist();
      this.render();
    }

    persist() {
      writeCustomerPets(this.customerId, this.pets, this.activePetId);
      document.dispatchEvent(
        new CustomEvent('plennia:pets:updated', { detail: { pets: this.pets, activePetId: this.activePetId } })
      );

      syncCustomerPets(this.customerId, this.pets, this.activePetId).then((result) => {
        if (!result.synced) return;

        this.pets = normalizePetProfiles(result.pets || this.pets);
        this.activePetId = result.activePetId || this.activePetId;
        writeCustomerPets(this.customerId, this.pets, this.activePetId);
        document.dispatchEvent(
          new CustomEvent('plennia:pets:updated', { detail: { pets: this.pets, activePetId: this.activePetId } })
        );
        this.render();
      });
    }

    renderSavedPlan() {
      if (!this.savedPlanTarget) return;
      const activePet = this.getActivePet();

      if (!activePet) {
        this.savedPlanTarget.innerHTML = '<p class="plennia-note">No pet selected yet.</p>';
        return;
      }

      const savedPlan =
        activePet.savedRecommendedPlan ||
        (activePet.savedQuizAnswers ? buildSavedPlan(activePet.savedQuizAnswers, this.products) : null);

      this.savedPlanTarget.innerHTML = `
        <div class="plennia-card__copy">
          <h3 class="plennia-card__title">${activePet.name}</h3>
          <p class="plennia-card__excerpt">Each pet keeps its own quiz answers and saved recommendation set.</p>
        </div>
        ${renderSavedPlanMarkup(savedPlan)}
      `;
    }

    render() {
      if (this.switcherTarget) {
        this.switcherTarget.innerHTML = this.pets.length
          ? this.pets
              .map(
                (pet) => `
                  <button class="plennia-pet-switcher__button ${pet.id === this.activePetId ? 'is-active' : ''}" type="button" data-pet-switch="${pet.id}">
                    ${iconForPetType(pet.type)} ${pet.name}
                  </button>
                `
              )
              .join('')
          : '<p class="plennia-note">No pet profiles yet. Add the first profile to start saving plans by pet.</p>';
      }

      if (this.cardsTarget) {
        this.cardsTarget.innerHTML = this.pets.length
          ? this.pets
              .map((pet) => {
                const summary = [pet.age ? `${pet.age} years` : '', pet.breed || 'Breed pending', pet.weight ? `${pet.weight} kg` : '']
                  .filter(Boolean)
                  .join(' / ');
                const healthSummary = [
                  pet.sex ? capitalize(pet.sex) : '',
                  pet.neuteredStatus
                    ? pet.neuteredStatus === 'yes'
                      ? 'Neutered / spayed'
                      : 'Not neutered / spayed'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' / ');
                const isActive = pet.id === this.activePetId;
                const shopUrl =
                  pet.type === 'cat'
                    ? '/collections/all?filter.p.tag=pet_cat'
                    : '/collections/all?filter.p.tag=pet_dog';
                const savedPlan =
                  pet.savedRecommendedPlan ||
                  (pet.savedQuizAnswers ? buildSavedPlan(pet.savedQuizAnswers, this.products) : null);
                const planChips = arrayify(savedPlan?.chips).slice(0, 4);

                return `
                  <article class="plennia-dashboard-card plennia-pet-card ${isActive ? 'is-active' : ''}">
                    <div class="plennia-pet-card__head">
                      <div><span class="plennia-pet-card__icon">${iconForPetType(pet.type)}</span></div>
                      <div class="plennia-card__badges">
                        <span class="plennia-badge">${capitalize(pet.type)}</span>
                        ${isActive ? '<span class="plennia-badge plennia-badge--muted">Active pet</span>' : ''}
                      </div>
                    </div>
                    <div class="plennia-card__copy">
                      <h3 class="plennia-card__title">${pet.name}</h3>
                      <p class="plennia-card__excerpt">${summary}</p>
                      ${healthSummary ? `<p class="plennia-note">${healthSummary}</p>` : ''}
                    </div>
                    ${
                      planChips.length
                        ? `<div class="plennia-saved-plan">${planChips
                            .map((chip) => `<span class="plennia-badge plennia-badge--muted">${chip}</span>`)
                            .join('')}</div>`
                        : '<p class="plennia-note">No saved plan yet. Run Create a Plan for this pet.</p>'
                    }
                    <div class="plennia-pet-card__actions">
                      <a class="plennia-link" href="${this.petUrl}" data-pet-view="${pet.id}">View plan</a>
                      <a class="plennia-link" href="${shopUrl}" data-pet-shop="${pet.id}">Shop for this pet</a>
                      <a class="plennia-link" href="${this.planLink}?pet=${encodeURIComponent(pet.id)}" data-pet-plan="${pet.id}">Run quiz again</a>
                      <button class="button button--secondary plennia-button-secondary" type="button" data-pet-edit="${pet.id}">Edit profile</button>
                      <button class="button button--secondary plennia-button-secondary" type="button" data-pet-archive="${pet.id}">Archive</button>
                    </div>
                  </article>
                `;
              })
              .join('')
          : `
            <article class="plennia-dashboard-card plennia-pet-card">
              <div class="plennia-card__copy">
                <h3 class="plennia-card__title">No pet profiles yet</h3>
                <p class="plennia-card__excerpt">Finish Create a Plan, then save each result as a pet profile under this one Shopify customer account.</p>
              </div>
            </article>
          `;
      }

      this.renderSavedPlan();
    }
  }

  class PlenniaPetProfile extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.customerId = this.dataset.customerId || 'guest';
      this.storageKey = `${STORAGE_KEYS.pets}:${this.customerId}`;
      this.activePetKey = `${STORAGE_KEYS.activePet}:${this.customerId}`;
      this.panel = this.querySelector('[data-pet-profile-panel]');
      this.initialPets = readJSONScript(this, '[data-initial-pets]', []);
      this.render();
      document.addEventListener('plennia:pets:updated', () => this.render());
    }

    render() {
      if (!this.panel) return;
      const pets = normalizePetProfiles(readStorage(this.storageKey, this.initialPets));
      const activePetId = readStorage(this.activePetKey, pets[0] ? pets[0].id : null);
      const activePet = pets.find((pet) => pet.id === activePetId) || pets[0];

      if (!activePet) {
        this.panel.innerHTML = `
          <article class="plennia-dashboard-card plennia-pet-card">
            <div class="plennia-card__copy">
              <h2 class="plennia-card__title">No active pet selected</h2>
              <p class="plennia-card__excerpt">Add a pet profile from the account dashboard to seed this page with pet-specific plans and recommendation history.</p>
            </div>
          </article>
        `;
        return;
      }

      const infoRows = [
        ['Pet type', capitalize(activePet.type)],
        ['Sex', activePet.sex ? capitalize(activePet.sex) : 'Pending'],
        ['Age', activePet.age ? `${activePet.age} years` : 'Pending'],
        ['Breed', activePet.breed || 'Pending'],
        ['Weight', activePet.weight ? `${activePet.weight} kg` : 'Pending'],
        [
          'Neutered / spayed',
          activePet.neuteredStatus
            ? activePet.neuteredStatus === 'yes'
              ? 'Yes'
              : 'No'
            : 'Pending',
        ],
        ['Allergies', arrayify(activePet.allergies).length ? arrayify(activePet.allergies).map(tagToLabel).join(', ') : 'None listed'],
        [
          'Health issues',
          arrayify(activePet.healthProblems).length
            ? arrayify(activePet.healthProblems).map(tagToLabel).join(', ')
            : 'None listed',
        ],
        ['Focus goals', arrayify(activePet.goals).length ? arrayify(activePet.goals).map(tagToLabel).join(', ') : 'None listed'],
      ];
      const savedPlan =
        activePet.savedRecommendedPlan ||
        (activePet.savedQuizAnswers ? buildSavedPlan(activePet.savedQuizAnswers, getCurrentPetPlanProducts()) : null);
      const planUrl = getPlanUrl();
      const accountUrl = getAccountUrl();

      this.panel.innerHTML = `
        <article class="plennia-dashboard-card plennia-pet-card is-active">
          <div class="plennia-pet-card__head">
            <span class="plennia-pet-card__icon">${iconForPetType(activePet.type)}</span>
            <div class="plennia-card__badges">
              <span class="plennia-badge">${capitalize(activePet.type)}</span>
              <span class="plennia-badge plennia-badge--muted">Current profile</span>
            </div>
          </div>
          <div class="plennia-card__copy">
            <h2 class="plennia-card__title">${activePet.name}</h2>
            <p class="plennia-card__excerpt">${[activePet.age ? `${activePet.age} years` : '', activePet.breed || 'Breed pending'].filter(Boolean).join(' / ')}</p>
          </div>
          <div class="plennia-pet-card__actions">
            <a class="plennia-link" href="${planUrl}?pet=${encodeURIComponent(activePet.id)}">Update plan</a>
              <a class="plennia-link" href="${
                activePet.type === 'cat'
                  ? '/collections/all?filter.p.tag=pet_cat'
                  : '/collections/all?filter.p.tag=pet_dog'
              }">Shop for this pet</a>
            <a class="plennia-link" href="${accountUrl}">Edit profile</a>
          </div>
          <div class="plennia-note-list">
            ${infoRows
              .map(
                ([label, value]) => `
                  <div class="plennia-note-list__item">
                    <span>${label}</span>
                    <span>${value}</span>
                  </div>
                `
              )
              .join('')}
          </div>
          <div class="plennia-pet-card__plan">
            ${renderSavedPlanMarkup(savedPlan)}
          </div>
        </article>
      `;
    }
  }

  class PlenniaCarousel extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.track = this.querySelector('[data-carousel-track]');
      this.prevButton = this.querySelector('[data-carousel-prev]');
      this.nextButton = this.querySelector('[data-carousel-next]');

      if (!this.track) return;

      const scrollByCard = (direction) => {
        const firstCard = this.track.children[0];
        const gap = Number.parseFloat(window.getComputedStyle(this.track).gap || '0');
        const amount = firstCard ? firstCard.getBoundingClientRect().width + gap : this.track.clientWidth * 0.86;
        this.track.scrollBy({ left: amount * direction, behavior: 'smooth' });
      };

      if (this.prevButton) {
        this.prevButton.addEventListener('click', () => scrollByCard(-1));
      }

      if (this.nextButton) {
        this.nextButton.addEventListener('click', () => scrollByCard(1));
      }
    }
  }

  class PlenniaBestSellers extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.tabs = Array.from(this.querySelectorAll('[data-best-sellers-tab]'));
      this.panels = Array.from(this.querySelectorAll('[data-best-sellers-panel]'));

      if (!this.tabs.length || !this.panels.length) return;

      this.addEventListener('click', (event) => {
        const tab = event.target.closest('[data-best-sellers-tab]');
        if (!tab || tab.disabled) return;
        this.activate(tab.dataset.bestSellersTab);
      });

      this.addEventListener('keydown', (event) => {
        const currentTab = event.target.closest('[data-best-sellers-tab]');
        if (!currentTab) return;
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

        event.preventDefault();
        const enabledTabs = this.tabs.filter((tab) => !tab.disabled);
        if (!enabledTabs.length) return;

        const currentIndex = enabledTabs.indexOf(currentTab);
        let nextIndex = currentIndex;

        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % enabledTabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = enabledTabs.length - 1;

        const nextTab = enabledTabs[nextIndex];
        if (!nextTab) return;
        nextTab.focus();
        this.activate(nextTab.dataset.bestSellersTab);
      });

      const preferredTab = this.dataset.defaultTab;
      const initialTab =
        this.tabs.find((tab) => !tab.disabled && tab.dataset.bestSellersTab === preferredTab) ||
        this.tabs.find((tab) => !tab.disabled);

      if (initialTab) {
        this.activate(initialTab.dataset.bestSellersTab);
      }
    }

    activate(tabKey) {
      this.tabs.forEach((tab) => {
        const isActive = tab.dataset.bestSellersTab === tabKey;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tab.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      this.panels.forEach((panel) => {
        panel.hidden = panel.dataset.bestSellersPanel !== tabKey;
      });
    }
  }

  class PlenniaCollectionShowcase extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.tabs = Array.from(this.querySelectorAll('[data-collection-format-tab]'));
      this.panels = Array.from(this.querySelectorAll('[data-collection-format-panel]'));

      if (!this.tabs.length || !this.panels.length) return;

      this.addEventListener('click', (event) => {
        const tab = event.target.closest('[data-collection-format-tab]');
        if (!tab || tab.disabled) return;
        this.activate(tab.dataset.collectionFormatTab);
      });

      this.addEventListener('keydown', (event) => {
        const currentTab = event.target.closest('[data-collection-format-tab]');
        if (!currentTab) return;
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

        event.preventDefault();
        const enabledTabs = this.tabs.filter((tab) => !tab.disabled);
        if (!enabledTabs.length) return;

        const currentIndex = enabledTabs.indexOf(currentTab);
        let nextIndex = currentIndex;

        if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % enabledTabs.length;
        if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + enabledTabs.length) % enabledTabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = enabledTabs.length - 1;

        const nextTab = enabledTabs[nextIndex];
        if (!nextTab) return;
        nextTab.focus();
        this.activate(nextTab.dataset.collectionFormatTab);
      });

      const preferredTab = this.dataset.defaultFormat;
      const matchingPanel = this.panels.find((panel) => panel.dataset.collectionFormatPanel === preferredTab);

      if (preferredTab && matchingPanel) {
        this.activate(preferredTab);
        return;
      }

      const initialTab =
        this.tabs.find((tab) => !tab.disabled && tab.dataset.collectionFormatTab === preferredTab) ||
        this.tabs.find((tab) => !tab.disabled);

      if (initialTab) {
        this.activate(initialTab.dataset.collectionFormatTab);
      }
    }

    activate(formatKey) {
      this.tabs.forEach((tab) => {
        const isActive = tab.dataset.collectionFormatTab === formatKey;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tab.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      this.panels.forEach((panel) => {
        panel.hidden = panel.dataset.collectionFormatPanel !== formatKey;
      });
    }
  }

  class PlenniaProductDetail extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.currencyCode = this.dataset.currency || 'USD';
      this.buyLabel = this.dataset.buyLabel || 'Add to cart';
      this.soldOutLabel = this.dataset.soldOutLabel || 'Sold out';
      this.variants = readJSONScript(this, '[data-product-variants]', []);
      this.variantButtons = Array.from(this.querySelectorAll('[data-variant-id]'));
      this.variantInput = this.querySelector('[data-product-variant-input]');
      this.priceTargets = Array.from(this.querySelectorAll('[data-product-price]'));
      this.compareTargets = Array.from(this.querySelectorAll('[data-product-compare]'));
      this.discountTargets = Array.from(this.querySelectorAll('[data-product-discount]'));
      this.planPriceTargets = Array.from(this.querySelectorAll('[data-product-plan-price]'));
      this.submitPriceTarget = this.querySelector('[data-product-submit-price]');
      this.submitLabelTarget = this.querySelector('[data-product-submit-label]');

      if (!this.variants.length || !this.variantInput) return;

      this.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-variant-id]');
        if (!trigger || trigger.disabled) return;
        event.preventDefault();
        this.selectVariant(Number(trigger.dataset.variantId));
      });

      const initialVariantId = Number(this.variantInput.value || this.variants[0].id);
      this.selectVariant(initialVariantId, false);
    }

    selectVariant(variantId, updateUrl = true) {
      const variant = this.variants.find((item) => Number(item.id) === Number(variantId));
      if (!variant) return;

      this.variantButtons.forEach((button) => {
        button.classList.toggle('is-active', Number(button.dataset.variantId) === Number(variant.id));
      });

      this.variantInput.value = variant.id;
      this.variantInput.disabled = !variant.available;

      const priceText = formatMoney(variant.price, this.currencyCode);
      const compareText =
        Number(variant.compare_at_price || 0) > Number(variant.price || 0)
          ? formatMoney(variant.compare_at_price, this.currencyCode)
          : '';
      const discountText =
        compareText && Number(variant.compare_at_price) > 0
          ? `-${Math.round(((variant.compare_at_price - variant.price) / variant.compare_at_price) * 100)}%`
          : '';

      this.priceTargets.forEach((target) => {
        target.textContent = priceText;
      });

      this.compareTargets.forEach((target) => {
        target.textContent = compareText;
        target.classList.toggle('is-hidden', !compareText);
      });

      this.discountTargets.forEach((target) => {
        target.textContent = discountText;
        target.hidden = !discountText;
      });

      this.planPriceTargets.forEach((target) => {
        target.textContent = priceText;
      });

      if (this.submitPriceTarget) {
        this.submitPriceTarget.textContent = priceText;
      }

      if (this.submitLabelTarget) {
        this.submitLabelTarget.textContent = variant.available ? this.buyLabel : this.soldOutLabel;
      }

      const submitButton = this.querySelector('[type="submit"][name="add"]');
      if (submitButton) {
        submitButton.disabled = !variant.available;
      }

      if (updateUrl && window.history?.replaceState) {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', nextUrl.toString());
      }
    }
  }

  class PlenniaPlanResultsHero extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.nameTarget = this.querySelector('[data-plan-results-name]');
      this.pronounTarget = this.querySelector('[data-plan-results-pronoun-object]');
      this.emailField = this.querySelector('input[type="email"]');
      if (this.emailField) {
        this.emailField.addEventListener('input', () => {
          const state = getQuizState(STORAGE_KEYS.quiz);
          setQuizState({ ...state, email: this.emailField.value }, STORAGE_KEYS.quiz);
        });
      }
      this.render();
      document.addEventListener('plennia:quiz:updated', () => this.render());
    }

    render() {
      const state = getQuizState(STORAGE_KEYS.quiz);
      const copy = buildPlanResultsCopy(state);
      if (this.nameTarget) this.nameTarget.textContent = copy.petName;
      if (this.pronounTarget) this.pronounTarget.textContent = copy.pronouns.object;
      if (this.emailField && state.email && !this.emailField.value) this.emailField.value = state.email;
    }
  }

  class PlenniaPlanResultsSummary extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.planLink = this.dataset.planLink || getPlanUrl();
      this.accountUrl = this.dataset.accountUrl || getAccountUrl();
      this.loginUrl = this.dataset.loginUrl || '/account/login';
      this.registerUrl = this.dataset.registerUrl || '/account/register';
      this.customerId = this.dataset.customerId || '';
      this.initialPets = normalizePetProfiles(readJSONScript(this, '[data-initial-pets]', []));
      this.titleTarget = this.querySelector('[data-results-summary-title]');
      this.bodyTarget = this.querySelector('[data-results-summary-body]');
      this.chipsTarget = this.querySelector('[data-results-summary-chips]');
      this.saveTarget = this.querySelector('[data-results-profile-save]');
      this.saveMessage = '';
      this.addEventListener('click', (event) => {
        const saveTrigger = event.target.closest('[data-save-pet-profile]');
        const authTrigger = event.target.closest('[data-save-pet-profile-auth]');

        if (saveTrigger) {
          event.preventDefault();
          this.saveCurrentPlanToAccount();
        }

        if (authTrigger) {
          event.preventDefault();
          this.queueProfileForAuth(authTrigger.getAttribute('href'));
        }
      });
      this.render();
      document.addEventListener('plennia:quiz:updated', () => this.render());
    }

    getExistingPet() {
      const context = getQuizContext();
      if (!this.customerId || !context.petProfileId) return null;

      return readCustomerPets(this.customerId, this.initialPets).find((pet) => pet.id === context.petProfileId) || null;
    }

    render() {
      const state = getQuizState(STORAGE_KEYS.quiz);
      if (!state.petType) {
        if (this.titleTarget) this.titleTarget.textContent = 'No saved plan yet.';
        if (this.bodyTarget)
          this.bodyTarget.innerHTML = `Start the quiz first, then return here for a tailored results page. <a href="${this.planLink}">Create a plan</a>`;
        if (this.chipsTarget) this.chipsTarget.innerHTML = '';
        if (this.saveTarget) this.saveTarget.innerHTML = '';
        return;
      }

      const copy = buildPlanResultsCopy(state);
      const chips = buildSummaryChips(state);

      if (this.titleTarget) this.titleTarget.textContent = copy.title;
      if (this.bodyTarget) this.bodyTarget.textContent = copy.body;
      if (this.chipsTarget) {
        this.chipsTarget.innerHTML = chips
          .map((chip) => `<span class="plennia-badge plennia-badge--muted">${chip}</span>`)
          .join('');
      }

      this.renderSavePanel(state);
    }

    renderSavePanel(state) {
      if (!this.saveTarget) return;
      const petName = state.petName || 'This pet';
      const existingPet = this.getExistingPet();
      const saveLabel = existingPet ? 'Update this pet profile' : 'Save this as a pet profile';
      const actions = this.customerId
        ? `
          <button class="button" type="button" data-save-pet-profile>${saveLabel}</button>
          <a class="button button--secondary plennia-button-secondary" href="${this.accountUrl}">View account</a>
        `
        : `
          <a class="button" href="${this.registerUrl}" data-save-pet-profile-auth="register">Create account and save</a>
          <a class="button button--secondary plennia-button-secondary" href="${this.loginUrl}" data-save-pet-profile-auth="login">Sign in to save</a>
        `;

      this.saveTarget.innerHTML = `
        <div class="plennia-plan-results-summary__save-card">
          <strong>${saveLabel}</strong>
          <p>${petName} can live inside one shared customer account with every answer, plan, and future subscription touchpoint kept per pet.</p>
          <p>${customerPetsStorageMessage()}</p>
          <div class="plennia-plan-results-summary__save-actions">${actions}</div>
          ${
            this.saveMessage
              ? `<p class="plennia-plan-results-summary__save-message">${this.saveMessage}</p>`
              : ''
          }
        </div>
      `;
    }

    buildProfileFromCurrentPlan(products) {
      const state = getQuizState(STORAGE_KEYS.quiz);
      const context = getQuizContext();
      const existingPet = this.getExistingPet();
      return buildPetProfileFromQuiz(state, products || getCurrentPetPlanProducts(), {
        id: context.petProfileId || existingPet?.id,
        createdAt: existingPet?.createdAt,
      });
    }

    saveCurrentPlanToAccount() {
      if (!this.customerId) return;
      resolvePlanProducts(currentCollectionHandleFromDocument(), getCurrentPetPlanProducts()).then((products) => {
        const nextProfile = this.buildProfileFromCurrentPlan(products);
        const existingPet = this.getExistingPet();
        const pets = upsertPetProfile(readCustomerPets(this.customerId, this.initialPets), nextProfile);
        writeCustomerPets(this.customerId, pets, nextProfile.id);
        this.saveMessage = existingPet
          ? `${nextProfile.name} was updated inside this account.`
          : `${nextProfile.name} was saved to this account.`;
        document.dispatchEvent(
          new CustomEvent('plennia:pets:updated', { detail: { pets, activePetId: nextProfile.id } })
        );
        syncCustomerPets(this.customerId, pets, nextProfile.id).then((result) => {
          if (!result.synced) return;

          const syncedPets = normalizePetProfiles(result.pets || pets);
          writeCustomerPets(this.customerId, syncedPets, result.activePetId || nextProfile.id);
          document.dispatchEvent(
            new CustomEvent('plennia:pets:updated', {
              detail: { pets: syncedPets, activePetId: result.activePetId || nextProfile.id },
            })
          );
        });
        this.render();
      });
    }

    queueProfileForAuth(targetUrl) {
      resolvePlanProducts(currentCollectionHandleFromDocument(), getCurrentPetPlanProducts()).then((products) => {
        const nextProfile = this.buildProfileFromCurrentPlan(products);
        persistPendingPetProfile(nextProfile);
        this.saveMessage = `We queued ${nextProfile.name} to save as soon as you finish account sign-in.`;
        this.render();
        window.location.href = targetUrl || this.registerUrl;
      });
    }
  }

  class PlenniaPlanResultsProducts extends HTMLElement {
    connectedCallback() {
      if (this.initialized) return;
      this.initialized = true;
      this.storageKey = STORAGE_KEYS.quiz;
      this.currencyCode = this.dataset.currency || 'USD';
      this.planLink = this.dataset.planLink || getPlanUrl();
      this.collectionHandle = this.dataset.sourceCollectionHandle || 'all';
      this.products = getProductsFromScripts(this);
      this.groupsTarget = this.querySelector('[data-results-products-groups]');

      this.addEventListener('click', (event) => {
        const addItemButton = event.target.closest('[data-plennia-add-item]');
        if (!addItemButton) return;

        event.preventDefault();
        const variantId = Number(addItemButton.dataset.variantId);
        if (!variantId) return;
        addItemsToCart([{ id: variantId, quantity: 1 }]).then(() => {
          addItemButton.textContent = 'Added';
        });
      });

      this.render();
      document.addEventListener('plennia:quiz:updated', () => this.render());
      this.loadProductCatalog();
    }

    loadProductCatalog() {
      fetchCollectionProducts(this.collectionHandle)
        .then((products) => {
          if (!Array.isArray(products) || !products.length) return;
          this.products = products;
          this.render();
        })
        .catch(() => {
          return;
        });
    }

    render() {
      if (!this.groupsTarget) return;
      const state = getQuizState(this.storageKey);

      if (!state.petType) {
        this.groupsTarget.innerHTML = `
          <div class="plennia-plan-results-products__empty">
            <h3>Start with the quiz to unlock your tailored products.</h3>
            <p>Complete the full Create a Plan flow, then this page will sort the tagged catalog into dry food, wet food, treats, and boosters for the active result set.</p>
            <a class="button" href="${this.planLink}">Create a plan</a>
          </div>
        `;
        return;
      }

      const scored = this.products
        .map((product) => scoreProduct(product, state))
        .filter(Boolean)
        .sort((first, second) => second.score - first.score);

      const groups = groupRecommendations(scored);
      const hasRecommendations = Object.values(groups).some((group) => group.length);

      if (!hasRecommendations) {
        this.groupsTarget.innerHTML = `
          <div class="plennia-plan-results-products__empty">
            <h3>No matching products yet.</h3>
            <p>Add the required pet, format, and support tags to the catalog and this page will begin surfacing matches automatically.</p>
          </div>
        `;
        return;
      }

      this.groupsTarget.innerHTML = renderPlanGroupsMarkup(groups, this.currencyCode);
    }
  }

  if (!customElements.get('plennia-quiz')) customElements.define('plennia-quiz', PlenniaQuiz);
  if (!customElements.get('plennia-recommendations'))
    customElements.define('plennia-recommendations', PlenniaRecommendations);
  if (!customElements.get('plennia-pet-dashboard')) customElements.define('plennia-pet-dashboard', PlenniaPetDashboard);
  if (!customElements.get('plennia-pet-profile')) customElements.define('plennia-pet-profile', PlenniaPetProfile);
  if (!customElements.get('plennia-carousel')) customElements.define('plennia-carousel', PlenniaCarousel);
  if (!customElements.get('plennia-best-sellers'))
    customElements.define('plennia-best-sellers', PlenniaBestSellers);
  if (!customElements.get('plennia-collection-showcase'))
    customElements.define('plennia-collection-showcase', PlenniaCollectionShowcase);
  if (!customElements.get('plennia-product-detail'))
    customElements.define('plennia-product-detail', PlenniaProductDetail);
  if (!customElements.get('plennia-plan-results-hero'))
    customElements.define('plennia-plan-results-hero', PlenniaPlanResultsHero);
  if (!customElements.get('plennia-plan-results-summary'))
    customElements.define('plennia-plan-results-summary', PlenniaPlanResultsSummary);
  if (!customElements.get('plennia-plan-results-products'))
    customElements.define('plennia-plan-results-products', PlenniaPlanResultsProducts);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlenniaHeader);
  } else {
    initPlenniaHeader();
  }

  document.addEventListener('shopify:section:load', initPlenniaHeader);

  window.PlenniaTheme = {
    getQuizState,
    scoreProduct,
    groupRecommendations,
  };
})();
