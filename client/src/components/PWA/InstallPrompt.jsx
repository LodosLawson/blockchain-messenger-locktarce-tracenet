import { useState, useEffect } from 'react';
import './InstallPrompt.css';

function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Listen for beforeinstallprompt event
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // Show prompt after a delay (don't be too aggressive)
            setTimeout(() => {
                setShowPrompt(true);
            }, 5000);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for app installed event
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowPrompt(false);
            console.log('✅ PWA installed successfully');
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user's response
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response: ${outcome}`);

        // Clear the deferred prompt
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        // Don't show again for this session
        sessionStorage.setItem('installPromptDismissed', 'true');
    };

    // Don't show if already installed or dismissed
    if (isInstalled || !showPrompt || sessionStorage.getItem('installPromptDismissed')) {
        return null;
    }

    return (
        <div className="install-prompt glass">
            <button className="dismiss-btn" onClick={handleDismiss}>
                ✕
            </button>
            <div className="prompt-content">
                <div className="prompt-icon">📱</div>
                <div className="prompt-text">
                    <h3>Install Blockchain Messenger</h3>
                    <p>Get the app experience with offline access and faster loading</p>
                </div>
            </div>
            <div className="prompt-actions">
                <button className="btn-secondary" onClick={handleDismiss}>
                    Not Now
                </button>
                <button className="btn-primary" onClick={handleInstall}>
                    Install
                </button>
            </div>
        </div>
    );
}

export default InstallPrompt;
