import React, { createContext, useContext, useState, useEffect } from 'react';

export const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);
export const usePermission = (permCode) => {
  const { hasPerm } = useAuth();
  return hasPerm ? hasPerm(permCode) : false;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    const saved = localStorage.getItem('hris_token');
    const u = localStorage.getItem('hris_user');
    if (saved && u) setUser(JSON.parse(u));
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('hris_token', token);
    localStorage.setItem('hris_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await fetch("http://localhost:3000/api/auth/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem('hris_token')}` }
      });
    } catch {}
    localStorage.removeItem('hris_token');
    localStorage.removeItem('hris_user');
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
};
