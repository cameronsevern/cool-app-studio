(() => {
  const MATERIALS = {
    graphite: ['#49535a', '#a9b1b5', '#11171b'],
    silver: ['#aeb5b7', '#f5f6f4', '#596166'],
    gold: ['#a78555', '#ead6a6', '#4e3d2b'],
    cyan: ['#387c87', '#99e4ec', '#15363d'],
  };

  const PRESETS = {
    'hero-right': { rotateX: 5, rotateY: -25, rotateZ: -7, x: 0.10, y: 0.08, scale: 0.92 },
    'hero-left': { rotateX: 5, rotateY: 25, rotateZ: 7, x: -0.10, y: 0.08, scale: 0.92 },
    floating: { rotateX: -10, rotateY: -17, rotateZ: -4, x: 0.10, y: 0.08, scale: 0.88 },
    'low-angle': { rotateX: 15, rotateY: -31, rotateZ: -5, x: 0.10, y: 0.12, scale: 0.90 },
    upright: { rotateX: 0, rotateY: 0, rotateZ: 0, x: 0.12, y: 0.10, scale: 0.88 },
  };

  const DEFAULT_CONFIG = {
    width: 1600,
    height: 1600,
    device: 'iphone',
    shell: 'graphite',
    background: 'midnight',
    preset: 'hero-right',
    rotateX: 5,
    rotateY: -25,
    rotateZ: -7,
    x: 0.10,
    y: 0.08,
    scale: 0.92,
    accent: '#6ee7f5',
    showDevice: true,
    headlineSize: 102,
    subheadSize: 38,
    copyWidth: 0.72,
    copyTop: 0.075,
    copyLeft: 0.065,
    kicker: 'PRODUCT STORY',
    headline: 'Design, in perspective.',
    subhead: 'Local, adjustable, export-ready.',
  };

  function hexToRgb(hex) {
    const normalized = hex.replace('#', '');
    const value = Number.parseInt(
      normalized.length === 3
        ? normalized.split('').map((digit) => digit + digit).join('')
        : normalized,
      16,
    );
    return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
  }

  function applyPreset(config, presetName) {
    return {
      ...config,
      preset: presetName,
      ...(PRESETS[presetName] ?? PRESETS['hero-right']),
    };
  }

  function normalizeConfig(config = {}) {
    const preset = PRESETS[config.preset] ?? PRESETS[DEFAULT_CONFIG.preset];
    return { ...DEFAULT_CONFIG, ...preset, ...config };
  }

  function applyScene(frame, suppliedConfig, imageUrl) {
    const config = normalizeConfig(suppliedConfig);
    const width = Number(config.width);
    const height = Number(config.height);
    const minDimension = Math.min(width, height);
    const sourceRatio = config.device === 'pixel' ? 1080 / 2400 : 1320 / 2868;
    const phoneWidth = Math.min(width * 0.58, height * 0.42) * Number(config.scale);
    const phoneHeight = phoneWidth / sourceRatio;
    const shell = MATERIALS[config.shell] ?? MATERIALS.graphite;
    const copyScale = Math.max(0.68, minDimension / 1600);

    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    frame.style.setProperty('--accent', config.accent);
    frame.style.setProperty('--accent-rgb', hexToRgb(config.accent));
    frame.style.setProperty('--shell', shell[0]);
    frame.style.setProperty('--shell-light', shell[1]);
    frame.style.setProperty('--shell-dark', shell[2]);
    frame.style.setProperty('--phone-width', `${phoneWidth}px`);
    frame.style.setProperty('--phone-height', `${phoneHeight}px`);
    frame.style.setProperty('--phone-depth', `${Math.max(24, phoneWidth * 0.06)}px`);
    frame.style.setProperty('--phone-radius', `${phoneWidth * (config.device === 'pixel' ? 0.105 : 0.132)}px`);
    frame.style.setProperty('--screen-radius', `${phoneWidth * (config.device === 'pixel' ? 0.082 : 0.108)}px`);
    frame.style.setProperty('--bezel', `${Math.max(9, phoneWidth * 0.022)}px`);
    frame.style.setProperty('--rotate-x', `${Number(config.rotateX)}deg`);
    frame.style.setProperty('--rotate-y', `${Number(config.rotateY)}deg`);
    frame.style.setProperty('--rotate-z', `${Number(config.rotateZ)}deg`);
    frame.style.setProperty('--translate-x', `${Number(config.x) * width}px`);
    frame.style.setProperty('--translate-y', `${Number(config.y) * height}px`);
    frame.style.setProperty('--phone-scale', '1');
    frame.style.setProperty(
      '--headline-size',
      `${Math.max(72, Math.min(180, Number(config.headlineSize)))}px`,
    );
    frame.style.setProperty(
      '--subhead-size',
      `${Math.max(28, Math.min(72, Number(config.subheadSize)))}px`,
    );
    frame.style.setProperty(
      '--copy-width',
      `${Math.max(0.35, Math.min(0.85, Number(config.copyWidth))) * 100}%`,
    );
    frame.style.setProperty(
      '--copy-top',
      `${Math.max(0.02, Math.min(0.60, Number(config.copyTop))) * 100}%`,
    );
    frame.style.setProperty(
      '--copy-left',
      `${Math.max(0.02, Math.min(0.30, Number(config.copyLeft))) * 100}%`,
    );
    frame.dataset.device = config.device;
    frame.dataset.shell = config.shell;
    frame.dataset.background = config.background;
    frame.dataset.showDevice = String(config.showDevice !== false);

    const copy = frame.querySelector('.copy-block');
    if (copy) {
      copy.style.transform = `scale(${copyScale})`;
      copy.style.transformOrigin = 'top left';
    }
    const kicker = frame.querySelector('.copy-kicker');
    const headline = frame.querySelector('.copy-headline');
    const subhead = frame.querySelector('.copy-subhead');
    if (kicker) kicker.textContent = config.kicker;
    if (headline) headline.textContent = config.headline;
    if (subhead) subhead.textContent = config.subhead;

    const screen = frame.querySelector('.phone-screen img');
    if (screen && imageUrl) screen.src = imageUrl;
    return config;
  }

  window.MockupScene = {
    DEFAULT_CONFIG,
    PRESETS,
    MATERIALS,
    applyPreset,
    normalizeConfig,
    applyScene,
  };
})();
