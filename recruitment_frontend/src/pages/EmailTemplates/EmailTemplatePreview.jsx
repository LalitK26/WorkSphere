import { useState, useEffect } from 'react';
import { emailTemplateService } from '../../api/emailTemplateService';
import { FiMail, FiRefreshCw, FiCheck } from 'react-icons/fi';

const EmailTemplatePreview = () => {
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
    'rejection-email': 'Rejection Email',
  };

  useEffect(() => {
    loadTemplateList();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      loadPreview();
    }
  }, [selectedTemplate]);

  const loadTemplateList = async () => {
    try {
      setLoading(true);
      const response = await emailTemplateService.getTemplateList();
      if (response.data && response.data.templates) {
        setTemplates(response.data.templates);
        if (response.data.templates.length > 0 && !selectedTemplate) {
          setSelectedTemplate(response.data.templates[0]);
        }
      } else {
        setError('No templates found in response');
      }
    } catch (err) {
      console.error('Error loading templates:', err);
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
      if (response.data && response.data.html) {
        setPreviewHtml(response.data.html);
      }
    } catch (err) {
      setError('Failed to load preview: ' + (err.response?.data?.error || err.message));
      setPreviewHtml('');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadPreview();
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FiMail className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Email Template Preview</h1>
          </div>
          <p className="text-gray-600">
            Preview and validate email notification templates for recruitment events
          </p>
        </div>

        {/* Template Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Select Template</h2>
            <button
              onClick={handleRefresh}
              disabled={loading || !selectedTemplate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Preview
            </button>
          </div>

          {loading && templates.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No templates available. Please check backend connection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((template) => (
                <button
                  key={template}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${selectedTemplate === template
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 mb-1">
                        {templateLabels[template] || template}
                      </div>
                      <div className="text-xs text-gray-500 font-mono">{template}</div>
                    </div>
                    {selectedTemplate === template && (
                      <FiCheck className="w-5 h-5 text-blue-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Preview */}
        {selectedTemplate && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Preview: {templateLabels[selectedTemplate] || selectedTemplate}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    This is how the email will appear to candidates (with sample data)
                  </p>
                </div>
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Loading...
                  </div>
                )}
              </div>
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

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">
              <svg fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 mb-1">About Email Templates</h3>
              <p className="text-sm text-blue-800">
                These templates are production-ready and will be used to send automated notifications to candidates.
                The templates use dynamic placeholders that will be replaced with actual candidate data when emails are sent.
                SMTP configuration is not yet implemented, so these templates are currently for preview purposes only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplatePreview;
