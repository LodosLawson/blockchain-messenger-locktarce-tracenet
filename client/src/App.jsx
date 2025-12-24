import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { api, createWebSocket } from './api/client';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import Messages from './pages/Messages';
import BlockchainExplorer from './pages/BlockchainExplorer';

// Components
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);

      // Connect WebSocket
      const socket = createWebSocket(token);
      setWs(socket);

      // Cleanup on unmount
      return () => socket?.close();
    }

    setLoading(false);
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);

    // Connect WebSocket
    const socket = createWebSocket(token);
    setWs(socket);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);

    // Close WebSocket
    if (ws) {
      ws.close();
      setWs(null);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          !isAuthenticated ?
            <Login onLogin={handleLogin} /> :
            <Navigate to="/dashboard" replace />
        }
      />
      <Route
        path="/register"
        element={
          !isAuthenticated ?
            <Register onRegister={handleLogin} /> :
            <Navigate to="/dashboard" replace />
        }
      />

      {/* Protected Routes */}
      <Route
        path="/*"
        element={
          isAuthenticated ? (
            <Layout user={user} onLogout={handleLogout}>
              <Routes>
                <Route path="/dashboard" element={<Dashboard user={user} ws={ws} />} />
                <Route path="/wallet" element={<Wallet user={user} ws={ws} />} />
                <Route path="/messages" element={<Messages user={user} ws={ws} />} />
                <Route path="/explorer" element={<BlockchainExplorer />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default App;
