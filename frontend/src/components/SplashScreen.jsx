import { useState, useEffect, useCallback } from 'react';

const SplashScreen = ({ onComplete }) => {
  const [showSplash, setShowSplash] = useState(false);

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
    if (onComplete) onComplete();
  }, [onComplete]);

  useEffect(() => {
    // Check if splash has been shown in this session
    const splashShown = sessionStorage.getItem('splashShown');
    
    if (!splashShown) {
      setShowSplash(true);
      
      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      // If already shown, immediately call onComplete
      if (onComplete) onComplete();
    }
  }, [handleDismiss, onComplete]);

  // Prevent scrolling when splash is shown
  useEffect(() => {
    if (showSplash) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [showSplash]);

  if (!showSplash) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 w-screen h-screen bg-white z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#ffffff',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div className="flex flex-col items-center justify-center">
        <img
          src="/animations/WhatsApp Image 2025-12-12 at 9.48.22 AM.jpeg"
          alt="WorkSphere India Logo"
          className="max-w-[400px] max-h-[400px] w-auto h-auto object-contain mb-6"
          style={{
            maxWidth: '400px',
            maxHeight: '400px',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
        
        {/* Minimal Loading Indicator - Short line below logo */}
        <div className="relative w-24 h-0.5 bg-gray-200 overflow-hidden rounded-full">
          <div
            className="absolute h-full bg-blue-600 rounded-full"
            style={{
              width: '30%',
              animation: 'loading-slide 1.2s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      {/* CSS Animation for infinite loop */}
      <style>{`
        @keyframes loading-slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;

