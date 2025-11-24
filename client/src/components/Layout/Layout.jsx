import React from 'react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const Layout = ({ children, user, balance, activeView, setActiveView, onLogout }) => {
    const isMobile = useMediaQuery('(max-width: 768px)');

    return (
        <div className="dashboard-container">
            {!isMobile && (
                <Sidebar
                    user={user}
                    balance={balance}
                    activeView={activeView}
                    setActiveView={setActiveView}
                    onLogout={onLogout}
                />
            )}

            <div className="main-content">
                {children}
            </div>

            {isMobile && (
                <BottomNav
                    activeView={activeView}
                    setActiveView={setActiveView}
                />
            )}
        </div>
    );
};

export default Layout;
