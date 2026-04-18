import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ticketService } from '../../api/ticketService';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import { formatDateTime } from '../../utils/formatters';
import { getFullImageUrl } from '../../utils/imageUrl';

const TicketFiles = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const response = await ticketService.getAll();
      setTickets(response.data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const allFiles = tickets
    .filter((ticket) => ticket.files && ticket.files.length > 0)
    .flatMap((ticket) =>
      ticket.files.map((file) => ({
        ...file,
        ticketNumber: ticket.ticketNumber,
        ticketSubject: ticket.subject,
        ticketId: ticket.id,
      }))
    );

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
          <Topbar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
            <div className="text-center">Loading...</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-3 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-3 mb-2">
                {/* Back Button */}
                <button
                  type="button"
                  onClick={() => navigate('/tickets')}
                  className="flex items-center text-gray-600 hover:text-gray-800"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 mr-1"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm font-medium"></span>
                </button>

                {/* Page Title removed - shown in topbar */}
              </div>

              {/* Breadcrumb removed */}
            </div>














            {/* Page title removed - shown in topbar */}
          </div>

          <div className="bg-white rounded-lg shadow">
            {allFiles.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-gray-500">No files uploaded yet</div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="block md:hidden">
                  <div className="divide-y divide-gray-200">
                    {allFiles.map((file) => (
                      <div key={file.id} className="p-4 hover:bg-gray-50">
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.fileName}</p>
                            </div>
                          </div>
                          <div className="flex flex-col space-y-1 text-xs text-gray-600">
                            <div className="flex items-center">
                              <span className="font-medium mr-2">Ticket:</span>
                              <button
                                onClick={() => navigate(`/tickets/${file.ticketId}`)}
                                className="text-blue-600 hover:text-blue-800 truncate"
                              >
                                {file.ticketNumber}
                              </button>
                            </div>
                            <div className="flex items-start">
                              <span className="font-medium mr-2">Subject:</span>
                              <span className="flex-1 break-words">{file.ticketSubject}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium mr-2">Uploaded:</span>
                              <span>{formatDateTime(file.createdAt, 'dd-MM-yyyy hh:mm a')}</span>
                            </div>
                            <div className="flex items-center">
                              <span className="font-medium mr-2">Size:</span>
                              <span>{file.fileSize ? `${(file.fileSize / 1024).toFixed(2)} KB` : '-'}</span>
                            </div>
                          </div>
                          <div className="pt-2">
                            <a
                              href={getFullImageUrl(file.fileContent)}
                              download={file.fileName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File Name
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ticket
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Uploaded
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Size
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50">
                          <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 break-words">{file.fileName}</td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <button
                              onClick={() => navigate(`/tickets/${file.ticketId}`)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {file.ticketNumber}
                            </button>
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 break-words">{file.ticketSubject}</td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDateTime(file.createdAt, 'dd-MM-yyyy hh:mm a')}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {file.fileSize ? `${(file.fileSize / 1024).toFixed(2)} KB` : '-'}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                            <a
                              href={getFullImageUrl(file.fileContent)}
                              download={file.fileName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Download
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default TicketFiles;

