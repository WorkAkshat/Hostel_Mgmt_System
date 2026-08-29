const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }

  const { hostname } = window.location;
  if (
    hostname === 'hms.haripushphostel.in' ||
    hostname.endsWith('haripushphostel.in')
  ) {
    return 'https://hms-api.haripushphostel.in/api/v1';
  }
  return `http://${hostname}:9000/api/v1`;
};

const BASE_URL = getBaseUrl();

const client = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || 'Something went wrong');
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return response.json();
};

export default client;
export { BASE_URL };
