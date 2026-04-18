import { useState } from 'react';
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';
import SettingsSidebar from '../../components/Layout/SettingsSidebar';
import ManageRole from '../../components/HR/ManageRole';

const RolesPermissions = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRoleUpdate = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <SettingsSidebar onClose={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-[512px]">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="mb-6 hidden">
            {/* Page title removed - shown in topbar */}
          </div>
          <div className="max-w-5xl">
            <ManageRole
              key={refreshKey}
              onRoleUpdate={handleRoleUpdate}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default RolesPermissions;

