import { useState, useEffect } from 'react';
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';
import { idCardService } from '../../api/idCardService';
import { profileService } from '../../api/profileService';
import { FiDownload, FiZoomIn, FiZoomOut } from 'react-icons/fi';

const IdCard = () => {
  const [profile, setProfile] = useState(null);
  const [htmlPreview, setHtmlPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(0.85); // Default optimal scale
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileRes, previewRes] = await Promise.all([
        profileService.getCurrentProfile(),
        idCardService.getPreviewHtml()
      ]);
      setProfile(profileRes.data);
      setHtmlPreview(previewRes.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load ID card data:', err);
      setError('Could not load profile data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const { data } = await idCardService.getPdfBlob();
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WorkSphere_ID_${profile?.employeeId || 'Card'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const adjustZoom = (delta) => {
    setZoom((prev) => Math.min(Math.max(prev + delta, 0.5), 1.5));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Topbar />
          <main className="flex-1 p-6 flex items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
              <p className="text-gray-500">Loading ID Card...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col lg:ml-64 transition-all duration-300">
        <Topbar />

        <main className="flex-1 p-6 flex flex-col relative overflow-hidden">
          {/* Header */}
          <div className="max-w-5xl mx-auto w-full mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">My ID Card</h1>
              <p className="text-sm text-gray-500 mt-1">View and download your official employee identification</p>
            </div>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white shadow-sm transition-all
                ${isDownloading ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md active:transform active:scale-95'}
              `}
            >
              <FiDownload className="w-5 h-5" />
              {isDownloading ? 'Downloading...' : 'Download ID Card (PDF)'}
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] relative">

            {/* Zoom Controls */}
            <div className="absolute top-0 right-0 sm:right-4 flex flex-col gap-2 bg-white p-1.5 rounded-lg shadow-sm border border-gray-200 z-10">
              <button onClick={() => adjustZoom(0.1)} className="p-2 hover:bg-gray-100 rounded text-gray-600" title="Zoom In">
                <FiZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => setZoom(0.85)}
                className="p-2 hover:bg-gray-100 rounded text-gray-600 text-xs font-bold"
                title="Reset Zoom"
              >
                100%
              </button>
              <button onClick={() => adjustZoom(-0.1)} className="p-2 hover:bg-gray-100 rounded text-gray-600" title="Zoom Out">
                <FiZoomOut className="w-5 h-5" />
              </button>
            </div>

            {/* ID Card Container */}
            <div
              className="relative transition-transform duration-300 ease-out origin-center my-8"
              style={{ transform: `scale(${zoom})` }}
            >
              {/* Soft shadow container */}
              <div
                className="relative overflow-hidden bg-white shadow-2xl"
                style={{ width: '326px', height: '504px', borderRadius: '0' }} // HTML template handles radius if needed, or container does.
              >
                {htmlPreview ? (
                  <iframe
                    srcDoc={htmlPreview}
                    style={{
                      width: '326px',
                      height: '504px',
                      border: 'none',
                      overflow: 'hidden',
                      display: 'block'
                    }}
                    title="ID Card Preview"
                    scrolling="no"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Preview unavailable
                  </div>
                )}
              </div>

              <div className="mt-6 text-center">
                <span className="inline-block px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-500 font-medium shadow-sm">
                  Official Employee ID Card Preview
                </span>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default IdCard;
