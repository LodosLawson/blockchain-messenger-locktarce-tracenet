import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import InstallPrompt from './components/PWA/InstallPrompt';

function App() {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
    const [ws, setWs] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (token && user) {
            // Connect to WebSocket
            const websocket = new WebSocket('ws://localhost:3000');

            websocket.onopen = () => {
                console.log('WebSocket connected');
                websocket.send(JSON.stringify({
                    type: 'auth',
                    token: token
                }));
            };

            websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('WebSocket message:', data);
            };

            websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            websocket.onclose = () => {
                console.log('WebSocket disconnected');
            };

            setWs(websocket);

            return () => {
                if (websocket) {
                    websocket.close();
                }
            };
        }
    }, [token, user]);

    const handleLogin = (newToken, newUser) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
        navigate('/dashboard');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        if (ws) {
            ws.close();
        }
        navigate('/login');
    };

    return (
        <>
            <InstallPrompt />
            <Routes>
                <Route
                    path="/login"
                    element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />}
                />
                <Route
                    path="/register"
                    element={!token ? <Register onRegister={handleLogin} /> : <Navigate to="/dashboard" />}
                />
                <Route
                    path="/dashboard/*"
                    element={token ? <Dashboard user={user} token={token} ws={ws} onLogout={handleLogout} /> : <Navigate to="/login" />}
                />
                <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
            </Routes>
        </>
    );
}

export default App;
