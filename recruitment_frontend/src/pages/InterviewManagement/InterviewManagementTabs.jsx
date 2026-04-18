import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import InterviewManagement from './InterviewManagement';
import HRRoundTab from './HRRoundTab';

const InterviewManagementTabs = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('technical');

  // Update active tab based on current route
  useEffect(() => {
    if (location.pathname === '/hr-round') {
      setActiveTab('hr');
    } else {
      setActiveTab('technical');
    }
  }, [location.pathname]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'technical') {
      navigate('/technical-round');
    } else {
      navigate('/hr-round');
    }
  };

  return (
    <div>
      {/* Tab Content */}
      <div>
        {activeTab === 'technical' && <InterviewManagement />}
        {activeTab === 'hr' && <HRRoundTab />}
      </div>
    </div>
  );
};

export default InterviewManagementTabs;
