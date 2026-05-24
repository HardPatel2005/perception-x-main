const getDefaultOrigin = () => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return 'http://localhost:3000';
};

const normalizeBaseUrl = (value, fallback = getDefaultOrigin()) => {
  return (value || fallback).trim().replace(/\/+$/, '');
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
  return normalizeBaseUrl(
    readViteEnv('VITE_PYTHON_API_URL', 'VITE_PYTHON_URL', 'VITE_API_URL', 'VITE_NODE_API_URL')
  );
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