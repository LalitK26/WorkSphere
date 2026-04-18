import { useState, useEffect } from 'react';
import { emailTemplateService } from '../../api/emailTemplateService';
import { FiMail, FiRefreshCw, FiCheck } from 'react-icons/fi';
import Sidebar from '../../components/Layout/Sidebar';
import SettingsSidebar from '../../components/Layout/SettingsSidebar';
import Topbar from '../../components/Layout/Topbar';

/**
 * Email Templates – read-only preview and management.
 * Admin-only. Uses existing backend templates with embedded logos; no editing.
 */
const EmailTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const templateLabels = {
    'account-creation-confirmation': 'Account Creation Confirmation',
    'profile-completion-reminder': 'Profile Completion Reminder',
    'interview-scheduled': 'Interview Scheduled',
    'technical-interview-scheduled': 'Technical Interview Scheduled',
    'hr-interview-scheduled': 'HR Interview Scheduled',
    'interview-rescheduled': 'Interview Rescheduled',
    'interview-feedback-update': 'Interview Feedback Update',
    'offer-letter-issued': 'Offer Letter Issued',
    'general-recruitment-notification': 'General Recruitment Notification',
  };

  useEffect(() => {
    loadTemplateList();
  }, []);

  useEffect(() => {
    if (selectedTemplate) loadPreview();
  }, [selectedTemplate]);

  const loadTemplateList = async () => {
    try {
      setLoading(true);
      const response = await emailTemplateService.getTemplateList();
      if (response?.data?.templates) {
        setTemplates(response.data.templates);
        if (response.data.templates.length > 0 && !selectedTemplate) {
          setSelectedTemplate(response.data.templates[0]);
        }
      } else {
        setError('No templates found');
      }
    } catch (err) {
      setError('Failed to load templates: ' + (err.response?.data?.error || err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async () => {
    if (!selectedTemplate) return;
    setLoading(true);
    setError('');
    try {
      const response = await emailTemplateService.previewTemplate(selectedTemplate);
      if (response?.data?.html) setPreviewHtml(response.data.html);
      else setPreviewHtml('');
    } catch (err) {
      setError('Failed to load preview: ' + (err.response?.data?.error || err.message));
      setPreviewHtml('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <SettingsSidebar onClose={() => {}} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-[512px]">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FiMail className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          </div>
          <p className="text-gray-600">
            Read-only preview and management of recruitment email templates. Templates use company branding and embedded logos.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Select Template</h2>
            <button
              onClick={loadPreview}
              disabled={loading || !selectedTemplate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Preview
            </button>
          </div>

          {loading && templates.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-gray-600">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No templates available.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTemplate(t)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedTemplate === t
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">
                        {templateLabels[t] || t}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{t}</div>
                    </div>
                    {selectedTemplate === t && (
                      <FiCheck className="w-5 h-5 text-blue-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {selectedTemplate && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Preview: {templateLabels[selectedTemplate] || selectedTemplate}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Read-only preview with sample data. Templates are used for candidate signup, interview scheduling, offer letters, and status notifications.
              </p>
              {loading && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              )}
            </div>
            <div className="p-6 bg-gray-100">
              {previewHtml ? (
                <div className="bg-white rounded-lg shadow-lg max-w-3xl mx-auto overflow-hidden">
                  <iframe
                    title="Email Preview"
                    srcDoc={previewHtml}
                    className="w-full h-[800px] border-0"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : (
                !loading && (
                  <div className="text-center py-12 text-gray-500">
                    <FiMail className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No preview available. Select a template to view.</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-1">About Email Templates</h3>
          <p className="text-sm text-blue-800">
            These templates are used by the recruitment email system (GoDaddy SMTP). They are sent automatically for candidate signup verification, interview scheduling, interviewer assignment, offer letters, and status notifications. This section is read-only; template structure and branding are managed in the backend.
          </p>
        </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmailTemplates;
