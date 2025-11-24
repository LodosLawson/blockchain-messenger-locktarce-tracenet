import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Lazy load components
const Login = lazy(() => import('./components/Auth/Login'));
const Register = lazy(() => import('./components/Auth/Register'));
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));

// Loading component
const Loading = () => (
  <div className="flex items-center justify-center h-full w-full" style={{ minHeight: '100vh' }}>
    <div className="text-center">
      <div className="pulse text-xl font-bold mb-sm">Loading...</div>
    </div>
  </div>
);

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [ws, setWs] = useState(null);

  useEffect(() => {
    if (token && !ws) {
      // Connect to WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = process.env.NODE_ENV === 'development' 
        ? 'localhost:3000' 
        : window.location.host;
        
      const socket = new WebSocket(`${protocol}//${host}`);

      socket.onopen = () => {
        console.log('Connected to WebSocket');
        // Authenticate socket
        socket.send(JSON.stringify({
          type: 'auth',
          token
        }));
      };

      socket.onclose = () => {
        console.log('Disconnected from WebSocket');
        setWs(null);
      };

      setWs(socket);

      return () => {
        socket.close();
      };
    }
  }, [token]);

  const handleLogin = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    if (ws) {
      ws.close();
      setWs(null);
    }
  };

  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route 
          path="/login" 
          element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/register" 
          element={!token ? <Register /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/dashboard" 
          element={
            token ? (
              <Dashboard 
                user={user} 
                token={token} 
                ws={ws} 
                onLogout={handleLogout} 
              />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
      </Routes>
    </Suspense>
  );
}

export default App;
