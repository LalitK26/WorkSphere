import { createContext, useContext, useState } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsSidebarOpen, setIsSettingsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => {
      const newState = !prev;
      return newState;
    });
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const toggleSettingsSidebar = () => {
    setIsSettingsSidebarOpen(prev => !prev);
  };

  const closeSettingsSidebar = () => {
    setIsSettingsSidebarOpen(false);
  };

  return (
    <SidebarContext.Provider value={{ 
      isSidebarOpen, 
      toggleSidebar, 
      closeSidebar,
      isSettingsSidebarOpen,
      toggleSettingsSidebar,
      closeSettingsSidebar
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
};

