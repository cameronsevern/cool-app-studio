(() => {
  const frame = document.getElementById('exportFrame');
  const previewViewport = document.getElementById('previewViewport');
  const previewScale = document.getElementById('previewScale');
  const previewMeta = document.getElementById('previewMeta');
  const sourceButton = document.getElementById('sourceButton');
  const sourceInput = document.getElementById('sourceInput');
  const sourceName = document.getElementById('sourceName');
  const exportButton = document.getElementById('exportButton');
  const loadPresetButton = document.getElementById('loadPresetButton');
  const savePresetButton = document.getElementById('savePresetButton');
  const presetInput = document.getElementById('presetInput');
  const statusToast = document.getElementById('statusToast');

  const STORAGE_KEY = 'mockup-studio.config.v1';

  let config = MockupScene.normalizeConfig();
  let imageDataUrl = '';
  let usingSample = true;
  let toastTimer;

  const controls = {
    device: document.getElementById('deviceSelect'),
    showDevice: document.getElementById('showDeviceInput'),
    background: document.getElementById('backgroundSelect'),
    accent: document.getElementById('accentInput'),
    headlineSize: document.getElementById('headlineSize'),
    subheadSize: document.getElementById('subheadSize'),
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
    headlineSize: document.getElementById('headlineSizeValue'),
    subheadSize: document.getElementById('subheadSizeValue'),
    copyWidth: document.getElementById('copyWidthValue'),
    copyTop: document.getElementById('copyTopValue'),
    copyLeft: document.getElementById('copyLeftValue'),
  };

  function showStatus(message) {
    window.clearTimeout(toastTimer);
    statusToast.textContent = message;
    statusToast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => statusToast.classList.remove('is-visible'), 2800);
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
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? MockupScene.normalizeConfig(JSON.parse(stored)) : null;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  async function fetchSample(device) {
    const response = await fetch(`/sample/${device}`);
    if (!response.ok) throw new Error(`Sample unavailable: ${response.status}`);
    const blob = await response.blob();
    imageDataUrl = await fileToDataUrl(blob);
    sourceName.textContent = device === 'pixel' ? 'Demo · Pixel' : 'Demo · iPhone';
  }

  function updateValueLabels() {
    valueLabels.rotateX.textContent = `${config.rotateX}°`;
    valueLabels.rotateY.textContent = `${config.rotateY}°`;
    valueLabels.rotateZ.textContent = `${config.rotateZ}°`;
    valueLabels.scale.textContent = `${Math.round(config.scale * 100)}%`;
    valueLabels.x.textContent = `${Math.round(config.x * 100)}%`;
    valueLabels.y.textContent = `${Math.round(config.y * 100)}%`;
    valueLabels.headlineSize.textContent = `${Math.round(config.headlineSize)} px`;
    valueLabels.subheadSize.textContent = `${Math.round(config.subheadSize)} px`;
    valueLabels.copyWidth.textContent = `${Math.round(config.copyWidth * 100)}%`;
    valueLabels.copyTop.textContent = `${Math.round(config.copyTop * 100)}%`;
    valueLabels.copyLeft.textContent = `${Math.round(config.copyLeft * 100)}%`;
  }

  function updateControlValues() {
    for (const key of [
      'rotateX',
      'rotateY',
      'rotateZ',
      'scale',
      'x',
      'y',
      'headlineSize',
      'subheadSize',
      'copyWidth',
      'copyTop',
      'copyLeft',
    ]) {
      controls[key].value = config[key];
    }
    controls.device.value = config.device;
    controls.showDevice.checked = config.showDevice !== false;
    controls.background.value = config.background;
    controls.accent.value = config.accent;
    controls.kicker.value = config.kicker;
    controls.headline.value = config.headline;
    controls.subhead.value = config.subhead;
    controls.width.value = config.width;
    controls.height.value = config.height;
    document.querySelectorAll('[data-preset]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.preset === config.preset);
    });
    document.querySelectorAll('[data-shell]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.shell === config.shell);
    });
    updateValueLabels();
  }

  function fitPreview() {
    const scale = Math.min(
      previewViewport.clientWidth / config.width,
      previewViewport.clientHeight / config.height,
    );
    previewScale.style.width = `${config.width}px`;
    previewScale.style.height = `${config.height}px`;
    previewScale.style.left = `${(previewViewport.clientWidth - config.width * scale) / 2}px`;
    previewScale.style.top = `${(previewViewport.clientHeight - config.height * scale) / 2}px`;
    previewScale.style.transform = `scale(${scale})`;
    previewMeta.textContent = `${config.width} × ${config.height}`;
  }

  function updatePreview() {
    MockupScene.applyScene(frame, config, imageDataUrl);
    fitPreview();
    updateValueLabels();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
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

  for (const key of ['headlineSize', 'subheadSize', 'copyWidth', 'copyTop', 'copyLeft']) {
    controls[key].addEventListener('input', (event) => setNumber(key, event.target.value));
  }

  for (const key of ['kicker', 'headline', 'subhead']) {
    controls[key].addEventListener('input', (event) => {
      config = { ...config, [key]: event.target.value };
      updatePreview();
    });
  }

  for (const key of ['width', 'height']) {
    controls[key].addEventListener('change', (event) => {
      const value = Math.max(320, Math.min(4096, Number(event.target.value)));
      config = { ...config, [key]: value };
      updatePreview();
    });
  }

  controls.background.addEventListener('change', (event) => {
    config = { ...config, background: event.target.value };
    updatePreview();
  });

  controls.accent.addEventListener('input', (event) => {
    config = { ...config, accent: event.target.value };
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
    config = MockupScene.applyPreset(config, button.dataset.preset);
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

  sourceButton.addEventListener('click', () => sourceInput.click());
  sourceInput.addEventListener('change', async () => {
    const [file] = sourceInput.files;
    if (!file) return;
    imageDataUrl = await fileToDataUrl(file);
    usingSample = false;
    sourceName.textContent = file.name;
    updatePreview();
  });

  loadPresetButton.addEventListener('click', () => presetInput.click());
  presetInput.addEventListener('change', async () => {
    const [file] = presetInput.files;
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      config = MockupScene.normalizeConfig(parsed.config ?? parsed);
      updateControlValues();
      updatePreview();
      showStatus(`Loaded ${file.name}`);
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
        schemaVersion: 1,
        config,
      },
      null,
      2,
    );
    downloadBlob(
      new Blob([payload], { type: 'application/json' }),
      `mockup-preset-${config.device}-${config.preset}.json`,
    );
    showStatus('Preset saved');
  });

  exportButton.addEventListener('click', async () => {
    exportButton.disabled = true;
    exportButton.textContent = 'Rendering…';
    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, imageDataUrl }),
      });
      if (!response.ok) throw new Error(await response.text());
      const blob = await response.blob();
      downloadBlob(blob, `device-mockup-${config.device}-${config.preset}.png`);
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
