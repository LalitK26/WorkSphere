import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 relative overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-auto relative w-full main-content-responsive no-horizontal-scroll">
          <div className="content-max-width px-4 sm:px-6 py-4 sm:py-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
