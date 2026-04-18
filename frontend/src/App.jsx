import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import Router from './routes/Router';
import SplashScreen from './components/SplashScreen';

function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // Check sessionStorage on initial render
    return !sessionStorage.getItem('splashShown');
  });

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <AuthProvider>
        <SidebarProvider>
          <Router />
        </SidebarProvider>
      </AuthProvider>
    </>
  );
}

export default App;

