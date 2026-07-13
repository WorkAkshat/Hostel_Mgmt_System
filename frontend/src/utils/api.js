const getBaseUrl = () => {
  const { hostname } = window.location;
  return `http://${hostname}:5000/api`;
};

const BASE_URL = getBaseUrl();

const api = async (endpoint, options = {}) => {
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

export default api;
export { BASE_URL };
