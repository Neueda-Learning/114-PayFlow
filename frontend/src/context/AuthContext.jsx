import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    const { token, ...userData } = res.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return res.data;
  };

  const register = async (fullName, email, password) => {
    const res = await authApi.register({ fullName, email, password });
    const { token, ...userData } = res.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUserBankData = ({ bankAccountNumber, bankBalance }) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        bankAccountNumber: bankAccountNumber ?? prev.bankAccountNumber,
        bankBalance: bankBalance ?? prev.bankBalance,
      };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUserBankData, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
