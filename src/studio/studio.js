(() => {
  const frame = document.getElementById('exportFrame');
  const previewViewport = document.getElementById('previewViewport');
  const previewScale = document.getElementById('previewScale');
  const previewMeta = document.getElementById('previewMeta');
  const setOverview = document.getElementById('setOverview');
  const setOverviewCanvas = document.getElementById('setOverviewCanvas');
  const overviewMeta = document.getElementById('overviewMeta');
  const viewModeHint = document.getElementById('viewModeHint');
  const sourceButton = document.getElementById('sourceButton');
  const sourceInput = document.getElementById('sourceInput');
  const sourceName = document.getElementById('sourceName');
  const sourceDropzone = document.getElementById('sourceDropzone');
  const backgroundImageButton = document.getElementById('backgroundImageButton');
  const backgroundImageInput = document.getElementById('backgroundImageInput');
  const backgroundImageName = document.getElementById('backgroundImageName');
  const fontFileButton = document.getElementById('fontFileButton');
  const fontFileInput = document.getElementById('fontFileInput');
  const fontFileName = document.getElementById('fontFileName');
  const exportButton = document.getElementById('exportButton');
  const exportSetButton = document.getElementById('exportSetButton');
  const loadPresetButton = document.getElementById('loadPresetButton');
  const savePresetButton = document.getElementById('savePresetButton');
  const presetInput = document.getElementById('presetInput');
  const projectOpenButton = document.getElementById('projectOpenButton');
  const projectSaveButton = document.getElementById('projectSaveButton');
  const projectInput = document.getElementById('projectInput');
  const projectNameInput = document.getElementById('projectNameInput');
  const recoveryInput = document.getElementById('recoveryInput');
  const recoveryStatus = document.getElementById('recoveryStatus');
  const clearRecoveryButton = document.getElementById('clearRecoveryButton');
  const undoButton = document.getElementById('undoButton');
  const redoButton = document.getElementById('redoButton');
  const slideStrip = document.getElementById('slideStrip');
  const slideCount = document.getElementById('slideCount');
  const statusToast = document.getElementById('statusToast');
  const preflightStatus = document.getElementById('preflightStatus');
  const preflightList = document.getElementById('preflightList');
  const safeAreaInput = document.getElementById('safeAreaInput');
  const exportProgress = document.getElementById('exportProgress');
  const exportProgressLabel = document.getElementById('exportProgressLabel');
  const exportProgressCount = document.getElementById('exportProgressCount');
  const exportProgressBar = document.getElementById('exportProgressBar');
  const exportProgressTrack = exportProgress.querySelector('[role="progressbar"]');
  const cancelExportButton = document.getElementById('cancelExportButton');
  const retryExportButton = document.getElementById('retryExportButton');
  const canvasDescription = document.getElementById('canvasDescription');
  const spanDeviceInput = document.getElementById('spanDeviceInput');
  const spanDeviceControls = document.getElementById('spanDeviceControls');
  const spanDeviceHelp = document.getElementById('spanDeviceHelp');
  const spanStartSelect = document.getElementById('spanStartSelect');
  const spanEndSelect = document.getElementById('spanEndSelect');
  const spanSourceSelect = document.getElementById('spanSourceSelect');
  const spanX = document.getElementById('spanX');
  const spanY = document.getElementById('spanY');
  const spanScale = document.getElementById('spanScale');

  const PROJECT_STORAGE_KEY = 'cool-app-studio.project.v4';
  const PROJECT_STORAGE_KEYS = [
    'app-screenshot-forge.project.v4',
    'mockup-studio.project.v4',
    'mockup-studio.project.v3',
  ];
  const CONFIG_STORAGE_KEYS = ['mockup-studio.config.v2', 'mockup-studio.config.v1'];
  const RECOVERY_PREFERENCE_KEY = 'cool-app-studio.recovery.v1.enabled';
  const RECOVERY_DATABASE_NAME = 'cool-app-studio.recovery.v1';
  const RECOVERY_STORE_NAME = 'projects';
  const RECOVERY_RECORD_KEY = 'current';
  const RECOVERY_DEBOUNCE_MS = 450;
  const MAX_PROJECT_FILE_BYTES = 50 * 1024 * 1024;
  const HISTORY_LIMIT = 60;
  const capabilityToken = document.querySelector(
    'meta[name="cool-app-studio-capability"]',
  )?.content;

  function apiFetch(resource, options = {}) {
    const headers = new Headers(options.headers);
    if (capabilityToken) {
      headers.set('X-Cool-App-Studio-Capability', capabilityToken);
    }
    return fetch(resource, { ...options, headers });
  }

  let project;
  let config = MockupScene.normalizeConfig();
  let assets = {
    screenImageUrl: '',
    backgroundImageUrl: '',
    fontDataUrl: '',
    screenshotFileName: '',
    backgroundFileName: '',
    fontFileName: '',
  };
  let loadedFontFace;
  let loadedFontDataUrl = '';
  let toastTimer;
  let historyTimer;
  let history = [];
  let historyIndex = -1;
  let historyEnabled = false;
  let restoringHistory = false;
  let viewMode = 'focus';
  let safeAreaEnabled = false;
  let recoveryEnabled = readRecoveryPreference();
  let recoverySnapshotPresent = false;
  let recoveryTimer;
  let recoveryQueue = Promise.resolve();
  let activeExportJobId = '';
  let exportPollTimer;

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
    toastTimer = window.setTimeout(() => statusToast.classList.remove('is-visible'), 3600);
  }

  function readRecoveryPreference() {
    try {
      return window.localStorage.getItem(RECOVERY_PREFERENCE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  function writeRecoveryPreference(enabled) {
    try {
      window.localStorage.setItem(RECOVERY_PREFERENCE_KEY, String(enabled));
      return true;
    } catch (error) {
      console.warn('Local recovery preference unavailable', error);
      return false;
    }
  }

  function setRecoveryStatus(state, message, hasSnapshot = recoverySnapshotPresent) {
    recoveryStatus.dataset.state = state;
    recoveryStatus.textContent = message;
    clearRecoveryButton.disabled = !hasSnapshot;
  }

  function formatRecoveryTime(timestamp) {
    const date = new Date(timestamp);
    if (!Number.isFinite(date.getTime())) return 'just now';
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  function openRecoveryDatabase() {
    if (!window.indexedDB) {
      return Promise.reject(new Error('IndexedDB is not available in this browser'));
    }
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(RECOVERY_DATABASE_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(RECOVERY_STORE_NAME)) {
          database.createObjectStore(RECOVERY_STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not open local recovery storage'));
      request.onblocked = () => reject(new Error('Local recovery storage is blocked by another browser tab'));
    });
  }

  function runRecoveryTransaction(mode, operation) {
    return openRecoveryDatabase().then((database) => new Promise((resolve, reject) => {
      let result;
      let settled = false;
      let transaction;
      try {
        transaction = database.transaction(RECOVERY_STORE_NAME, mode);
      } catch (error) {
        database.close();
        reject(error);
        return;
      }

      const closeWithError = (error) => {
        if (settled) return;
        settled = true;
        database.close();
        reject(error);
      };

      transaction.oncomplete = () => {
        if (settled) return;
        settled = true;
        database.close();
        resolve(result);
      };
      transaction.onerror = () => {
        closeWithError(transaction.error ?? new Error('Local recovery transaction failed'));
      };
      transaction.onabort = () => {
        closeWithError(transaction.error ?? new Error('Local recovery transaction was aborted'));
      };

      try {
        const request = operation(transaction.objectStore(RECOVERY_STORE_NAME));
        if (request && typeof request.onsuccess !== 'undefined') {
          request.onsuccess = () => { result = request.result; };
          request.onerror = () => {
            try {
              transaction.abort();
            } catch {
              closeWithError(request.error ?? new Error('Local recovery request failed'));
            }
          };
        } else {
          result = request;
        }
      } catch (error) {
        try {
          transaction.abort();
        } catch {
          closeWithError(error);
        }
      }
    }));
  }

  function readRecoverySnapshot() {
    return runRecoveryTransaction('readonly', (store) => store.get(RECOVERY_RECORD_KEY));
  }

  function writeRecoverySnapshot(snapshot) {
    return runRecoveryTransaction('readwrite', (store) => store.put(snapshot, RECOVERY_RECORD_KEY));
  }

  function deleteRecoverySnapshot() {
    return runRecoveryTransaction('readwrite', (store) => store.delete(RECOVERY_RECORD_KEY));
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function isSupportedScreenshot(file) {
    return file?.type?.startsWith('image/')
      || /\.(png|jpe?g|webp|svg)$/i.test(file?.name ?? '');
  }

  function screenshotSlideName(file, existingNames) {
    const base = String(file.name ?? 'Screenshot')
      .replace(/\.[^.]+$/, '')
      .trim()
      || 'Screenshot';
    let name = base;
    let suffix = 2;
    while (existingNames.has(name)) name = `${base} ${suffix++}`;
    existingNames.add(name);
    return name;
  }

  async function importScreenshotFiles(fileList) {
    const files = [...fileList].filter(isSupportedScreenshot);
    if (files.length === 0) {
      showStatus('Choose PNG, JPEG, WebP, or SVG screenshots');
      return;
    }
    syncProjectFromConfig();
    const availableSlots = Math.max(1, 10 - project.slides.length + 1);
    const importedFiles = files.slice(0, availableSlots);
    const skippedCount = files.length - importedFiles.length;
    const selected = currentSlide();
    const selectedIndex = project.slides.indexOf(selected);
    const existingNames = new Set(project.slides.map((slide) => slide.name));
    const importedSlides = [];

    try {
      for (const [fileIndex, file] of importedFiles.entries()) {
        const assetId = MockupProject.createAsset(project, {
          name: file.name,
          type: 'image',
          dataUrl: await fileToDataUrl(file),
        });
        if (fileIndex === 0) {
          selected.screenshotAssetId = assetId;
          if (/^Slide \d+$/.test(selected.name) || selected.name === 'Untitled screenshot') {
            selected.name = screenshotSlideName(file, existingNames);
          }
          continue;
        }
        importedSlides.push({
          id: MockupProject.createId('slide'),
          name: screenshotSlideName(file, existingNames),
          config: { ...selected.config },
          screenshotAssetId: assetId,
        });
      }
      if (importedSlides.length > 0) {
        project.slides.splice(selectedIndex + 1, 0, ...importedSlides);
      }
      updateControlValues();
      updatePreview();
      const importedCount = importedFiles.length;
      const suffix = skippedCount > 0 ? `; ${skippedCount} skipped because the set holds 10 slides` : '';
      showStatus(`${importedCount} screenshot${importedCount === 1 ? '' : 's'} imported${suffix}`);
    } catch (error) {
      showStatus(`Screenshot import failed: ${error.message}`);
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function currentSlide() {
    return MockupProject.selectedSlide(project);
  }

  function assetById(id) {
    return id ? project.assets[id] : null;
  }

  function currentScreenshotAsset() {
    return assetById(currentSlide()?.screenshotAssetId);
  }

  function refreshAssets() {
    const screenshot = currentScreenshotAsset();
    const background = assetById(project.backgroundAssetId);
    const font = assetById(project.fontAssetId);
    assets = {
      screenImageUrl: screenshot?.dataUrl ?? '',
      backgroundImageUrl: background?.dataUrl ?? '',
      fontDataUrl: font?.dataUrl ?? '',
      screenshotFileName: screenshot?.name ?? '',
      backgroundFileName: background?.name ?? '',
      fontFileName: font?.name ?? '',
    };
  }

  function syncProjectFromConfig() {
    if (!project) return;
    MockupProject.syncConfig(project, config, currentSlide());
  }

  function composeSelectedConfig() {
    config = MockupProject.composeConfig(project, currentSlide());
    refreshAssets();
  }

  function repairSpanDevice() {
    project.spanDevice = MockupProject.normalizeSpanDevice(
      project.spanDevice,
      project.slides,
      config,
    );
    return MockupProject.resolveSpanDevice(project);
  }

  function assetsForSlide(slide) {
    return {
      screenImageUrl: assetById(slide?.screenshotAssetId)?.dataUrl ?? '',
      backgroundImageUrl: assetById(project.backgroundAssetId)?.dataUrl ?? '',
      fontDataUrl: assetById(project.fontAssetId)?.dataUrl ?? '',
    };
  }

  function cloneSceneFrame() {
    const sceneFrame = frame.cloneNode(true);
    sceneFrame.removeAttribute('id');
    sceneFrame.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
    return sceneFrame;
  }

  function applySafeAreaGuide(sceneFrame) {
    sceneFrame.classList.toggle('is-safe-area-visible', safeAreaEnabled);
  }

  function projectForStorage() {
    syncProjectFromConfig();
    return MockupProject.serialize(project, false);
  }

  function enqueueRecovery(operation) {
    const next = recoveryQueue.then(operation, operation);
    recoveryQueue = next.catch(() => {});
    return next;
  }

  async function persistRecoveryProjectNow() {
    if (!recoveryEnabled || !project) return;
    setRecoveryStatus('saving', 'On · updating the local recovery copy…');
    try {
      await writeRecoverySnapshot({
        savedAt: Date.now(),
        payload: MockupProject.serialize(project, true),
      });
      recoverySnapshotPresent = true;
      setRecoveryStatus(
        'saved',
        `On · local asset copy updated at ${formatRecoveryTime(Date.now())}.`,
        true,
      );
    } catch (error) {
      console.warn('Local recovery unavailable', error);
      setRecoveryStatus(
        'error',
        'On · local recovery could not be updated. Free browser storage or retry.',
      );
    }
  }

  function scheduleRecoveryPersist({ immediate = false } = {}) {
    window.clearTimeout(recoveryTimer);
    recoveryTimer = undefined;
    if (!recoveryEnabled) return;
    const persist = () => {
      recoveryTimer = undefined;
      enqueueRecovery(persistRecoveryProjectNow);
    };
    if (immediate) persist();
    else recoveryTimer = window.setTimeout(persist, RECOVERY_DEBOUNCE_MS);
  }

  async function clearRecoveryBytes({ announce = false } = {}) {
    window.clearTimeout(recoveryTimer);
    recoveryTimer = undefined;
    return enqueueRecovery(async () => {
      try {
        await deleteRecoverySnapshot();
        const hadSnapshot = recoverySnapshotPresent;
        recoverySnapshotPresent = false;
        setRecoveryStatus(
          recoveryEnabled ? 'empty' : 'off',
          recoveryEnabled
            ? 'On · no local asset copy is retained.'
            : 'Off · asset bytes are not retained in browser storage.',
          false,
        );
        if (announce) showStatus(hadSnapshot ? 'Local recovery bytes cleared' : 'No local recovery bytes to clear');
      } catch (error) {
        console.warn('Could not clear local recovery', error);
        setRecoveryStatus(
          'error',
          'Local recovery could not be cleared. Try again or use browser site-data controls.',
        );
        if (announce) showStatus('Recovery clear failed');
      }
    });
  }

  async function loadRecoveryProject() {
    recoveryInput.checked = recoveryEnabled;
    if (!recoveryEnabled) {
      setRecoveryStatus('off', 'Off · asset bytes are not retained in browser storage.', false);
      return null;
    }
    setRecoveryStatus('saving', 'On · checking for a local recovery copy…', false);
    try {
      const snapshot = await readRecoverySnapshot();
      if (!snapshot?.payload) {
        setRecoveryStatus('empty', 'On · no local asset copy is retained.', false);
        return null;
      }
      const recovered = MockupProject.normalizeProject(snapshot.payload, MockupScene.DEFAULT_CONFIG);
      recoverySnapshotPresent = true;
      setRecoveryStatus(
        'recovered',
        `On · recovered local asset copy from ${formatRecoveryTime(snapshot.savedAt)}.`,
        true,
      );
      return recovered;
    } catch (error) {
      console.warn('Local recovery could not be loaded', error);
      setRecoveryStatus(
        'error',
        'On · recovery copy unavailable; using project metadata instead.',
        false,
      );
      return null;
    }
  }

  function persistProject() {
    try {
      window.localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projectForStorage()));
      for (const key of PROJECT_STORAGE_KEYS) window.localStorage.removeItem(key);
      for (const key of CONFIG_STORAGE_KEYS) window.localStorage.removeItem(key);
    } catch (error) {
      console.warn('Project autosave unavailable', error);
    }
    scheduleRecoveryPersist();
  }

  async function loadStoredProject() {
    const recoveredProject = await loadRecoveryProject();
    if (recoveredProject) return recoveredProject;
    try {
      const storedProject = window.localStorage.getItem(PROJECT_STORAGE_KEY);
      if (storedProject) {
        return MockupProject.normalizeProject(
          JSON.parse(storedProject),
          MockupScene.DEFAULT_CONFIG,
        );
      }
    } catch {
      window.localStorage.removeItem(PROJECT_STORAGE_KEY);
    }
    for (const key of PROJECT_STORAGE_KEYS) {
      try {
        const storedProject = window.localStorage.getItem(key);
        if (storedProject) {
          return MockupProject.normalizeProject(
            JSON.parse(storedProject),
            MockupScene.DEFAULT_CONFIG,
          );
        }
      } catch {
        window.localStorage.removeItem(key);
      }
    }
    for (const key of CONFIG_STORAGE_KEYS) {
      try {
        const storedConfig = window.localStorage.getItem(key);
        if (storedConfig) {
          return MockupProject.createFromConfig(JSON.parse(storedConfig));
        }
      } catch {
        window.localStorage.removeItem(key);
      }
    }
    return MockupProject.createFromConfig(MockupScene.DEFAULT_CONFIG);
  }

  async function fetchSampleDataUrl(device) {
    const response = await fetch(`/sample/${device}`);
    if (!response.ok) throw new Error(`Sample unavailable: ${response.status}`);
    return fileToDataUrl(await response.blob());
  }

  async function ensureSampleAsset(device) {
    const expectedName = device === 'pixel' ? 'Demo · Pixel' : 'Demo · iPhone';
    const existing = Object.values(project.assets).find(
      (asset) => asset.isSample && asset.name === expectedName,
    );
    if (existing) {
      if (!existing.dataUrl) existing.dataUrl = await fetchSampleDataUrl(device);
      return existing.id;
    }
    return MockupProject.createAsset(project, {
      name: expectedName,
      type: 'image',
      isSample: true,
      dataUrl: await fetchSampleDataUrl(device),
    });
  }

  async function hydrateSampleAssets() {
    for (const asset of Object.values(project.assets)) {
      if (!asset.isSample || asset.dataUrl) continue;
      const device = asset.name.includes('Pixel') ? 'pixel' : 'iphone';
      asset.dataUrl = await fetchSampleDataUrl(device);
    }
    const slide = currentSlide();
    if (slide && !slide.screenshotAssetId) {
      slide.screenshotAssetId = await ensureSampleAsset(config.device);
    }
    refreshAssets();
  }

  async function loadCustomFont(dataUrl) {
    if (!dataUrl || loadedFontDataUrl === dataUrl) return;
    if (loadedFontFace) document.fonts.delete(loadedFontFace);
    loadedFontFace = undefined;
    loadedFontDataUrl = '';
    const font = new FontFace(config.customFontName, `url(${dataUrl})`);
    const loaded = await font.load();
    loadedFontFace = loaded;
    loadedFontDataUrl = dataUrl;
    document.fonts.add(loaded);
  }

  async function applyProjectFont() {
    refreshAssets();
    if (config.fontFamily === 'custom' && assets.fontDataUrl) {
      try {
        await loadCustomFont(assets.fontDataUrl);
        return true;
      } catch (error) {
        console.warn('Custom font could not be loaded', error);
        const font = assetById(project.fontAssetId);
        if (font) font.dataUrl = '';
        config = { ...config, fontFamily: 'system' };
        refreshAssets();
        showStatus('Custom font unavailable; using the system font. Reselect the font file to try again.');
        return false;
      }
    }
    if (loadedFontFace) document.fonts.delete(loadedFontFace);
    loadedFontFace = undefined;
    loadedFontDataUrl = '';
    return true;
  }

  function updateHistoryButtons() {
    undoButton.disabled = historyIndex <= 0;
    redoButton.disabled = historyIndex < 0 || historyIndex >= history.length - 1;
  }

  function recordHistoryNow() {
    if (!historyEnabled || restoringHistory) return;
    window.clearTimeout(historyTimer);
    syncProjectFromConfig();
    const state = MockupProject.historyState(project);
    if (history[historyIndex] === state) return;
    history = history.slice(0, historyIndex + 1);
    history.push(state);
    if (history.length > HISTORY_LIMIT) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  function scheduleHistory() {
    if (!historyEnabled || restoringHistory) return;
    window.clearTimeout(historyTimer);
    historyTimer = window.setTimeout(recordHistoryNow, 320);
  }

  function resetHistory() {
    window.clearTimeout(historyTimer);
    syncProjectFromConfig();
    history = [MockupProject.historyState(project)];
    historyIndex = 0;
    historyEnabled = true;
    updateHistoryButtons();
  }

  async function restoreHistoryIndex(nextIndex) {
    if (nextIndex < 0 || nextIndex >= history.length) return;
    window.clearTimeout(historyTimer);
    restoringHistory = true;
    historyIndex = nextIndex;
    project = MockupProject.restoreHistory(project, history[historyIndex]);
    composeSelectedConfig();
    await applyProjectFont();
    updateControlValues();
    updatePreview({ record: false });
    restoringHistory = false;
    updateHistoryButtons();
  }

  function undo() {
    recordHistoryNow();
    return restoreHistoryIndex(historyIndex - 1);
  }

  function redo() {
    recordHistoryNow();
    return restoreHistoryIndex(historyIndex + 1);
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
    document.getElementById('spanXValue').textContent = `${Math.round(project.spanDevice.x * 100)}%`;
    document.getElementById('spanYValue').textContent = `${Math.round(project.spanDevice.y * 100)}%`;
    document.getElementById('spanScaleValue').textContent = `${Math.round(project.spanDevice.scale * 100)}%`;
  }

  function replaceSelectOptions(select, slides, selectedId, indexOffset = 0) {
    select.replaceChildren();
    for (const [index, slide] of slides.entries()) {
      const option = document.createElement('option');
      option.value = slide.id;
      option.textContent = `${index + indexOffset + 1} · ${slide.name}`;
      option.selected = slide.id === selectedId;
      select.append(option);
    }
  }

  function updateSpanControls() {
    const span = repairSpanDevice();
    const canSpan = project.slides.length > 1;
    spanDeviceInput.disabled = !canSpan;
    spanDeviceInput.checked = Boolean(span);
    spanDeviceControls.hidden = !span;
    replaceSelectOptions(spanStartSelect, project.slides, project.spanDevice.startSlideId);
    replaceSelectOptions(spanEndSelect, project.slides, project.spanDevice.endSlideId);
    const startIndex = project.slides.findIndex((slide) => slide.id === project.spanDevice.startSlideId);
    const endIndex = project.slides.findIndex((slide) => slide.id === project.spanDevice.endSlideId);
    const rangeSlides = project.slides.slice(Math.max(0, startIndex), endIndex + 1);
    replaceSelectOptions(spanSourceSelect, rangeSlides, project.spanDevice.sourceSlideId, Math.max(0, startIndex));
    spanX.value = project.spanDevice.x;
    spanY.value = project.spanDevice.y;
    spanScale.value = project.spanDevice.scale;
    if (!canSpan) {
      spanDeviceHelp.textContent = 'Add at least two panels to create a continuous device.';
    } else if (span) {
      spanDeviceHelp.textContent = `One device crosses panels ${span.startIndex + 1}–${span.endIndex + 1}. Set view and export use one continuous render.`;
    } else {
      spanDeviceHelp.textContent = 'Enable this to render one device once, then crop it cleanly across adjacent panels.';
    }
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
    refreshAssets();
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
    projectNameInput.value = project.name;

    const screenshot = currentScreenshotAsset();
    sourceName.textContent = screenshot
      ? `${screenshot.name}${screenshot.dataUrl ? '' : ' · reselect'}`
      : 'No screenshot selected';
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
    updateSpanControls();
    updateConditionalControls();
    updateValueLabels();
  }

  function renderSlideStrip() {
    slideStrip.replaceChildren();
    const span = repairSpanDevice();
    for (const [index, slide] of project.slides.entries()) {
      const slideConfig = MockupProject.composeConfig(project, slide);
      const isSpanned = span && index >= span.startIndex && index <= span.endIndex;
      const screenshot = isSpanned
        ? assetById(project.slides[span.sourceIndex].screenshotAssetId)
        : assetById(slide.screenshotAssetId);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'slide-card';
      button.dataset.slideId = slide.id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(slide.id === project.selectedSlideId));
      button.setAttribute('aria-label', `${index + 1}. ${slide.name}`);
      button.classList.toggle('is-active', slide.id === project.selectedSlideId);
      button.classList.toggle('is-missing', !screenshot?.dataUrl);

      if (screenshot?.dataUrl) {
        const image = document.createElement('img');
        image.className = 'slide-card-image';
        image.src = screenshot.dataUrl;
        image.alt = '';
        button.append(image);
      }
      const number = document.createElement('span');
      number.className = 'slide-card-index';
      number.textContent = String(index + 1);
      if (isSpanned) {
        const spanLabel = document.createElement('span');
        spanLabel.className = 'slide-card-span';
        spanLabel.textContent = 'Span';
        button.append(spanLabel);
      }
      const copy = document.createElement('span');
      copy.className = 'slide-card-copy';
      const name = document.createElement('span');
      name.className = 'slide-card-name';
      name.textContent = slide.name;
      const headline = document.createElement('span');
      headline.className = 'slide-card-headline';
      headline.textContent = screenshot?.dataUrl
        ? (slideConfig.headline || 'Untitled composition')
        : 'Screenshot needs reselecting';
      copy.append(name, headline);
      button.append(number, copy);
      slideStrip.append(button);
    }

    const count = project.slides.length;
    slideCount.textContent = `${count} slide${count === 1 ? '' : 's'}`;
    const selectedIndex = project.slides.findIndex((slide) => slide.id === project.selectedSlideId);
    document.getElementById('deleteSlideButton').disabled = count <= 1;
    document.getElementById('addSlideButton').disabled = count >= 10;
    document.getElementById('duplicateSlideButton').disabled = count >= 10;
    document.getElementById('moveSlideLeftButton').disabled = selectedIndex <= 0;
    document.getElementById('moveSlideRightButton').disabled = selectedIndex < 0 || selectedIndex >= count - 1;
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

  function fitSetOverview() {
    if (setOverview.hidden || project.slides.length === 0) return;
    const totalWidth = config.width * project.slides.length;
    const scale = Math.min(
      setOverview.clientWidth / totalWidth,
      setOverview.clientHeight / config.height,
    ) * 0.92;
    setOverviewCanvas.style.left = `${(setOverview.clientWidth - totalWidth * scale) / 2}px`;
    setOverviewCanvas.style.top = `${(setOverview.clientHeight - config.height * scale) / 2}px`;
    setOverviewCanvas.style.transform = `scale(${scale})`;
  }

  function focusSceneState() {
    const span = repairSpanDevice();
    const selectedIndex = project.slides.indexOf(currentSlide());
    if (!span || selectedIndex < span.startIndex || selectedIndex > span.endIndex) {
      return { sceneConfig: config, sceneAssets: assets, isSpanCrop: false };
    }
    const sourceSlide = project.slides[span.sourceIndex];
    const panelOffset = selectedIndex - span.startIndex;
    const spanCount = span.endIndex - span.startIndex + 1;
    return {
      sceneConfig: {
        ...config,
        preset: 'custom',
        showDevice: true,
        x: span.x * spanCount - panelOffset - 0.5,
        y: span.y,
        scale: span.scale,
        rotateX: span.rotateX,
        rotateY: span.rotateY,
        rotateZ: span.rotateZ,
      },
      sceneAssets: {
        ...assets,
        screenImageUrl: assetById(sourceSlide.screenshotAssetId)?.dataUrl ?? '',
      },
      isSpanCrop: true,
    };
  }

  function renderSetOverview() {
    if (viewMode !== 'set') return;
    const width = Number(config.width);
    const height = Number(config.height);
    const totalWidth = width * project.slides.length;
    const span = repairSpanDevice();
    setOverviewCanvas.replaceChildren();
    setOverviewCanvas.style.width = `${totalWidth}px`;
    setOverviewCanvas.style.height = `${height}px`;

    for (const [index, slide] of project.slides.entries()) {
      const panel = document.createElement('div');
      panel.className = 'overview-panel';
      panel.style.left = `${index * width}px`;
      panel.style.width = `${width}px`;
        const panelFrame = cloneSceneFrame();
        applySafeAreaGuide(panelFrame);
        const isSpanned = span && index >= span.startIndex && index <= span.endIndex;
      MockupScene.applyScene(
        panelFrame,
        { ...MockupProject.composeConfig(project, slide), ...(isSpanned ? { showDevice: false } : {}) },
        assetsForSlide(slide),
      );
      panel.append(panelFrame);
      setOverviewCanvas.append(panel);
    }

    if (span) {
      const sourceSlide = project.slides[span.sourceIndex];
      const sourceConfig = MockupProject.composeConfig(project, sourceSlide);
      const spanCount = span.endIndex - span.startIndex + 1;
      const spanWidth = spanCount * width;
      const overlay = cloneSceneFrame();
      overlay.classList.add('overview-span-layer');
      MockupScene.applyScene(
        overlay,
        {
          ...sourceConfig,
          width,
          height,
          background: 'transparent',
          showDevice: true,
          preset: 'custom',
          x: 0,
          y: span.y,
          scale: span.scale,
          rotateX: span.rotateX,
          rotateY: span.rotateY,
          rotateZ: span.rotateZ,
        },
        assetsForSlide(sourceSlide),
      );
      overlay.style.left = `${span.startIndex * width}px`;
      overlay.style.width = `${spanWidth}px`;
      overlay.style.height = `${height}px`;
      overlay.style.setProperty('--translate-x', `${(span.x - 0.5) * spanWidth}px`);
      setOverviewCanvas.append(overlay);
    }

    for (const [index, slide] of project.slides.entries()) {
      const hit = document.createElement('button');
      hit.type = 'button';
      hit.className = 'overview-panel-hit';
      hit.classList.toggle('is-active', slide.id === project.selectedSlideId);
      hit.dataset.slideId = slide.id;
      hit.style.left = `${index * width}px`;
      hit.style.width = `${width}px`;
      hit.setAttribute('aria-label', `Edit panel ${index + 1}: ${slide.name}`);
      const number = document.createElement('span');
      number.className = 'overview-panel-number';
      number.textContent = String(index + 1);
      hit.append(number);
      setOverviewCanvas.append(hit);
    }

    const spanLabel = span
      ? ` · device spans ${span.startIndex + 1}–${span.endIndex + 1}`
      : '';
    overviewMeta.textContent = `${project.slides.length} panel${project.slides.length === 1 ? '' : 's'}${spanLabel} · click a panel to edit`;
    fitSetOverview();
  }

  function setViewMode(nextMode) {
    viewMode = nextMode === 'set' ? 'set' : 'focus';
    previewViewport.hidden = viewMode === 'set';
    setOverview.hidden = viewMode !== 'set';
    document.querySelectorAll('[data-view-mode]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.viewMode === viewMode);
    });
    viewModeHint.textContent = viewMode === 'set'
      ? 'Exact set canvas · panel lines are export crop boundaries'
      : 'Editing the selected panel';
    if (viewMode === 'set') renderSetOverview();
    else fitPreview();
  }

  function copyBoundsWarning() {
    const copy = frame.querySelector('.copy-block');
    if (!copy || !copy.textContent.trim()) return '';
    const frameRect = frame.getBoundingClientRect();
    const copyRect = copy.getBoundingClientRect();
    const tolerance = Math.max(2, frameRect.width / Math.max(1, config.width) * 4);
    if (copyRect.right > frameRect.right + tolerance || copyRect.bottom > frameRect.bottom + tolerance) {
      return 'copy extends beyond the canvas; reduce its size or move it upward';
    }
    return '';
  }

  function updatePreflight() {
    const target = MockupScene.CANVAS_PRESETS[config.canvasPreset];
    const warnings = [];
    const checks = [];
    const addCheck = (state, message) => checks.push({ state, message });
    if (target) {
      const dimensionsMatch = Number(config.width) === target.width && Number(config.height) === target.height
        || target.allowOrientation
          && Number(config.width) === target.height
          && Number(config.height) === target.width;
      if (dimensionsMatch) {
        addCheck('ready', `${target.label} dimensions match`);
      } else {
        warnings.push('canvas dimensions do not match the selected store target');
        addCheck('warning', 'Canvas dimensions do not match the selected store target');
      }
    } else {
      warnings.push('choose a store target to validate dimensions');
      addCheck('warning', 'Choose a store target to validate dimensions');
    }
    if (target?.platform === 'google' && config.background === 'transparent') {
      warnings.push('Google Play PNGs cannot contain transparency');
      addCheck('warning', 'Google Play PNGs cannot contain transparency');
    } else if (config.background !== 'transparent') {
      addCheck('ready', 'Output has an opaque background');
    }
    const span = repairSpanDevice();
    const selectedIndex = project.slides.indexOf(currentSlide());
    const selectedUsesSpan = span && selectedIndex >= span.startIndex && selectedIndex <= span.endIndex;
    if (selectedUsesSpan) {
      if (!assetById(project.slides[span.sourceIndex].screenshotAssetId)?.dataUrl) {
        warnings.push('reselect the spanning device source screenshot');
        addCheck('warning', 'Reselect the spanning device source screenshot');
      } else {
        addCheck('ready', 'Spanning source screenshot is available');
      }
    } else if (!assets.screenImageUrl) {
      warnings.push('reselect this slide’s screenshot');
      addCheck('warning', 'Reselect this slide’s screenshot');
    } else {
      addCheck('ready', 'Selected screenshot is available');
    }
    if (config.background === 'image' && !assets.backgroundImageUrl) {
      warnings.push('reselect the shared background image');
      addCheck('warning', 'Reselect the shared background image');
    } else if (config.background === 'image') {
      addCheck('ready', 'Shared background image is available');
    }
    if (config.fontFamily === 'custom' && !assets.fontDataUrl) {
      warnings.push('reselect the shared font file');
      addCheck('warning', 'Reselect the shared font file');
    } else if (config.fontFamily === 'custom') {
      addCheck('ready', 'Shared local font is available');
    }
    const missingScreens = project.slides.filter((slide, index) => {
      if (span && index >= span.startIndex && index <= span.endIndex) return false;
      return !assetById(slide.screenshotAssetId)?.dataUrl;
    }).length;
    if (missingScreens > 0 && (selectedUsesSpan || assets.screenImageUrl)) {
      warnings.push(`${missingScreens} other slide${missingScreens === 1 ? '' : 's'} need screenshots`);
      addCheck('warning', `${missingScreens} other slide${missingScreens === 1 ? '' : 's'} need screenshots`);
    } else if (project.slides.length > 1) {
      addCheck('ready', `All ${project.slides.length} slide screenshots are available`);
    }
    const copyWarning = copyBoundsWarning();
    if (copyWarning) {
      warnings.push(copyWarning);
      addCheck('warning', 'Copy extends beyond the canvas');
    } else if (config.headline || config.subhead || config.kicker) {
      addCheck('ready', 'Copy fits within the canvas');
    }
    const label = target?.label ?? 'Custom canvas';
    previewMeta.textContent = `${config.width} × ${config.height} · ${label}`;
    preflightStatus.textContent = warnings.length
      ? `${label} · ${warnings.join('; ')}.`
      : `${label} · ${project.slides.length}-slide set ready to export.`;
    preflightStatus.classList.toggle('is-warning', warnings.length > 0);
    preflightList.replaceChildren();
    for (const check of checks) {
      const item = document.createElement('li');
      item.className = `preflight-check is-${check.state}`;
      const state = document.createElement('span');
      state.className = 'preflight-check-state';
      state.textContent = check.state === 'warning' ? 'Check' : 'Ready';
      const message = document.createElement('span');
      message.textContent = check.message;
      item.append(state, message);
      preflightList.append(item);
    }
  }

  function updatePreview({ record = true } = {}) {
    syncProjectFromConfig();
    refreshAssets();
    const focusState = focusSceneState();
    MockupScene.applyScene(frame, focusState.sceneConfig, focusState.sceneAssets);
    applySafeAreaGuide(frame);
    fitPreview();
    renderSetOverview();
    updateValueLabels();
    updatePreflight();
    renderSlideStrip();
    persistProject();
    if (record) scheduleHistory();
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

  async function selectSlide(slideId, { record = true } = {}) {
    if (!project.slides.some((slide) => slide.id === slideId)) return;
    syncProjectFromConfig();
    project.selectedSlideId = slideId;
    composeSelectedConfig();
    await applyProjectFont();
    updateControlValues();
    updatePreview({ record: false });
    slideStrip.querySelector(`[data-slide-id="${slideId}"]`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
    if (record) recordHistoryNow();
  }

  async function addSlide() {
    if (project.slides.length >= 10) return;
    syncProjectFromConfig();
    const defaults = MockupProject.createFromConfig(MockupScene.DEFAULT_CONFIG).slides[0].config;
    const slideId = MockupProject.createId('slide');
    const slide = {
      id: slideId,
      name: `Slide ${project.slides.length + 1}`,
      config: defaults,
      screenshotAssetId: await ensureSampleAsset(config.device),
    };
    project.slides.push(slide);
    project.selectedSlideId = slideId;
    composeSelectedConfig();
    updateControlValues();
    updatePreview({ record: false });
    recordHistoryNow();
    showStatus('Slide added');
  }

  function duplicateSlide() {
    if (project.slides.length >= 10) return;
    syncProjectFromConfig();
    const source = currentSlide();
    const sourceIndex = project.slides.indexOf(source);
    const copy = {
      id: MockupProject.createId('slide'),
      name: `${source.name} copy`,
      config: { ...source.config },
      screenshotAssetId: source.screenshotAssetId,
    };
    project.slides.splice(sourceIndex + 1, 0, copy);
    project.selectedSlideId = copy.id;
    composeSelectedConfig();
    updateControlValues();
    updatePreview({ record: false });
    recordHistoryNow();
    showStatus('Slide duplicated');
  }

  function renameSlide() {
    const slide = currentSlide();
    const name = window.prompt('Slide name', slide.name)?.trim();
    if (!name || name === slide.name) return;
    slide.name = name;
    updatePreview({ record: false });
    recordHistoryNow();
  }

  function deleteSlide() {
    if (project.slides.length <= 1) return;
    const slide = currentSlide();
    if (!window.confirm(`Delete “${slide.name}”?`)) return;
    const index = project.slides.indexOf(slide);
    project.slides.splice(index, 1);
    project.selectedSlideId = project.slides[Math.min(index, project.slides.length - 1)].id;
    composeSelectedConfig();
    updateControlValues();
    updatePreview({ record: false });
    recordHistoryNow();
    showStatus('Slide deleted');
  }

  function moveSlide(direction) {
    syncProjectFromConfig();
    const slide = currentSlide();
    const index = project.slides.indexOf(slide);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= project.slides.length) return;
    [project.slides[index], project.slides[nextIndex]] = [
      project.slides[nextIndex],
      project.slides[index],
    ];
    updatePreview({ record: false });
    recordHistoryNow();
  }

  async function newProject() {
    if (!window.confirm('Start a new screenshot set? Unsaved project changes will be replaced.')) return;
    project = MockupProject.createFromConfig(MockupScene.DEFAULT_CONFIG);
    config = MockupProject.composeConfig(project);
    currentSlide().screenshotAssetId = await ensureSampleAsset(config.device);
    refreshAssets();
    await applyProjectFont();
    updateControlValues();
    updatePreview({ record: false });
    resetHistory();
    showStatus('New screenshot set created');
  }

  function saveProject() {
    syncProjectFromConfig();
    const payload = MockupProject.serialize(project, true);
    payload.savedAt = new Date().toISOString();
    payload.localOnly = true;
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
      `${MockupProject.safeFilename(project.name)}.cool-app-studio`,
    );
    showStatus(`Project saved with ${Object.keys(payload.project.assets).length} local assets`);
  }

  async function openProjectFile(file) {
    if (file.size > MAX_PROJECT_FILE_BYTES) {
      throw new Error('Project file exceeds the 50 MB local limit');
    }
    const parsed = JSON.parse(await file.text());
    project = MockupProject.normalizeProject(parsed, MockupScene.DEFAULT_CONFIG);
    config = MockupProject.composeConfig(project);
    await hydrateSampleAssets();
    composeSelectedConfig();
    await applyProjectFont();
    updateControlValues();
    updatePreview({ record: false });
    resetHistory();
    showStatus(`Opened ${file.name}`);
  }

  function createBatchPayload() {
    const assetData = Object.fromEntries(
      Object.entries(project.assets)
        .filter(([, asset]) => asset.dataUrl)
        .map(([id, asset]) => [id, asset.dataUrl]),
    );
    const items = project.slides.map((slide, index) => {
      const slideConfig = MockupProject.composeConfig(project, slide);
      return {
        filename: `${String(index + 1).padStart(2, '0')}-${MockupProject.safeFilename(slide.name)}-${slideConfig.width}x${slideConfig.height}.png`,
        config: slideConfig,
        screenshotAssetId: slide.screenshotAssetId,
        backgroundAssetId: project.backgroundAssetId,
        fontAssetId: project.fontAssetId,
      };
    });
    const span = repairSpanDevice();
    return {
      items,
      assets: assetData,
      ...(span ? {
        spanDevice: {
          enabled: true,
          startIndex: span.startIndex,
          endIndex: span.endIndex,
          sourceIndex: span.sourceIndex,
          x: span.x,
          y: span.y,
          scale: span.scale,
          rotateX: span.rotateX,
          rotateY: span.rotateY,
          rotateZ: span.rotateZ,
        },
      } : {}),
    };
  }

  function validateExportAssets(allSlides = true) {
    const missing = [];
    const span = repairSpanDevice();
    const selectedIndex = project.slides.indexOf(currentSlide());
    const indices = allSlides
      ? project.slides.map((_, index) => index)
      : [selectedIndex];
    const usesSpan = span && indices.some((index) => index >= span.startIndex && index <= span.endIndex);
    if (usesSpan && !assetById(project.slides[span.sourceIndex].screenshotAssetId)?.dataUrl) {
      missing.push(`spanning source “${project.slides[span.sourceIndex].name}”`);
    }
    for (const index of indices) {
      if (span && index >= span.startIndex && index <= span.endIndex) continue;
      const slide = project.slides[index];
      if (!assetById(slide.screenshotAssetId)?.dataUrl) missing.push(`“${slide.name}”`);
    }
    if (missing.length > 0) {
      throw new Error(`Reselect screenshots for ${missing.join(', ')}`);
    }
    if (config.background === 'image' && !assetById(project.backgroundAssetId)?.dataUrl) {
      throw new Error('Reselect the shared background image');
    }
    if (config.fontFamily === 'custom' && !assetById(project.fontAssetId)?.dataUrl) {
      throw new Error('Reselect the shared font file');
    }
  }

  function setExportProgress({ state, label, completed, total }) {
    const safeTotal = Number(total) || 0;
    const safeCompleted = Math.max(0, Math.min(safeTotal, Number(completed) || 0));
    const percent = safeTotal > 0 ? Math.round((safeCompleted / safeTotal) * 100) : 0;
    exportProgress.hidden = false;
    exportProgress.dataset.state = state;
    exportProgressLabel.textContent = label;
    exportProgressCount.textContent = `${safeCompleted} / ${safeTotal}`;
    exportProgressBar.style.transform = `scaleX(${percent / 100})`;
    exportProgressTrack.setAttribute('aria-valuenow', String(percent));
    const isActive = ['queued', 'running', 'cancelling'].includes(state);
    cancelExportButton.hidden = !isActive;
    cancelExportButton.disabled = state === 'cancelling';
    retryExportButton.hidden = !['cancelled', 'failed'].includes(state);
    exportButton.disabled = isActive;
    exportSetButton.disabled = isActive;
    exportSetButton.textContent = isActive ? 'Exporting…' : 'Export set';
  }

  function waitForExportPoll() {
    return new Promise((resolve) => {
      exportPollTimer = window.setTimeout(resolve, 240);
    });
  }

  async function pollExportJob(jobId, total) {
    while (activeExportJobId === jobId) {
      const response = await apiFetch(`/api/export-job/${encodeURIComponent(jobId)}`);
      if (!response.ok) throw new Error(await response.text());
      const job = await response.json();
      if (activeExportJobId !== jobId) return;
      if (job.state === 'queued' || job.state === 'running' || job.state === 'cancelling') {
        setExportProgress({
          state: job.state,
          label: job.state === 'cancelling' ? 'Cancelling export…' : 'Rendering screenshot set…',
          completed: job.completed,
          total: job.total ?? total,
        });
        await waitForExportPoll();
        continue;
      }
      if (job.state === 'cancelled') {
        setExportProgress({ state: 'cancelled', label: 'Export cancelled', completed: job.completed, total: job.total ?? total });
        showStatus('Set export cancelled');
        activeExportJobId = '';
        return;
      }
      if (job.state === 'failed') {
        setExportProgress({ state: 'failed', label: `Export failed: ${job.error ?? 'unknown render error'}`, completed: job.completed, total: job.total ?? total });
        showStatus(`Set export failed: ${job.error ?? 'unknown render error'}`);
        activeExportJobId = '';
        return;
      }
      if (job.state === 'completed') {
        setExportProgress({ state: 'completed', label: 'Export complete', completed: job.total, total: job.total });
        const archiveResponse = await apiFetch(job.downloadUrl);
        if (!archiveResponse.ok) throw new Error(await archiveResponse.text());
        downloadBlob(
          await archiveResponse.blob(),
          `${MockupProject.safeFilename(project.name)}-${config.canvasPreset}.zip`,
        );
        showStatus(`${job.total}-slide set rendered locally`);
        activeExportJobId = '';
        return;
      }
      throw new Error(`Unknown export state: ${job.state}`);
    }
  }

  async function cancelExport() {
    if (!activeExportJobId) return;
    const jobId = activeExportJobId;
    cancelExportButton.disabled = true;
    try {
      await apiFetch(`/api/export-job/${encodeURIComponent(jobId)}`, { method: 'DELETE' });
      setExportProgress({ state: 'cancelling', label: 'Cancelling export…', completed: 0, total: project.slides.length });
    } catch (error) {
      cancelExportButton.disabled = false;
      showStatus(`Could not cancel export: ${error.message}`);
    }
  }

  async function exportCurrentSlide() {
    syncProjectFromConfig();
    exportButton.disabled = true;
    exportButton.textContent = 'Rendering…';
    try {
      validateExportAssets(false);
      const span = repairSpanDevice();
      const selectedIndex = project.slides.indexOf(currentSlide());
      const isSpanned = span && selectedIndex >= span.startIndex && selectedIndex <= span.endIndex;
      const endpoint = isSpanned ? '/api/render-batch' : '/api/render';
      let payload = { config, assets };
      if (isSpanned) {
        const batch = createBatchPayload();
        payload = {
          ...batch,
          items: batch.items.slice(span.startIndex, span.endIndex + 1),
          spanDevice: {
            ...batch.spanDevice,
            startIndex: 0,
            endIndex: span.endIndex - span.startIndex,
            sourceIndex: span.sourceIndex - span.startIndex,
          },
          outputIndex: selectedIndex - span.startIndex,
        };
      }
      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      const index = project.slides.indexOf(currentSlide()) + 1;
      const target = config.canvasPreset === 'custom' ? 'custom' : config.canvasPreset;
      const filename = `${String(index).padStart(2, '0')}-${MockupProject.safeFilename(currentSlide().name)}-${target}-${config.width}x${config.height}.png`;
      downloadBlob(blob, filename);
      showStatus('PNG rendered locally');
    } catch (error) {
      console.error(error);
      showStatus(`Export failed: ${error.message}`);
    } finally {
      exportButton.disabled = false;
      exportButton.textContent = 'Export PNG';
    }
  }

  async function exportProjectSet() {
    if (activeExportJobId) return;
    syncProjectFromConfig();
    try {
      validateExportAssets();
    } catch (error) {
      showStatus(`Set export blocked: ${error.message}`);
      return;
    }

    setExportProgress({
      state: 'queued',
      label: 'Preparing export…',
      completed: 0,
      total: project.slides.length,
    });
    try {
      const response = await apiFetch('/api/render-batch-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createBatchPayload()),
      });
      if (!response.ok) throw new Error(await response.text());
      const job = await response.json();
      activeExportJobId = job.jobId;
      setExportProgress({
        state: 'queued',
        label: 'Queued for local rendering…',
        completed: 0,
        total: job.total ?? project.slides.length,
      });
      await pollExportJob(job.jobId, job.total ?? project.slides.length);
    } catch (error) {
      console.error(error);
      activeExportJobId = '';
      setExportProgress({
        state: 'failed',
        label: `Export failed: ${error.message}`,
        completed: 0,
        total: project.slides.length,
      });
      showStatus(`Set export failed: ${error.message}`);
    }
  }

  function updateSpanRange(changedKey, slideId) {
    let startIndex = project.slides.findIndex((slide) => slide.id === project.spanDevice.startSlideId);
    let endIndex = project.slides.findIndex((slide) => slide.id === project.spanDevice.endSlideId);
    const changedIndex = project.slides.findIndex((slide) => slide.id === slideId);
    if (changedKey === 'start') startIndex = changedIndex;
    else endIndex = changedIndex;
    if (startIndex >= endIndex) {
      if (changedKey === 'start') {
        startIndex = Math.min(startIndex, project.slides.length - 2);
        endIndex = startIndex + 1;
      } else {
        endIndex = Math.max(1, endIndex);
        startIndex = endIndex - 1;
      }
    }
    if (endIndex - startIndex > 4) {
      if (changedKey === 'start') endIndex = startIndex + 4;
      else startIndex = endIndex - 4;
    }
    const sourceIndex = project.slides.findIndex(
      (slide) => slide.id === project.spanDevice.sourceSlideId,
    );
    project.spanDevice = {
      ...project.spanDevice,
      startSlideId: project.slides[startIndex].id,
      endSlideId: project.slides[endIndex].id,
      sourceSlideId: sourceIndex >= startIndex && sourceIndex <= endIndex
        ? project.spanDevice.sourceSlideId
        : project.slides[startIndex].id,
    };
    updateControlValues();
    updatePreview();
  }

  document.getElementById('viewModeButtons').addEventListener('click', (event) => {
    const button = event.target.closest('[data-view-mode]');
    if (button) setViewMode(button.dataset.viewMode);
  });

  setOverview.addEventListener('click', (event) => {
    const panel = event.target.closest('[data-slide-id]');
    if (panel) selectSlide(panel.dataset.slideId);
  });

  spanDeviceInput.addEventListener('change', () => {
    syncProjectFromConfig();
    if (spanDeviceInput.checked && project.slides.length > 1) {
      const selectedIndex = project.slides.indexOf(currentSlide());
      const startIndex = Math.min(selectedIndex, project.slides.length - 2);
      const endIndex = startIndex + 1;
      project.spanDevice = MockupProject.normalizeSpanDevice(
        {
          ...project.spanDevice,
          enabled: true,
          startSlideId: project.slides[startIndex].id,
          endSlideId: project.slides[endIndex].id,
          sourceSlideId: currentSlide().id,
          x: 0.5,
          y: config.y,
          scale: Math.max(1, config.scale),
          rotateX: config.rotateX,
          rotateY: config.rotateY,
          rotateZ: config.rotateZ,
        },
        project.slides,
        config,
      );
      setViewMode('set');
      showStatus(`Device now spans panels ${startIndex + 1}–${endIndex + 1}`);
    } else {
      project.spanDevice = { ...project.spanDevice, enabled: false };
      showStatus('Spanning device disabled');
    }
    updateControlValues();
    updatePreview();
  });

  spanStartSelect.addEventListener('change', () => updateSpanRange('start', spanStartSelect.value));
  spanEndSelect.addEventListener('change', () => updateSpanRange('end', spanEndSelect.value));
  spanSourceSelect.addEventListener('change', () => {
    project.spanDevice = { ...project.spanDevice, sourceSlideId: spanSourceSelect.value };
    updatePreview();
  });
  for (const [element, key] of [[spanX, 'x'], [spanY, 'y'], [spanScale, 'scale']]) {
    element.addEventListener('input', () => {
      project.spanDevice = { ...project.spanDevice, [key]: Number(element.value) };
      updatePreview();
    });
  }
  document.getElementById('spanUseSelectedButton').addEventListener('click', () => {
    project.spanDevice = {
      ...project.spanDevice,
      rotateX: config.rotateX,
      rotateY: config.rotateY,
      rotateZ: config.rotateZ,
    };
    updatePreview();
    showStatus(`Spanning device uses ${currentSlide().name}’s 3D angle`);
  });

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
    config = event.target.value === 'custom'
      ? { ...config, canvasPreset: 'custom' }
      : MockupScene.applyCanvasPreset(config, event.target.value, config.orientation);
    updateControlValues();
    updatePreview();
  });

  document.getElementById('orientationButtons').addEventListener('click', (event) => {
    const button = event.target.closest('[data-orientation]');
    if (!button || button.disabled) return;
    const orientation = button.dataset.orientation;
    if (config.canvasPreset === 'custom') {
      const isLandscape = config.width > config.height;
      config = (orientation === 'landscape') !== isLandscape
        ? { ...config, width: config.height, height: config.width, orientation }
        : { ...config, orientation };
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
    showStatus('This slide was fit to the shared canvas');
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

  controls.fontFamily.addEventListener('change', async (event) => {
    config = { ...config, fontFamily: event.target.value };
    await applyProjectFont();
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
    const sampleAssetId = await ensureSampleAsset(config.device);
    for (const slide of project.slides) {
      if (assetById(slide.screenshotAssetId)?.isSample) {
        slide.screenshotAssetId = sampleAssetId;
      }
    }
    updateControlValues();
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
  sourceDropzone.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    sourceInput.click();
  });
  sourceDropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    sourceDropzone.classList.add('is-dragging');
  });
  sourceDropzone.addEventListener('dragleave', () => sourceDropzone.classList.remove('is-dragging'));
  sourceDropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    sourceDropzone.classList.remove('is-dragging');
    void importScreenshotFiles(event.dataTransfer.files);
  });
  sourceInput.addEventListener('change', () => {
    void importScreenshotFiles(sourceInput.files);
    sourceInput.value = '';
  });

  document.addEventListener('paste', (event) => {
    const target = event.target;
    const isEditing = target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || target?.isContentEditable;
    if (isEditing || !event.clipboardData?.files?.length) return;
    event.preventDefault();
    void importScreenshotFiles(event.clipboardData.files);
  });

  backgroundImageButton.addEventListener('click', () => backgroundImageInput.click());
  backgroundImageInput.addEventListener('change', async () => {
    const [file] = backgroundImageInput.files;
    if (!file) return;
    try {
      project.backgroundAssetId = MockupProject.createAsset(project, {
        name: file.name,
        type: 'image',
        dataUrl: await fileToDataUrl(file),
      });
      config = { ...config, background: 'image' };
      updateControlValues();
      updatePreview();
      showStatus('Shared background selected');
    } catch (error) {
      showStatus(`Background failed: ${error.message}`);
    } finally {
      backgroundImageInput.value = '';
    }
  });

  document.getElementById('removeBackgroundImageButton').addEventListener('click', () => {
    project.backgroundAssetId = null;
    updateControlValues();
    updatePreview();
  });

  fontFileButton.addEventListener('click', () => fontFileInput.click());
  fontFileInput.addEventListener('change', async () => {
    const [file] = fontFileInput.files;
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      const assetId = MockupProject.createAsset(project, {
        name: file.name,
        type: 'font',
        dataUrl,
      });
      project.fontAssetId = assetId;
      config = { ...config, fontFamily: 'custom' };
      const loaded = await applyProjectFont();
      updateControlValues();
      updatePreview();
      if (loaded) showStatus('Shared local font loaded');
    } catch (error) {
      console.error(error);
      showStatus(`Font failed: ${error.message}`);
    } finally {
      fontFileInput.value = '';
    }
  });

  document.getElementById('resetBackgroundButton').addEventListener('click', () => {
    const defaults = MockupScene.DEFAULT_CONFIG;
    const keys = [
      'background', 'backgroundColorA', 'backgroundColorB', 'backgroundAngle',
      'backgroundImageFit', 'backgroundImageX', 'backgroundImageY', 'backgroundImageZoom',
      'backgroundImageBlur', 'backgroundOverlay', 'backgroundOverlayOpacity', 'accent',
    ];
    config = { ...config, ...Object.fromEntries(keys.map((key) => [key, defaults[key]])) };
    project.backgroundAssetId = null;
    updateControlValues();
    updatePreview();
  });

  document.getElementById('resetTypographyButton').addEventListener('click', async () => {
    const defaults = MockupScene.DEFAULT_CONFIG;
    const keys = [
      'fontFamily', 'customFontName', 'textAlign', 'autoTextColors', 'headlineSize',
      'headlineWeight', 'headlineLineHeight', 'headlineTracking', 'headlineColor',
      'subheadSize', 'subheadWeight', 'subheadLineHeight', 'subheadColor',
      'kickerSize', 'kickerWeight', 'kickerTracking', 'kickerColor', 'kickerUppercase',
      'copyWidth', 'copyTop', 'copyLeft',
    ];
    config = { ...config, ...Object.fromEntries(keys.map((key) => [key, defaults[key]])) };
    project.fontAssetId = null;
    await applyProjectFont();
    updateControlValues();
    updatePreview();
  });

  safeAreaInput.addEventListener('change', () => {
    safeAreaEnabled = safeAreaInput.checked;
    applySafeAreaGuide(frame);
    if (viewMode === 'set') renderSetOverview();
  });

  recoveryInput.addEventListener('change', async () => {
    const enabled = recoveryInput.checked;
    if (!writeRecoveryPreference(enabled)) {
      recoveryInput.checked = recoveryEnabled;
      setRecoveryStatus('error', 'Recovery preference could not be saved in this browser.');
      return;
    }
    recoveryEnabled = enabled;
    if (enabled) {
      setRecoveryStatus('saving', 'On · creating a local recovery copy…');
      scheduleRecoveryPersist({ immediate: true });
      showStatus('Local recovery enabled');
      return;
    }
    await clearRecoveryBytes({ announce: true });
  });

  clearRecoveryButton.addEventListener('click', () => {
    void clearRecoveryBytes({ announce: true });
  });

  projectNameInput.addEventListener('input', (event) => {
    project.name = event.target.value;
    persistProject();
    scheduleHistory();
  });
  projectNameInput.addEventListener('change', (event) => {
    project.name = event.target.value.trim() || 'Untitled screenshot set';
    projectNameInput.value = project.name;
    persistProject();
    recordHistoryNow();
  });

  loadPresetButton.addEventListener('click', () => presetInput.click());
  presetInput.addEventListener('change', async () => {
    const [file] = presetInput.files;
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      config = MockupScene.normalizeConfig(parsed.config ?? parsed);
      if (config.background === 'image') {
        project.backgroundAssetId = parsed.assetHints?.background
          ? MockupProject.createAsset(project, {
              name: parsed.assetHints.background,
              type: 'image',
            })
          : null;
      }
      if (config.fontFamily === 'custom') {
        project.fontAssetId = parsed.assetHints?.font
          ? MockupProject.createAsset(project, {
              name: parsed.assetHints.font,
              type: 'font',
            })
          : null;
      }
      await applyProjectFont();
      updateControlValues();
      updatePreview();
      showStatus(`Applied ${file.name} to this set and slide`);
    } catch (error) {
      console.error(error);
      showStatus(`Preset failed: ${error.message}`);
    } finally {
      presetInput.value = '';
    }
  });

  savePresetButton.addEventListener('click', () => {
    syncProjectFromConfig();
    const payload = JSON.stringify(
      {
        schemaVersion: 2,
        requirementsVerified: '2026-07-14',
        config,
        assetHints: {
          screenshot: assets.screenshotFileName || null,
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

  slideStrip.addEventListener('click', (event) => {
    const button = event.target.closest('[data-slide-id]');
    if (button) selectSlide(button.dataset.slideId);
  });
  document.getElementById('addSlideButton').addEventListener('click', addSlide);
  document.getElementById('duplicateSlideButton').addEventListener('click', duplicateSlide);
  document.getElementById('renameSlideButton').addEventListener('click', renameSlide);
  document.getElementById('deleteSlideButton').addEventListener('click', deleteSlide);
  document.getElementById('moveSlideLeftButton').addEventListener('click', () => moveSlide(-1));
  document.getElementById('moveSlideRightButton').addEventListener('click', () => moveSlide(1));
  document.getElementById('newProjectButton').addEventListener('click', newProject);
  undoButton.addEventListener('click', undo);
  redoButton.addEventListener('click', redo);
  projectOpenButton.addEventListener('click', () => projectInput.click());
  projectSaveButton.addEventListener('click', saveProject);
  projectInput.addEventListener('change', async () => {
    const [file] = projectInput.files;
    if (!file) return;
    try {
      await openProjectFile(file);
    } catch (error) {
      console.error(error);
      showStatus(`Project failed: ${error.message}`);
    } finally {
      projectInput.value = '';
    }
  });
  cancelExportButton.addEventListener('click', cancelExport);
  retryExportButton.addEventListener('click', exportProjectSet);
  exportButton.addEventListener('click', exportCurrentSlide);
  exportSetButton.addEventListener('click', exportProjectSet);

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    const isEditing = target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || target?.isContentEditable;
    if (isEditing) return;
    const command = event.metaKey || event.ctrlKey;
    if (command && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }
    if (command && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      redo();
      return;
    }
    if (command && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      duplicateSlide();
      return;
    }
    if (command && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveProject();
      return;
    }
    if (event.altKey && event.key === 'ArrowLeft') {
      event.preventDefault();
      moveSlide(-1);
    }
    if (event.altKey && event.key === 'ArrowRight') {
      event.preventDefault();
      moveSlide(1);
    }
  });

  window.addEventListener('resize', () => {
    fitPreview();
    fitSetOverview();
  });

  window.addEventListener('pagehide', () => {
    scheduleRecoveryPersist({ immediate: true });
  });

  (async () => {
    try {
      project = await loadStoredProject();
      config = MockupProject.composeConfig(project);
      await hydrateSampleAssets();
      composeSelectedConfig();
      await applyProjectFont();
      updateControlValues();
      updatePreview({ record: false });
      resetHistory();
      window.studioReady = true;
      window.coolAppStudio = {
        getProject: () => MockupProject.serialize(project, true),
        selectSlide,
        addSlide,
        duplicateSlide,
        setViewMode,
        undo,
        redo,
      };
      window.mockupStudio = window.coolAppStudio;
    } catch (error) {
      console.error(error);
      showStatus(error.message);
    }
  })();
})();
