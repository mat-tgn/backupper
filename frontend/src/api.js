import axios from 'axios';

axios.defaults.withCredentials = true;

let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthEndpoint = /\/api\/auth\/(login|setup|status|logout)/.test(url);

    if (status === 401 && !isAuthEndpoint && typeof onUnauthorized === 'function') {
      onUnauthorized(error.response?.data);
    }

    return Promise.reject(error);
  }
);

export default axios;
