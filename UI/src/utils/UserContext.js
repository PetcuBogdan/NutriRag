import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from './apiFetch';

const UserContext = createContext({ role: 'user', loading: true });

export function UserProvider({ children }) {
  const [role, setRole] = useState(localStorage.getItem('role') || 'user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }

    const controller = new AbortController();
    apiFetch('http://localhost:8080/auth/me', { signal: controller.signal })
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (data?.role) {
          setRole(data.role);
          localStorage.setItem('role', data.role);
        }
      })
      .catch(err => { if (err.name !== 'AbortError') console.error(err); })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return (
    <UserContext.Provider value={{ role, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
