import apiConfig from '../config/api.json';

const normalizeBase = (raw) => {
  const s = String(raw || '').trim();
  if (!s) {
    return 'http://127.0.0.1:8080/';
  }
  return s.endsWith('/') ? s : `${s}/`;
};

export const apiBaseUrl = normalizeBase(apiConfig.API_BASE);

export const apiUrl = (path = '') => {
  let p = String(path || '');
  if (!p) return apiBaseUrl;
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  if (p.startsWith('/')) p = p.slice(1);
  return `${apiBaseUrl}${p}`;
};

const parseResponseBody = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return text;
  }
};

export const requestJson = async (path, options = {}) => {
  const response = await fetch(apiUrl(path), options);
  const data = await parseResponseBody(response);
  return {
    ok: response.ok,
    status: response.status,
    data,
    response
  };
};

export const getJson = async (path, options = {}) => requestJson(path, {
  ...options,
  method: 'GET'
});

export const postJson = async (path, payload = {}, options = {}) => requestJson(path, {
  ...options,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...((options && options.headers) || {})
  },
  body: JSON.stringify(payload)
});

export const postForm = async (path, formData, options = {}) => requestJson(path, {
  ...options,
  method: 'POST',
  body: formData,
  headers: {
    ...((options && options.headers) || {})
  }
});

export const putJson = async (path, payload = {}) => requestJson(path, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

export const patchJson = async (path, payload = {}) => requestJson(path, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
});

export const deleteJson = async (path) => requestJson(path, { method: 'DELETE' });
