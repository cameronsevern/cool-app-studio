(() => {
  const MATERIALS = {
    graphite: ['#49535a', '#a9b1b5', '#11171b'],
    silver: ['#aeb5b7', '#f5f6f4', '#596166'],
    gold: ['#a78555', '#ead6a6', '#4e3d2b'],
    cyan: ['#387c87', '#99e4ec', '#15363d'],
  };

  const CAMERA_PRESETS = {
    'hero-right': { rotateX: 5, rotateY: -25, rotateZ: -7, x: 0.10, y: 0.08, scale: 0.92 },
    'hero-left': { rotateX: 5, rotateY: 25, rotateZ: 7, x: -0.10, y: 0.08, scale: 0.92 },
    floating: { rotateX: -10, rotateY: -17, rotateZ: -4, x: 0.10, y: 0.08, scale: 0.88 },
    'low-angle': { rotateX: 15, rotateY: -31, rotateZ: -5, x: 0.10, y: 0.12, scale: 0.90 },
    upright: { rotateX: 0, rotateY: 0, rotateZ: 0, x: 0.12, y: 0.10, scale: 0.88 },
  };

  const CANVAS_PRESETS = {
    'apple-iphone-69': {
      label: 'App Store · iPhone 6.9″',
      width: 1320,
      height: 2868,
      platform: 'apple',
      orientation: 'portrait',
      allowOrientation: true,
      description: 'Highest-resolution current iPhone screenshot size.',
    },
    'apple-ipad-13': {
      label: 'App Store · iPad 13″',
      width: 2064,
      height: 2752,
      platform: 'apple',
      orientation: 'portrait',
      allowOrientation: true,
      description: 'Current 13-inch iPad screenshot size.',
    },
    'google-phone': {
      label: 'Google Play · Phone',
      width: 1080,
      height: 1920,
      platform: 'google',
      orientation: 'portrait',
      allowOrientation: true,
      description: 'Recommended 9:16 phone promotional screenshot.',
    },
    'google-feature': {
      label: 'Google Play · Feature graphic',
      width: 1024,
      height: 500,
      platform: 'google',
      orientation: 'landscape',
      allowOrientation: false,
      description: 'Required Google Play feature graphic.',
    },
  };

  const FONT_FAMILIES = {
    system: 'Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    geometric: 'Avenir Next, Avenir, Futura, Century Gothic, ui-sans-serif, sans-serif',
    rounded: 'Arial Rounded MT Bold, Nunito, ui-rounded, system-ui, sans-serif',
    serif: 'Iowan Old Style, Baskerville, Georgia, ui-serif, serif',
    mono: 'SFMono-Regular, SF Mono, Menlo, Monaco, Consolas, ui-monospace, monospace',
  };

  const DEFAULT_CONFIG = {
    width: 1600,
    height: 1600,
    canvasPreset: 'custom',
    orientation: 'portrait',
    device: 'iphone',
    shell: 'graphite',
    background: 'midnight',
    backgroundColorA: '#050b0f',
    backgroundColorB: '#10202a',
    backgroundAngle: 145,
    backgroundImageFit: 'cover',
    backgroundImageX: 50,
    backgroundImageY: 50,
    backgroundImageZoom: 1,
    backgroundImageBlur: 0,
    backgroundOverlay: '#000000',
    backgroundOverlayOpacity: 0.18,
    preset: 'hero-right',
    rotateX: 5,
    rotateY: -25,
    rotateZ: -7,
    x: 0.10,
    y: 0.08,
    scale: 0.92,
    accent: '#6ee7f5',
    showDevice: true,
    fontFamily: 'system',
    customFontName: 'Cool App Studio Custom',
    textAlign: 'left',
    autoTextColors: true,
    headlineSize: 102,
    headlineWeight: 820,
    headlineLineHeight: 0.98,
    headlineTracking: -0.052,
    headlineColor: '#f7f5f0',
    subheadSize: 38,
    subheadWeight: 520,
    subheadLineHeight: 1.2,
    subheadColor: '#aebbc4',
    kickerSize: 24,
    kickerWeight: 750,
    kickerTracking: 0.19,
    kickerColor: '#6ee7f5',
    kickerUppercase: true,
    copyWidth: 0.72,
    copyTop: 0.075,
    copyLeft: 0.065,
    kicker: 'PRODUCT STORY',
    headline: 'Design, in perspective.',
    subhead: 'Local, adjustable, export-ready.',
  };

  function clamp(value, minimum, maximum, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
  }

  function hexToRgb(hex) {
    const normalized = String(hex ?? '').replace('#', '');
    const safeHex = /^[0-9a-f]{3}$/i.test(normalized)
      ? normalized.split('').map((digit) => digit + digit).join('')
      : (/^[0-9a-f]{6}$/i.test(normalized) ? normalized : '6ee7f5');
    const value = Number.parseInt(safeHex, 16);
    return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
  }

  function colorLuminance(hex) {
    const rgb = hexToRgb(hex).split(',').map(Number);
    const channels = rgb.map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function matchCanvasPreset(width, height) {
    const numericWidth = Number(width);
    const numericHeight = Number(height);
    for (const [id, preset] of Object.entries(CANVAS_PRESETS)) {
      if (preset.width === numericWidth && preset.height === numericHeight) {
        return { id, orientation: preset.orientation };
      }
      if (preset.allowOrientation && preset.height === numericWidth && preset.width === numericHeight) {
        return { id, orientation: preset.orientation === 'portrait' ? 'landscape' : 'portrait' };
      }
    }
    return null;
  }

  function applyCanvasPreset(config, presetName, requestedOrientation = 'portrait') {
    const canvas = CANVAS_PRESETS[presetName];
    if (!canvas) return { ...config, canvasPreset: 'custom' };
    const orientation = canvas.allowOrientation ? requestedOrientation : canvas.orientation;
    const shouldSwap = orientation !== canvas.orientation;
    return {
      ...config,
      canvasPreset: presetName,
      orientation,
      width: shouldSwap ? canvas.height : canvas.width,
      height: shouldSwap ? canvas.width : canvas.height,
    };
  }

  function applyCameraPreset(config, presetName) {
    return {
      ...config,
      preset: presetName,
      ...(CAMERA_PRESETS[presetName] ?? CAMERA_PRESETS['hero-right']),
    };
  }

  function fitComposition(config) {
    const width = Number(config.width);
    const height = Number(config.height);
    const ratio = width / height;
    if (ratio > 1.45) {
      return {
        ...config,
        preset: 'custom',
        copyLeft: 0.06,
        copyTop: 0.14,
        copyWidth: 0.46,
        x: 0.25,
        y: 0,
        scale: 0.82,
      };
    }
    if (ratio < 0.78) {
      return {
        ...config,
        preset: 'custom',
        copyLeft: 0.075,
        copyTop: 0.055,
        copyWidth: 0.85,
        x: 0,
        y: 0.19,
        scale: 0.82,
      };
    }
    return {
      ...config,
      preset: 'custom',
      copyLeft: 0.065,
      copyTop: 0.075,
      copyWidth: 0.72,
      x: 0.10,
      y: 0.08,
      scale: 0.92,
    };
  }

  function normalizeConfig(config = {}) {
    const camera = CAMERA_PRESETS[config.preset] ?? {};
    const matchedCanvas = matchCanvasPreset(config.width, config.height);
    const normalized = {
      ...DEFAULT_CONFIG,
      ...camera,
      ...config,
    };
    if (!config.canvasPreset && matchedCanvas) {
      normalized.canvasPreset = matchedCanvas.id;
      normalized.orientation = matchedCanvas.orientation;
    }
    if (!CANVAS_PRESETS[normalized.canvasPreset]) normalized.canvasPreset = 'custom';
    if (!FONT_FAMILIES[normalized.fontFamily] && normalized.fontFamily !== 'custom') {
      normalized.fontFamily = 'system';
    }
    return normalized;
  }

  function automaticTextColors(config) {
    let lightBackground = config.background === 'studio';
    if (config.background === 'solid') {
      lightBackground = colorLuminance(config.backgroundColorA) > 0.48;
    }
    if (config.background === 'gradient') {
      const average = (colorLuminance(config.backgroundColorA) + colorLuminance(config.backgroundColorB)) / 2;
      lightBackground = average > 0.48;
    }
    return lightBackground
      ? { headline: '#091117', subhead: '#4e5a62', kicker: config.accent }
      : { headline: '#f7f5f0', subhead: '#aebbc4', kicker: config.accent };
  }

  function resolveFontFamily(config) {
    if (config.fontFamily === 'custom') {
      return `"${String(config.customFontName).replaceAll('"', '')}", ${FONT_FAMILIES.system}`;
    }
    return FONT_FAMILIES[config.fontFamily] ?? FONT_FAMILIES.system;
  }

  function applyScene(frame, suppliedConfig, suppliedAssets = {}) {
    const config = normalizeConfig(suppliedConfig);
    const assets = typeof suppliedAssets === 'string'
      ? { screenImageUrl: suppliedAssets }
      : suppliedAssets;
    const width = Number(config.width);
    const height = Number(config.height);
    const minDimension = Math.min(width, height);
    const sourceRatio = config.device === 'pixel' ? 1080 / 2400 : 1320 / 2868;
    const phoneWidth = Math.min(width * 0.58, height * 0.42) * Number(config.scale);
    const phoneHeight = phoneWidth / sourceRatio;
    const shell = MATERIALS[config.shell] ?? MATERIALS.graphite;
    const copyScale = Math.max(0.46, Math.min(1.8, minDimension / 1600));
    const colors = config.autoTextColors
      ? automaticTextColors(config)
      : {
          headline: config.headlineColor,
          subhead: config.subheadColor,
          kicker: config.kickerColor,
        };

    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    frame.style.setProperty('--accent', config.accent);
    frame.style.setProperty('--accent-rgb', hexToRgb(config.accent));
    frame.style.setProperty('--background-a', config.backgroundColorA);
    frame.style.setProperty('--background-b', config.backgroundColorB);
    frame.style.setProperty('--background-angle', `${clamp(config.backgroundAngle, 0, 360, 145)}deg`);
    frame.style.setProperty('--background-overlay', config.backgroundOverlay);
    frame.style.setProperty('--background-overlay-opacity', clamp(config.backgroundOverlayOpacity, 0, 1, 0.18));
    frame.style.setProperty('--background-image-x', `${clamp(config.backgroundImageX, 0, 100, 50)}%`);
    frame.style.setProperty('--background-image-y', `${clamp(config.backgroundImageY, 0, 100, 50)}%`);
    frame.style.setProperty('--background-image-zoom', clamp(config.backgroundImageZoom, 0.5, 2, 1));
    frame.style.setProperty('--background-image-blur', `${clamp(config.backgroundImageBlur, 0, 40, 0)}px`);
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
    frame.style.setProperty('--scene-font-family', resolveFontFamily(config));
    frame.style.setProperty('--headline-size', `${clamp(config.headlineSize, 32, 320, 102)}px`);
    frame.style.setProperty('--headline-weight', clamp(config.headlineWeight, 100, 950, 820));
    frame.style.setProperty('--headline-line-height', clamp(config.headlineLineHeight, 0.75, 1.6, 0.98));
    frame.style.setProperty('--headline-tracking', `${clamp(config.headlineTracking, -0.12, 0.2, -0.052)}em`);
    frame.style.setProperty('--headline-color', colors.headline);
    frame.style.setProperty('--subhead-size', `${clamp(config.subheadSize, 18, 160, 38)}px`);
    frame.style.setProperty('--subhead-weight', clamp(config.subheadWeight, 100, 950, 520));
    frame.style.setProperty('--subhead-line-height', clamp(config.subheadLineHeight, 0.85, 2, 1.2));
    frame.style.setProperty('--subhead-color', colors.subhead);
    frame.style.setProperty('--kicker-size', `${clamp(config.kickerSize, 12, 96, 24)}px`);
    frame.style.setProperty('--kicker-weight', clamp(config.kickerWeight, 100, 950, 750));
    frame.style.setProperty('--kicker-tracking', `${clamp(config.kickerTracking, -0.05, 0.5, 0.19)}em`);
    frame.style.setProperty('--kicker-color', colors.kicker);
    frame.style.setProperty('--copy-width', `${clamp(config.copyWidth, 0.25, 0.95, 0.72) * 100}%`);
    frame.style.setProperty('--copy-top', `${clamp(config.copyTop, 0, 0.8, 0.075) * 100}%`);
    frame.style.setProperty('--copy-left', `${clamp(config.copyLeft, 0, 0.7, 0.065) * 100}%`);
    frame.style.setProperty('--copy-text-align', config.textAlign);
    frame.dataset.device = config.device;
    frame.dataset.shell = config.shell;
    frame.dataset.background = config.background;
    frame.dataset.showDevice = String(config.showDevice !== false);
    frame.dataset.kickerUppercase = String(config.kickerUppercase !== false);
    frame.dataset.textAlign = config.textAlign;

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

    const backgroundImage = frame.querySelector('.scene-background-image');
    if (backgroundImage) {
      const hasBackgroundImage = config.background === 'image' && Boolean(assets.backgroundImageUrl);
      backgroundImage.hidden = !hasBackgroundImage;
      backgroundImage.style.objectFit = config.backgroundImageFit;
      if (hasBackgroundImage && backgroundImage.src !== assets.backgroundImageUrl) {
        backgroundImage.src = assets.backgroundImageUrl;
      }
      if (!hasBackgroundImage) backgroundImage.removeAttribute('src');
    }

    const screen = frame.querySelector('.phone-screen img');
    if (screen && assets.screenImageUrl && screen.src !== assets.screenImageUrl) {
      screen.src = assets.screenImageUrl;
    }
    if (screen && !assets.screenImageUrl) screen.removeAttribute('src');
    return config;
  }

  window.MockupScene = {
    DEFAULT_CONFIG,
    PRESETS: CAMERA_PRESETS,
    CAMERA_PRESETS,
    CANVAS_PRESETS,
    FONT_FAMILIES,
    MATERIALS,
    applyPreset: applyCameraPreset,
    applyCameraPreset,
    applyCanvasPreset,
    fitComposition,
    matchCanvasPreset,
    normalizeConfig,
    applyScene,
  };
})();
