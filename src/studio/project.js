(() => {
  const SCHEMA_VERSION = 4;
  const SHARED_KEYS = new Set([
    'width',
    'height',
    'canvasPreset',
    'orientation',
    'device',
    'shell',
    'background',
    'backgroundColorA',
    'backgroundColorB',
    'backgroundAngle',
    'backgroundImageFit',
    'backgroundImageX',
    'backgroundImageY',
    'backgroundImageZoom',
    'backgroundImageBlur',
    'backgroundOverlay',
    'backgroundOverlayOpacity',
    'accent',
    'fontFamily',
    'customFontName',
    'textAlign',
    'autoTextColors',
    'headlineSize',
    'headlineWeight',
    'headlineLineHeight',
    'headlineTracking',
    'headlineColor',
    'subheadSize',
    'subheadWeight',
    'subheadLineHeight',
    'subheadColor',
    'kickerSize',
    'kickerWeight',
    'kickerTracking',
    'kickerColor',
    'kickerUppercase',
  ]);

  function createId(prefix = 'item') {
    const random = Math.random().toString(36).slice(2, 10);
    return `${prefix}-${Date.now().toString(36)}-${random}`;
  }

  function normalizeName(value, fallback) {
    const name = String(value ?? '').trim();
    return name || fallback;
  }

  function clampNumber(value, minimum, maximum, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
  }

  function normalizeSpanDevice(spanDevice, slides, suppliedConfig = {}) {
    const firstSlide = slides[0];
    const secondSlide = slides[1] ?? firstSlide;
    const validIds = new Set(slides.map((slide) => slide.id));
    let startSlideId = validIds.has(spanDevice?.startSlideId)
      ? spanDevice.startSlideId
      : firstSlide?.id;
    let endSlideId = validIds.has(spanDevice?.endSlideId)
      ? spanDevice.endSlideId
      : secondSlide?.id;
    let startIndex = slides.findIndex((slide) => slide.id === startSlideId);
    let endIndex = slides.findIndex((slide) => slide.id === endSlideId);
    if (startIndex > endIndex) {
      [startSlideId, endSlideId] = [endSlideId, startSlideId];
      [startIndex, endIndex] = [endIndex, startIndex];
    }
    if (endIndex - startIndex > 4) {
      endIndex = startIndex + 4;
      endSlideId = slides[endIndex].id;
    }
    const sourceSlideId = validIds.has(spanDevice?.sourceSlideId)
      && slides.findIndex((slide) => slide.id === spanDevice.sourceSlideId) >= startIndex
      && slides.findIndex((slide) => slide.id === spanDevice.sourceSlideId) <= endIndex
      ? spanDevice.sourceSlideId
      : startSlideId;
    return {
      enabled: Boolean(spanDevice?.enabled) && slides.length > 1 && endIndex > startIndex,
      startSlideId,
      endSlideId,
      sourceSlideId,
      x: clampNumber(spanDevice?.x, 0, 1, 0.5),
      y: clampNumber(spanDevice?.y, -0.5, 0.5, Number(suppliedConfig.y ?? 0.08)),
      scale: clampNumber(spanDevice?.scale, 0.4, 2, Number(suppliedConfig.scale ?? 0.92)),
      rotateX: clampNumber(spanDevice?.rotateX, -24, 24, Number(suppliedConfig.rotateX ?? 5)),
      rotateY: clampNumber(spanDevice?.rotateY, -46, 46, Number(suppliedConfig.rotateY ?? -25)),
      rotateZ: clampNumber(spanDevice?.rotateZ, -18, 18, Number(suppliedConfig.rotateZ ?? -7)),
    };
  }

  function resolveSpanDevice(project) {
    const spanDevice = normalizeSpanDevice(
      project.spanDevice,
      project.slides,
      composeConfig(project),
    );
    if (!spanDevice.enabled) return null;
    const startIndex = project.slides.findIndex((slide) => slide.id === spanDevice.startSlideId);
    const endIndex = project.slides.findIndex((slide) => slide.id === spanDevice.endSlideId);
    const sourceIndex = project.slides.findIndex((slide) => slide.id === spanDevice.sourceSlideId);
    return { ...spanDevice, startIndex, endIndex, sourceIndex };
  }

  function splitConfig(suppliedConfig = {}) {
    const config = window.MockupScene.normalizeConfig(suppliedConfig);
    const shared = {};
    const slide = {};
    for (const [key, value] of Object.entries(config)) {
      (SHARED_KEYS.has(key) ? shared : slide)[key] = value;
    }
    return { shared, slide };
  }

  function createFromConfig(suppliedConfig = {}, options = {}) {
    const { shared, slide } = splitConfig(suppliedConfig);
    const slideId = createId('slide');
    const slides = [
      {
        id: slideId,
        name: normalizeName(options.slideName, 'Slide 1'),
        config: slide,
        screenshotAssetId: options.screenshotAssetId ?? null,
      },
    ];
    return {
      schemaVersion: SCHEMA_VERSION,
      name: normalizeName(options.name, 'Untitled screenshot set'),
      shared,
      slides,
      selectedSlideId: slideId,
      backgroundAssetId: options.backgroundAssetId ?? null,
      fontAssetId: options.fontAssetId ?? null,
      spanDevice: normalizeSpanDevice(options.spanDevice, slides, suppliedConfig),
      assets: options.assets ?? {},
    };
  }

  function selectedSlide(project) {
    return project.slides.find((slide) => slide.id === project.selectedSlideId)
      ?? project.slides[0];
  }

  function composeConfig(project, slide = selectedSlide(project)) {
    return window.MockupScene.normalizeConfig({
      ...project.shared,
      ...(slide?.config ?? {}),
    });
  }

  function syncConfig(project, suppliedConfig, slide = selectedSlide(project)) {
    const { shared, slide: slideConfig } = splitConfig(suppliedConfig);
    project.shared = shared;
    if (slide) slide.config = slideConfig;
    return project;
  }

  function normalizeAsset(asset, id) {
    if (!asset || typeof asset !== 'object') return null;
    return {
      id,
      name: normalizeName(asset.name, 'Local asset'),
      type: asset.type === 'font' ? 'font' : 'image',
      isSample: Boolean(asset.isSample),
      dataUrl: typeof asset.dataUrl === 'string' ? asset.dataUrl : '',
    };
  }

  function normalizeProject(input, fallbackConfig = {}) {
    const supplied = input?.project ?? input;
    if (!supplied?.slides || !Array.isArray(supplied.slides)) {
      return createFromConfig(input?.config ?? supplied ?? fallbackConfig);
    }

    const assets = {};
    for (const [id, asset] of Object.entries(supplied.assets ?? {})) {
      const normalized = normalizeAsset(asset, id);
      if (normalized) assets[id] = normalized;
    }

    const slides = supplied.slides.map((slide, index) => ({
      id: normalizeName(slide.id, createId('slide')),
      name: normalizeName(slide.name, `Slide ${index + 1}`),
      config: splitConfig({ ...fallbackConfig, ...(slide.config ?? {}) }).slide,
      screenshotAssetId: slide.screenshotAssetId ?? null,
    }));
    if (slides.length === 0) return createFromConfig(fallbackConfig);

    const fallbackShared = splitConfig(fallbackConfig).shared;
    const suppliedShared = splitConfig({ ...fallbackConfig, ...(supplied.shared ?? {}) }).shared;
    const project = {
      schemaVersion: SCHEMA_VERSION,
      name: normalizeName(supplied.name, 'Untitled screenshot set'),
      shared: { ...fallbackShared, ...suppliedShared },
      slides,
      selectedSlideId: supplied.selectedSlideId,
      backgroundAssetId: supplied.backgroundAssetId ?? null,
      fontAssetId: supplied.fontAssetId ?? null,
      spanDevice: normalizeSpanDevice(supplied.spanDevice, slides, fallbackConfig),
      assets,
    };
    if (!project.slides.some((slide) => slide.id === project.selectedSlideId)) {
      project.selectedSlideId = project.slides[0].id;
    }
    return project;
  }

  function createAsset(project, { name, type = 'image', dataUrl = '', isSample = false }) {
    const id = createId(type);
    project.assets[id] = {
      id,
      name: normalizeName(name, type === 'font' ? 'Local font' : 'Local image'),
      type,
      dataUrl,
      isSample,
    };
    return id;
  }

  function serialize(project, includeAssetData = false) {
    const referencedAssets = new Set([
      project.backgroundAssetId,
      project.fontAssetId,
      ...project.slides.map((slide) => slide.screenshotAssetId),
    ].filter(Boolean));
    const assets = Object.fromEntries(
      Object.entries(project.assets)
        .filter(([id]) => referencedAssets.has(id))
        .map(([id, asset]) => [
          id,
          {
            id,
            name: asset.name,
            type: asset.type,
            isSample: Boolean(asset.isSample),
            ...(includeAssetData ? { dataUrl: asset.dataUrl } : {}),
          },
        ]),
    );
    return {
      schemaVersion: SCHEMA_VERSION,
      project: {
        schemaVersion: SCHEMA_VERSION,
        name: project.name,
        shared: project.shared,
        slides: project.slides,
        selectedSlideId: project.selectedSlideId,
        backgroundAssetId: project.backgroundAssetId,
        fontAssetId: project.fontAssetId,
        spanDevice: normalizeSpanDevice(project.spanDevice, project.slides, composeConfig(project)),
        assets,
      },
    };
  }

  function historyState(project) {
    const { project: serialized } = serialize(project, false);
    return JSON.stringify({
      name: serialized.name,
      shared: serialized.shared,
      slides: serialized.slides,
      selectedSlideId: serialized.selectedSlideId,
      backgroundAssetId: serialized.backgroundAssetId,
      fontAssetId: serialized.fontAssetId,
      spanDevice: serialized.spanDevice,
    });
  }

  function restoreHistory(project, state) {
    const parsed = typeof state === 'string' ? JSON.parse(state) : state;
    return normalizeProject(
      {
        ...parsed,
        schemaVersion: SCHEMA_VERSION,
        assets: project.assets,
      },
      window.MockupScene.DEFAULT_CONFIG,
    );
  }

  function safeFilename(value, fallback = 'mockup-set') {
    const safe = String(value ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return safe || fallback;
  }

  window.MockupProject = {
    SCHEMA_VERSION,
    SHARED_KEYS,
    createId,
    createFromConfig,
    selectedSlide,
    composeConfig,
    syncConfig,
    normalizeProject,
    normalizeSpanDevice,
    resolveSpanDevice,
    createAsset,
    serialize,
    historyState,
    restoreHistory,
    safeFilename,
  };
})();
