const LoadingScreen = () => {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
            <div className="text-center">
                <div className="relative">
                    {/* Animated blockchain icon */}
                    <div className="w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-2 border-4 border-white border-b-transparent rounded-full animate-spin-reverse"></div>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2">Blockchain Messenger</h2>
                    <p className="text-white/80">Loading...</p>
                </div>
            </div>

            <style>{`
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-spin-reverse {
          animation: spin-reverse 1s linear infinite;
        }
      `}</style>
        </div>
    );
};

export default LoadingScreen;
