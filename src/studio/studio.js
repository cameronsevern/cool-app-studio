(() => {
  const frame = document.getElementById('exportFrame');
  const previewViewport = document.getElementById('previewViewport');
  const previewScale = document.getElementById('previewScale');
  const previewMeta = document.getElementById('previewMeta');
  const sourceButton = document.getElementById('sourceButton');
  const sourceInput = document.getElementById('sourceInput');
  const sourceName = document.getElementById('sourceName');
  const backgroundImageButton = document.getElementById('backgroundImageButton');
  const backgroundImageInput = document.getElementById('backgroundImageInput');
  const backgroundImageName = document.getElementById('backgroundImageName');
  const fontFileButton = document.getElementById('fontFileButton');
  const fontFileInput = document.getElementById('fontFileInput');
  const fontFileName = document.getElementById('fontFileName');
  const exportButton = document.getElementById('exportButton');
  const loadPresetButton = document.getElementById('loadPresetButton');
  const savePresetButton = document.getElementById('savePresetButton');
  const presetInput = document.getElementById('presetInput');
  const statusToast = document.getElementById('statusToast');
  const preflightStatus = document.getElementById('preflightStatus');
  const canvasDescription = document.getElementById('canvasDescription');

  const STORAGE_KEY = 'mockup-studio.config.v2';
  const LEGACY_STORAGE_KEY = 'mockup-studio.config.v1';

  let config = MockupScene.normalizeConfig();
  let assets = {
    screenImageUrl: '',
    backgroundImageUrl: '',
    fontDataUrl: '',
    backgroundFileName: '',
    fontFileName: '',
  };
  let usingSample = true;
  let loadedFontFace;
  let toastTimer;

  const controls = {
    canvasPreset: document.getElementById('canvasPresetSelect'),
    device: document.getElementById('deviceSelect'),
    showDevice: document.getElementById('showDeviceInput'),
    background: document.getElementById('backgroundSelect'),
    backgroundColorA: document.getElementById('backgroundColorA'),
    backgroundColorB: document.getElementById('backgroundColorB'),
    backgroundAngle: document.getElementById('backgroundAngle'),
    backgroundImageFit: document.getElementById('backgroundImageFit'),
    backgroundImageX: document.getElementById('backgroundImageX'),
    backgroundImageY: document.getElementById('backgroundImageY'),
    backgroundImageZoom: document.getElementById('backgroundImageZoom'),
    backgroundImageBlur: document.getElementById('backgroundImageBlur'),
    backgroundOverlay: document.getElementById('backgroundOverlay'),
    backgroundOverlayOpacity: document.getElementById('backgroundOverlayOpacity'),
    accent: document.getElementById('accentInput'),
    fontFamily: document.getElementById('fontFamilySelect'),
    autoTextColors: document.getElementById('autoTextColorsInput'),
    headlineColor: document.getElementById('headlineColorInput'),
    subheadColor: document.getElementById('subheadColorInput'),
    kickerColor: document.getElementById('kickerColorInput'),
    headlineSize: document.getElementById('headlineSize'),
    headlineWeight: document.getElementById('headlineWeight'),
    headlineLineHeight: document.getElementById('headlineLineHeight'),
    headlineTracking: document.getElementById('headlineTracking'),
    subheadSize: document.getElementById('subheadSize'),
    subheadWeight: document.getElementById('subheadWeight'),
    subheadLineHeight: document.getElementById('subheadLineHeight'),
    kickerSize: document.getElementById('kickerSize'),
    kickerUppercase: document.getElementById('kickerUppercaseInput'),
    copyWidth: document.getElementById('copyWidth'),
    copyTop: document.getElementById('copyTop'),
    copyLeft: document.getElementById('copyLeft'),
    rotateX: document.getElementById('rotateX'),
    rotateY: document.getElementById('rotateY'),
    rotateZ: document.getElementById('rotateZ'),
    scale: document.getElementById('scale'),
    x: document.getElementById('x'),
    y: document.getElementById('y'),
    kicker: document.getElementById('kickerInput'),
    headline: document.getElementById('headlineInput'),
    subhead: document.getElementById('subheadInput'),
    width: document.getElementById('widthInput'),
    height: document.getElementById('heightInput'),
  };

  const valueLabels = {
    rotateX: document.getElementById('rotateXValue'),
    rotateY: document.getElementById('rotateYValue'),
    rotateZ: document.getElementById('rotateZValue'),
    scale: document.getElementById('scaleValue'),
    x: document.getElementById('xValue'),
    y: document.getElementById('yValue'),
    backgroundAngle: document.getElementById('backgroundAngleValue'),
    backgroundImageX: document.getElementById('backgroundImageXValue'),
    backgroundImageY: document.getElementById('backgroundImageYValue'),
    backgroundImageZoom: document.getElementById('backgroundImageZoomValue'),
    backgroundImageBlur: document.getElementById('backgroundImageBlurValue'),
    backgroundOverlayOpacity: document.getElementById('backgroundOverlayOpacityValue'),
    headlineSize: document.getElementById('headlineSizeValue'),
    headlineWeight: document.getElementById('headlineWeightValue'),
    headlineLineHeight: document.getElementById('headlineLineHeightValue'),
    headlineTracking: document.getElementById('headlineTrackingValue'),
    subheadSize: document.getElementById('subheadSizeValue'),
    subheadWeight: document.getElementById('subheadWeightValue'),
    subheadLineHeight: document.getElementById('subheadLineHeightValue'),
    kickerSize: document.getElementById('kickerSizeValue'),
    copyWidth: document.getElementById('copyWidthValue'),
    copyTop: document.getElementById('copyTopValue'),
    copyLeft: document.getElementById('copyLeftValue'),
  };

  const numericKeys = [
    'rotateX',
    'rotateY',
    'rotateZ',
    'scale',
    'x',
    'y',
    'backgroundAngle',
    'backgroundImageX',
    'backgroundImageY',
    'backgroundImageZoom',
    'backgroundImageBlur',
    'backgroundOverlayOpacity',
    'headlineSize',
    'headlineWeight',
    'headlineLineHeight',
    'headlineTracking',
    'subheadSize',
    'subheadWeight',
    'subheadLineHeight',
    'kickerSize',
    'copyWidth',
    'copyTop',
    'copyLeft',
  ];

  function showStatus(message) {
    window.clearTimeout(toastTimer);
    statusToast.textContent = message;
    statusToast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => statusToast.classList.remove('is-visible'), 3200);
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function loadStoredConfig() {
    for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
      try {
        const stored = window.localStorage.getItem(key);
        if (stored) return MockupScene.normalizeConfig(JSON.parse(stored));
      } catch {
        window.localStorage.removeItem(key);
      }
    }
    return null;
  }

  async function fetchSample(device) {
    const response = await fetch(`/sample/${device}`);
    if (!response.ok) throw new Error(`Sample unavailable: ${response.status}`);
    const blob = await response.blob();
    assets.screenImageUrl = await fileToDataUrl(blob);
    sourceName.textContent = device === 'pixel' ? 'Demo · Pixel' : 'Demo · iPhone';
  }

  async function loadCustomFont(dataUrl) {
    if (loadedFontFace) document.fonts.delete(loadedFontFace);
    const font = new FontFace(config.customFontName, `url(${dataUrl})`);
    loadedFontFace = await font.load();
    document.fonts.add(loadedFontFace);
  }

  function updateValueLabels() {
    valueLabels.rotateX.textContent = `${config.rotateX}°`;
    valueLabels.rotateY.textContent = `${config.rotateY}°`;
    valueLabels.rotateZ.textContent = `${config.rotateZ}°`;
    valueLabels.scale.textContent = `${Math.round(config.scale * 100)}%`;
    valueLabels.x.textContent = `${Math.round(config.x * 100)}%`;
    valueLabels.y.textContent = `${Math.round(config.y * 100)}%`;
    valueLabels.backgroundAngle.textContent = `${Math.round(config.backgroundAngle)}°`;
    valueLabels.backgroundImageX.textContent = `${Math.round(config.backgroundImageX)}%`;
    valueLabels.backgroundImageY.textContent = `${Math.round(config.backgroundImageY)}%`;
    valueLabels.backgroundImageZoom.textContent = `${Math.round(config.backgroundImageZoom * 100)}%`;
    valueLabels.backgroundImageBlur.textContent = `${Math.round(config.backgroundImageBlur)} px`;
    valueLabels.backgroundOverlayOpacity.textContent = `${Math.round(config.backgroundOverlayOpacity * 100)}%`;
    valueLabels.headlineSize.textContent = `${Math.round(config.headlineSize)} px`;
    valueLabels.headlineWeight.textContent = `${Math.round(config.headlineWeight)}`;
    valueLabels.headlineLineHeight.textContent = Number(config.headlineLineHeight).toFixed(2);
    valueLabels.headlineTracking.textContent = `${Number(config.headlineTracking).toFixed(3)} em`;
    valueLabels.subheadSize.textContent = `${Math.round(config.subheadSize)} px`;
    valueLabels.subheadWeight.textContent = `${Math.round(config.subheadWeight)}`;
    valueLabels.subheadLineHeight.textContent = Number(config.subheadLineHeight).toFixed(2);
    valueLabels.kickerSize.textContent = `${Math.round(config.kickerSize)} px`;
    valueLabels.copyWidth.textContent = `${Math.round(config.copyWidth * 100)}%`;
    valueLabels.copyTop.textContent = `${Math.round(config.copyTop * 100)}%`;
    valueLabels.copyLeft.textContent = `${Math.round(config.copyLeft * 100)}%`;
  }

  function updateConditionalControls() {
    const customColors = config.background === 'solid' || config.background === 'gradient';
    document.getElementById('backgroundColorControls').hidden = !customColors;
    document.getElementById('backgroundColorBRow').hidden = config.background !== 'gradient';
    document.getElementById('backgroundAngleRow').hidden = config.background !== 'gradient';
    document.getElementById('backgroundImageControls').hidden = config.background !== 'image';
    document.getElementById('customFontControls').hidden = config.fontFamily !== 'custom';
    document.getElementById('textColorControls').hidden = config.autoTextColors;

    const canvas = MockupScene.CANVAS_PRESETS[config.canvasPreset];
    document.querySelectorAll('[data-orientation]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.orientation === config.orientation);
      button.disabled = Boolean(canvas && !canvas.allowOrientation);
    });
    document.querySelectorAll('[data-align]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.align === config.textAlign);
    });
  }

  function updateControlValues() {
    for (const key of numericKeys) controls[key].value = config[key];
    controls.canvasPreset.value = config.canvasPreset;
    controls.device.value = config.device;
    controls.showDevice.checked = config.showDevice !== false;
    controls.background.value = config.background;
    controls.backgroundColorA.value = config.backgroundColorA;
    controls.backgroundColorB.value = config.backgroundColorB;
    controls.backgroundImageFit.value = config.backgroundImageFit;
    controls.backgroundOverlay.value = config.backgroundOverlay;
    controls.accent.value = config.accent;
    controls.fontFamily.value = config.fontFamily;
    controls.autoTextColors.checked = config.autoTextColors !== false;
    controls.headlineColor.value = config.headlineColor;
    controls.subheadColor.value = config.subheadColor;
    controls.kickerColor.value = config.kickerColor;
    controls.kickerUppercase.checked = config.kickerUppercase !== false;
    controls.kicker.value = config.kicker;
    controls.headline.value = config.headline;
    controls.subhead.value = config.subhead;
    controls.width.value = config.width;
    controls.height.value = config.height;
    backgroundImageName.textContent = assets.backgroundFileName
      ? `${assets.backgroundFileName}${assets.backgroundImageUrl ? '' : ' · reselect'}`
      : 'No image selected';
    fontFileName.textContent = assets.fontFileName
      ? `${assets.fontFileName}${assets.fontDataUrl ? '' : ' · reselect'}`
      : 'No font selected';
    document.querySelectorAll('[data-preset]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.preset === config.preset);
    });
    document.querySelectorAll('[data-shell]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.shell === config.shell);
    });
    const canvas = MockupScene.CANVAS_PRESETS[config.canvasPreset];
    canvasDescription.textContent = canvas?.description ?? 'Custom canvas dimensions.';
    updateConditionalControls();
    updateValueLabels();
  }

  function fitPreview() {
    const scale = Math.min(
      previewViewport.clientWidth / config.width,
      previewViewport.clientHeight / config.height,
    ) * 0.94;
    previewScale.style.width = `${config.width}px`;
    previewScale.style.height = `${config.height}px`;
    previewScale.style.left = `${(previewViewport.clientWidth - config.width * scale) / 2}px`;
    previewScale.style.top = `${(previewViewport.clientHeight - config.height * scale) / 2}px`;
    previewScale.style.transform = `scale(${scale})`;
  }

  function updatePreflight() {
    const target = MockupScene.CANVAS_PRESETS[config.canvasPreset];
    const warnings = [];
    if (target?.platform === 'google' && config.background === 'transparent') {
      warnings.push('Google Play PNGs cannot contain transparency');
    }
    if (config.background === 'image' && !assets.backgroundImageUrl) {
      warnings.push('reselect a local background image');
    }
    if (config.fontFamily === 'custom' && !assets.fontDataUrl) {
      warnings.push('reselect a local font file');
    }
    const label = target?.label ?? 'Custom canvas';
    previewMeta.textContent = `${config.width} × ${config.height} · ${label}`;
    preflightStatus.textContent = warnings.length
      ? `${label} · ${warnings.join('; ')}.`
      : `${label} · exact ${config.width} × ${config.height} · ready to export.`;
    preflightStatus.classList.toggle('is-warning', warnings.length > 0);
  }

  function updatePreview() {
    MockupScene.applyScene(frame, config, assets);
    fitPreview();
    updateValueLabels();
    updatePreflight();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  function setNumber(key, value, affectsCamera = false) {
    config = {
      ...config,
      [key]: Number(value),
      ...(affectsCamera ? { preset: 'custom' } : {}),
    };
    if (affectsCamera) {
      document.querySelectorAll('[data-preset]').forEach((button) => button.classList.remove('is-active'));
    }
    updatePreview();
  }

  for (const key of ['rotateX', 'rotateY', 'rotateZ', 'scale', 'x', 'y']) {
    controls[key].addEventListener('input', (event) => setNumber(key, event.target.value, true));
  }

  for (const key of numericKeys.filter((key) => !['rotateX', 'rotateY', 'rotateZ', 'scale', 'x', 'y'].includes(key))) {
    controls[key].addEventListener('input', (event) => setNumber(key, event.target.value));
  }

  for (const key of ['kicker', 'headline', 'subhead']) {
    controls[key].addEventListener('input', (event) => {
      config = { ...config, [key]: event.target.value };
      updatePreview();
    });
  }

  for (const key of ['backgroundColorA', 'backgroundColorB', 'backgroundOverlay', 'accent', 'headlineColor', 'subheadColor', 'kickerColor']) {
    controls[key].addEventListener('input', (event) => {
      config = { ...config, [key]: event.target.value };
      updatePreview();
    });
  }

  for (const key of ['width', 'height']) {
    controls[key].addEventListener('change', (event) => {
      const value = Math.max(320, Math.min(4096, Number(event.target.value)));
      config = { ...config, [key]: value };
      const match = MockupScene.matchCanvasPreset(config.width, config.height);
      config = {
        ...config,
        canvasPreset: match?.id ?? 'custom',
        orientation: match?.orientation ?? (config.width > config.height ? 'landscape' : 'portrait'),
      };
      updateControlValues();
      updatePreview();
    });
  }

  controls.canvasPreset.addEventListener('change', (event) => {
    if (event.target.value === 'custom') {
      config = { ...config, canvasPreset: 'custom' };
    } else {
      config = MockupScene.applyCanvasPreset(config, event.target.value, config.orientation);
    }
    updateControlValues();
    updatePreview();
  });

  document.getElementById('orientationButtons').addEventListener('click', (event) => {
    const button = event.target.closest('[data-orientation]');
    if (!button || button.disabled) return;
    const orientation = button.dataset.orientation;
    if (config.canvasPreset === 'custom') {
      const isLandscape = config.width > config.height;
      if ((orientation === 'landscape') !== isLandscape) {
        config = { ...config, width: config.height, height: config.width, orientation };
      } else {
        config = { ...config, orientation };
      }
    } else {
      config = MockupScene.applyCanvasPreset(config, config.canvasPreset, orientation);
    }
    updateControlValues();
    updatePreview();
  });

  document.getElementById('fitCompositionButton').addEventListener('click', () => {
    config = MockupScene.fitComposition(config);
    updateControlValues();
    updatePreview();
    showStatus('Composition fit to the current canvas');
  });

  controls.background.addEventListener('change', (event) => {
    config = { ...config, background: event.target.value };
    updateControlValues();
    updatePreview();
  });

  controls.backgroundImageFit.addEventListener('change', (event) => {
    config = { ...config, backgroundImageFit: event.target.value };
    updatePreview();
  });

  controls.fontFamily.addEventListener('change', (event) => {
    config = { ...config, fontFamily: event.target.value };
    updateControlValues();
    updatePreview();
  });

  controls.autoTextColors.addEventListener('change', (event) => {
    config = { ...config, autoTextColors: event.target.checked };
    updateControlValues();
    updatePreview();
  });

  controls.kickerUppercase.addEventListener('change', (event) => {
    config = { ...config, kickerUppercase: event.target.checked };
    updatePreview();
  });

  controls.device.addEventListener('change', async (event) => {
    config = { ...config, device: event.target.value };
    if (usingSample) await fetchSample(config.device);
    updatePreview();
  });

  controls.showDevice.addEventListener('change', (event) => {
    config = { ...config, showDevice: event.target.checked };
    updatePreview();
  });

  document.getElementById('presetGrid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-preset]');
    if (!button) return;
    config = MockupScene.applyCameraPreset(config, button.dataset.preset);
    updateControlValues();
    updatePreview();
  });

  document.getElementById('materialGrid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-shell]');
    if (!button) return;
    config = { ...config, shell: button.dataset.shell };
    updateControlValues();
    updatePreview();
  });

  document.getElementById('textAlignButtons').addEventListener('click', (event) => {
    const button = event.target.closest('[data-align]');
    if (!button) return;
    config = { ...config, textAlign: button.dataset.align };
    updateControlValues();
    updatePreview();
  });

  sourceButton.addEventListener('click', () => sourceInput.click());
  sourceInput.addEventListener('change', async () => {
    const [file] = sourceInput.files;
    if (!file) return;
    try {
      assets.screenImageUrl = await fileToDataUrl(file);
      usingSample = false;
      sourceName.textContent = file.name;
      updatePreview();
    } catch (error) {
      showStatus(`Screenshot failed: ${error.message}`);
    } finally {
      sourceInput.value = '';
    }
  });

  backgroundImageButton.addEventListener('click', () => backgroundImageInput.click());
  backgroundImageInput.addEventListener('change', async () => {
    const [file] = backgroundImageInput.files;
    if (!file) return;
    try {
      assets.backgroundImageUrl = await fileToDataUrl(file);
      assets.backgroundFileName = file.name;
      config = { ...config, background: 'image' };
      updateControlValues();
      updatePreview();
      showStatus('Local background selected');
    } catch (error) {
      showStatus(`Background failed: ${error.message}`);
    } finally {
      backgroundImageInput.value = '';
    }
  });

  document.getElementById('removeBackgroundImageButton').addEventListener('click', () => {
    assets.backgroundImageUrl = '';
    assets.backgroundFileName = '';
    updateControlValues();
    updatePreview();
  });

  fontFileButton.addEventListener('click', () => fontFileInput.click());
  fontFileInput.addEventListener('change', async () => {
    const [file] = fontFileInput.files;
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      await loadCustomFont(dataUrl);
      assets.fontDataUrl = dataUrl;
      assets.fontFileName = file.name;
      config = { ...config, fontFamily: 'custom' };
      updateControlValues();
      updatePreview();
      showStatus('Local font loaded');
    } catch (error) {
      console.error(error);
      showStatus(`Font failed: ${error.message}`);
    } finally {
      fontFileInput.value = '';
    }
  });

  document.getElementById('resetBackgroundButton').addEventListener('click', () => {
    const defaults = MockupScene.DEFAULT_CONFIG;
    config = {
      ...config,
      background: defaults.background,
      backgroundColorA: defaults.backgroundColorA,
      backgroundColorB: defaults.backgroundColorB,
      backgroundAngle: defaults.backgroundAngle,
      backgroundImageFit: defaults.backgroundImageFit,
      backgroundImageX: defaults.backgroundImageX,
      backgroundImageY: defaults.backgroundImageY,
      backgroundImageZoom: defaults.backgroundImageZoom,
      backgroundImageBlur: defaults.backgroundImageBlur,
      backgroundOverlay: defaults.backgroundOverlay,
      backgroundOverlayOpacity: defaults.backgroundOverlayOpacity,
      accent: defaults.accent,
    };
    assets.backgroundImageUrl = '';
    assets.backgroundFileName = '';
    updateControlValues();
    updatePreview();
  });

  document.getElementById('resetTypographyButton').addEventListener('click', () => {
    const defaults = MockupScene.DEFAULT_CONFIG;
    const keys = [
      'fontFamily', 'customFontName', 'textAlign', 'autoTextColors', 'headlineSize',
      'headlineWeight', 'headlineLineHeight', 'headlineTracking', 'headlineColor',
      'subheadSize', 'subheadWeight', 'subheadLineHeight', 'subheadColor',
      'kickerSize', 'kickerWeight', 'kickerTracking', 'kickerColor', 'kickerUppercase',
      'copyWidth', 'copyTop', 'copyLeft',
    ];
    config = { ...config, ...Object.fromEntries(keys.map((key) => [key, defaults[key]])) };
    assets.fontDataUrl = '';
    assets.fontFileName = '';
    if (loadedFontFace) document.fonts.delete(loadedFontFace);
    loadedFontFace = undefined;
    updateControlValues();
    updatePreview();
  });

  loadPresetButton.addEventListener('click', () => presetInput.click());
  presetInput.addEventListener('change', async () => {
    const [file] = presetInput.files;
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      config = MockupScene.normalizeConfig(parsed.config ?? parsed);
      assets.backgroundImageUrl = '';
      assets.fontDataUrl = '';
      assets.backgroundFileName = parsed.assetHints?.background ?? '';
      assets.fontFileName = parsed.assetHints?.font ?? '';
      updateControlValues();
      updatePreview();
      const needsAssets = config.background === 'image' || config.fontFamily === 'custom';
      showStatus(needsAssets ? `Loaded ${file.name} · reselect local assets` : `Loaded ${file.name}`);
    } catch (error) {
      console.error(error);
      showStatus(`Preset failed: ${error.message}`);
    } finally {
      presetInput.value = '';
    }
  });

  savePresetButton.addEventListener('click', () => {
    const payload = JSON.stringify(
      {
        schemaVersion: 2,
        requirementsVerified: '2026-07-14',
        config,
        assetHints: {
          screenshot: usingSample ? null : sourceName.textContent,
          background: assets.backgroundFileName || null,
          font: assets.fontFileName || null,
        },
      },
      null,
      2,
    );
    downloadBlob(
      new Blob([payload], { type: 'application/json' }),
      `mockup-preset-${config.canvasPreset}-${config.device}.json`,
    );
    showStatus('Preset saved without local asset data');
  });

  exportButton.addEventListener('click', async () => {
    exportButton.disabled = true;
    exportButton.textContent = 'Rendering…';
    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          assets: {
            screenImageUrl: assets.screenImageUrl,
            backgroundImageUrl: assets.backgroundImageUrl,
            fontDataUrl: assets.fontDataUrl,
          },
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const target = config.canvasPreset === 'custom' ? 'custom' : config.canvasPreset;
      downloadBlob(blob, `mockup-${target}-${config.width}x${config.height}.png`);
      showStatus('PNG rendered locally');
    } catch (error) {
      console.error(error);
      showStatus(`Export failed: ${error.message}`);
    } finally {
      exportButton.disabled = false;
      exportButton.textContent = 'Export PNG';
    }
  });

  window.addEventListener('resize', fitPreview);

  (async () => {
    try {
      config = loadStoredConfig() ?? config;
      await fetchSample(config.device);
      updateControlValues();
      updatePreview();
      window.studioReady = true;
    } catch (error) {
      console.error(error);
      showStatus(error.message);
    }
  })();
})();
