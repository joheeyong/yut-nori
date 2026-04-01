import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Game from './components/Game';
import Login from './components/Login';
import NaverCallback from './components/NaverCallback';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('yut_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('yut_user', JSON.stringify(userData));
    window.location.href = '/';
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('yut_user');
  }, []);

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                <Game user={user} onLogout={handleLogout} />
              ) : (
                <Login onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/callback/naver"
            element={<NaverCallback onLogin={handleLogin} />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
