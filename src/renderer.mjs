export function selectRenderer({
  managedPath,
  overridePath,
  systemPaths = [],
  isAvailable = () => true,
}) {
  if (overridePath) {
    if (managedPath && overridePath === managedPath && isAvailable(managedPath)) {
      return {
        mode: 'pinned',
        executablePath: managedPath,
        fallback: false,
        reason: null,
      };
    }
    return {
      mode: 'system-override',
      executablePath: overridePath,
      fallback: false,
      reason: 'CHROME_PATH explicitly selected this browser',
    };
  }

  if (managedPath && isAvailable(managedPath)) {
    return {
      mode: 'pinned',
      executablePath: managedPath,
      fallback: false,
      reason: null,
    };
  }

  const fallbackPath = systemPaths.find((candidate) => candidate && isAvailable(candidate));
  if (fallbackPath) {
    return {
      mode: 'system-fallback',
      executablePath: fallbackPath,
      fallback: true,
      reason: 'Playwright-managed Chromium is not installed',
    };
  }

  return {
    mode: 'unavailable',
    executablePath: managedPath ?? null,
    fallback: false,
    reason: 'Playwright-managed Chromium is not installed and no supported system browser was found',
  };
}
