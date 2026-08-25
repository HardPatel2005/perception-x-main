const getDefaultOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:3000';
};

// FIXED — limit input length before regex runs
const normalizeBaseUrl = (value, fallback = getDefaultOrigin()) => {
  const raw = (value || fallback);
  if (typeof raw !== 'string' || raw.length > 2048) return fallback;
  return raw.trim().replace(/\/+$/, '');
};

const parseBooleanEnv = (value) => {
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

const readViteEnv = (...keys) => {
  for (const key of keys) {
    const value = import.meta.env[key];
    if (value) {
      // Reject obviously malformed hostnames (e.g. containing underscores)
      try {
        const u = new URL(value, 'http://example');
        const hostname = u.hostname || '';
        if (hostname.includes('_')) {
          // treat as invalid
          continue;
        }
        return value;
      } catch (e) {
        // If it's not a valid URL, skip it and continue to fallback
        continue;
      }
    }
  }

  return undefined;
};

export const getNodeApiBaseUrl = () => {
  return normalizeBaseUrl(readViteEnv('VITE_API_URL', 'VITE_NODE_API_URL'));
};

export const getPythonApiBaseUrl = () => {
  const forceModalGpu = parseBooleanEnv(import.meta.env.VITE_FORCE_MODAL_GPU);

  if (forceModalGpu) {
    const modalBase = readViteEnv('VITE_MODAL_API_URL', 'VITE_PYTHON_API_URL', 'VITE_PYTHON_URL');
    if (modalBase) {
      return normalizeBaseUrl(modalBase);
    }
  }

  return normalizeBaseUrl(
    readViteEnv('VITE_PYTHON_API_URL', 'VITE_PYTHON_URL', 'VITE_MODAL_API_URL', 'VITE_API_URL', 'VITE_NODE_API_URL')
  );
};

export const getProcessingApiBaseUrl = () => {
  return getPythonApiBaseUrl();
};

export const buildHttpUrl = (baseUrl, pathname = '/') => {
  return new URL(pathname, `${normalizeBaseUrl(baseUrl)}/`).toString();
};

export const buildWebSocketUrl = (baseUrl, pathname = '/', searchParams = {}) => {
  const url = new URL(pathname, `${normalizeBaseUrl(baseUrl)}/`);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
};