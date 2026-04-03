const DEFAULT_HF_SPACE_URL = 'https://chabhishek28-my-flask-backend.hf.space';

const normalizeBaseUrl = (value) => {
  if (!value) {
    return '';
  }

  return value.replace(/\/+$/, '');
};

export const API_BASE_URL = normalizeBaseUrl(
  process.env.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_API_BASE_URL ||
    DEFAULT_HF_SPACE_URL
);

export const buildApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const FRONTEND_ORIGIN =
  process.env.REACT_APP_FRONTEND_URL || window.location.origin;
