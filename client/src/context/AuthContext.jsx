import { createContext, useContext, useEffect, useState } from 'react';
import { http } from '../api/http';
import { resetAttendanceFilters } from '../state/attendanceFilters';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    http
      .get('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const loggedInUser = await http.post('/auth/login', { email, password });
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function logout() {
    await http.post('/auth/logout');
    setUser(null);
    resetAttendanceFilters();
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
