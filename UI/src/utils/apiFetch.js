export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/';
  }

  return response;
}

export function getUserRole() {
  const stored = localStorage.getItem('role');
  if (stored) return stored;
  const token = localStorage.getItem('token');
  if (!token) return 'user';
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const role = payload.role || 'user';
    localStorage.setItem('role', role);
    return role;
  } catch {
    return 'user';
  }
}
