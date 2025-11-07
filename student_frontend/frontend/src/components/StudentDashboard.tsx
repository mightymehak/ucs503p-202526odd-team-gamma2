// src/components/StudentDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fastApiService, StatusResponse, ComplaintItem } from '../services/fastApiService';


interface SummaryData {
  lost: number;
  matched: number;
  resolved: number;
}

interface AddComplaintFormProps {
  onClose: () => void;
  onSubmit: (complaintData: { category: string; itemName: string; location: string; dateFound: string; photo: File | null; jobId?: string }) => void;
  onStatusPolling?: (jobId: string, complaintData: { category: string; itemName: string; location: string; dateFound: string; photo: File | null }) => void;
}

const AddComplaintForm: React.FC<AddComplaintFormProps> = ({ onClose, onSubmit, onStatusPolling }) => {
  const [itemName, setItemName] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [dateFound, setDateFound] = useState<string>("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async () => {
    if (!itemName || !location || !photo) {
      setError("Item Name, Location, and Photo are required for AI processing");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Submit to FastAPI backend for AI processing
      const response = await fastApiService.submitComplaint(photo, location, itemName, dateFound || undefined);
      
      // Store complaint data for display
      const complaintData = { 
        category: 'Unknown', 
        itemName, 
        location, 
        dateFound: dateFound || new Date().toISOString().split('T')[0], 
        photo,
        jobId: response.job_id
      };
      
      // Complaint is now only stored in FastAPI/FAISS - no MongoDB storage needed

      // Reset form
      setItemName("");
      setLocation("");
      setDateFound("");
      setPhoto(null);

      // Close form and trigger status polling
      onClose();
      
      // Refresh dashboard immediately to show the new complaint
      if (onSubmit) {
        onSubmit(complaintData);
      }
      
      // Start status polling after a short delay to ensure complaint is saved
      if (onStatusPolling) {
        setTimeout(() => {
          onStatusPolling(response.job_id, complaintData);
        }, 500);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to submit complaint');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setItemName("");
    setLocation("");
    setDateFound("");
    setPhoto(null);
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-center">Add Lost Item</h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block mb-2 font-semibold">Item Name *</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="e.g., Black Wallet, Blue Backpack"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">Location Found *</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full border p-2 rounded"
              placeholder="e.g., Library 2nd Floor"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">Date Found *</label>
            <input
              type="date"
              value={dateFound}
              onChange={(e) => setDateFound(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-semibold">Upload Photo * (Required for AI Processing)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files ? e.target.files[0] : null)}
              className="w-full"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Photo is required for AI matching</p>
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface StudentDashboardProps {
  onLogout: () => void;
}

// Status Polling Modal Component
interface StatusPollingModalProps {
  jobId: string;
  isOpen: boolean;
  status: string;
  result: StatusResponse | null;
  onClose: () => void;
}

const StatusPollingModal: React.FC<StatusPollingModalProps> = ({ jobId, isOpen, status, result, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white shadow-md rounded-xl p-6 w-full max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-center">Request Status</h2>
        
        {status === 'pending' && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-lg font-medium">Request Queued. Checking for status...</p>
            <p className="text-sm text-gray-500 mt-2">Job ID: {jobId}</p>
            <p className="text-xs text-gray-400 mt-2">
              Your complaint has been submitted and is visible on the dashboard with "Pending" status.
            </p>
          </div>
        )}

        {(status === 'complete' || status === 'matched' || status === 'high_confidence' || status === 'medium_confidence' || status === 'no_match') && result && (
          <div className="py-4">
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-semibold">Processing Complete!</p>
              {result.message && (
                <p className="text-sm text-green-600 mt-1">{result.message}</p>
              )}
            </div>
            {result.matches && result.matches.length > 0 ? (
              <div>
                <p className="font-semibold mb-2">Match Found!</p>
                <p className="text-sm text-gray-600 mb-3">
                  Found {result.matches.length} potential match{result.matches.length > 1 ? 'es' : ''}. Please check the matched items tab.
                </p>
                {(status === 'matched' || status === 'high_confidence') && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    Match detected! Please report to Lost & Found department.
                  </div>
                )}
                {status === 'medium_confidence' && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    Potential match found. Please check with Lost & Found department.
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="font-semibold mb-2">No Match Found</p>
                <p className="text-sm text-gray-600">
                  No matching items found in the database. Your complaint has been recorded and will be checked when new items are found.
                </p>
              </div>
            )}
            <button
              onClick={onClose}
              className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="py-4">
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-semibold">Error Processing Request</p>
              <p className="text-sm text-red-600 mt-1">{result?.message || 'An error occurred'}</p>
            </div>
            <button
              onClick={onClose}
              className="mt-4 w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const StudentDashboard: React.FC<StudentDashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState<'complaints' | 'matched' | 'resolved'>('complaints');
  const [showAddComplaint, setShowAddComplaint] = useState<boolean>(false);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData>({ lost: 0, matched: 0, resolved: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  
  // Status polling state
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string>('pending');
  const [pollingResult, setPollingResult] = useState<StatusResponse | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { user } = useAuth();

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch complaints from FastAPI only
      const complaintsData = await fastApiService.getUserComplaints();
      setComplaints(complaintsData);
      
      // Calculate stats from complaints
      const stats = {
        lost: complaintsData.length,
        matched: complaintsData.filter(c => c.status === 'matched').length,
        resolved: 0, // No resolved status in FastAPI for now
      };
      setSummaryData(stats);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Start status polling
  const startStatusPolling = (jobId: string, complaintData: { category: string; itemName: string; location: string; dateFound: string; photo: File | null }) => {
    setPollingJobId(jobId);
    setStatusModalOpen(true);
    setPollingStatus('pending');
    setPollingResult(null);

    // Refresh dashboard to show the complaint immediately (with pending status)
    fetchData();

    // Poll every 4 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const statusResponse = await fastApiService.checkStatus(jobId);
        
        if (statusResponse.status === 'pending') {
          setPollingStatus('pending');
          // Keep polling - complaint should already be visible on dashboard with pending status
        } else if (statusResponse.status === 'matched' || 
                   statusResponse.status === 'high_confidence' || 
                   statusResponse.status === 'medium_confidence' || 
                   statusResponse.status === 'no_match' ||
                   statusResponse.matches !== undefined) {
          // Processing complete
          setPollingStatus('complete');
          setPollingResult(statusResponse);
          
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          // Refresh dashboard data to update complaint status
          fetchData();
        } else {
          // Error or unknown status
          setPollingStatus('error');
          setPollingResult(statusResponse);
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
        // On error, keep modal open but show error state
        // Don't stop polling completely - might be temporary network issue
        setPollingStatus('error');
        setPollingResult({ status: 'error', message: 'Failed to check status. Will keep trying...' });
      }
    }, 4000);
  };

  const handleStatusPolling = (jobId: string, complaintData: { category: string; itemName: string; location: string; dateFound: string; photo: File | null }) => {
    startStatusPolling(jobId, complaintData);
  };

  const handleCloseStatusModal = () => {
    setStatusModalOpen(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const handleDeleteComplaint = async (jobId: string) => {
    if (window.confirm('Are you sure you want to delete this complaint?')) {
      try {
        // Note: FastAPI doesn't have delete endpoint yet
        // For now, just remove from local state
        // You can add a delete endpoint in FastAPI if needed
        setComplaints(prev => prev.filter(c => c.job_id !== jobId));
        alert('Complaint removed from view. Note: This does not remove it from FAISS database.');
      } catch (error) {
        console.error('Failed to delete complaint:', error);
        alert('Failed to delete complaint');
      }
    }
  };

  const matchedItems = complaints.filter(item => item.status === 'matched');
  const resolvedItems: ComplaintItem[] = []; // No resolved status in FastAPI for now
  // Show all complaints in "My Complaints" tab
  const allComplaints = complaints;

  const AddComplaintButton = () => (
    <button
      onClick={() => setShowAddComplaint(true)}
      className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded shadow font-semibold transition-colors"
    >
      + Add Complaint
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Lost & Found</h1>
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search complaints..."
            className="border rounded px-2 py-1"
          />
          <div className="relative">
            <button className="relative">
              🔔
              {matchedItems.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                  {matchedItems.length}
                </span>
              )}
            </button>
          </div>
          <span className="text-sm">{user?.name} ({user?.email})</span>
          <button
            onClick={onLogout}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 p-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500">My Lost Items</h2>
          <p className="text-2xl font-bold">{summaryData.lost}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500">Matched Items</h2>
          <p className="text-2xl font-bold">{summaryData.matched}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500">Resolved Cases</h2>
          <p className="text-2xl font-bold">{summaryData.resolved}</p>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="p-4">
        <div className="mb-4">
          <AddComplaintButton />
        </div>

        <div className="flex space-x-4 border-b items-center">
          <button
            className={`px-4 py-2 ${activeTab === 'complaints' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
            onClick={() => setActiveTab('complaints')}
          >
            My Complaints ({allComplaints.length})
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'matched' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
            onClick={() => setActiveTab('matched')}
          >
            Matched Items ({matchedItems.length})
          </button>
          <button
            className={`px-4 py-2 ${activeTab === 'resolved' ? 'border-b-2 border-blue-500 font-bold' : ''}`}
            onClick={() => setActiveTab('resolved')}
          >
            Resolved Cases ({resolvedItems.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'complaints' && (
            <div className="space-y-2">
              {allComplaints.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No complaints</p>
                  <p className="text-sm text-gray-400 mt-2">Submit a new complaint to see it here</p>
                </div>
              ) : (
                allComplaints.map(item => {
                  // Get status badge color based on status
                  const getStatusBadge = (status: string) => {
                    switch (status) {
                      case 'pending':
                        return 'bg-yellow-100 text-yellow-800';
                      case 'matched':
                      case 'high_confidence':
                      case 'medium_confidence':
                        return 'bg-blue-100 text-blue-800';
                      case 'no_match':
                        return 'bg-gray-100 text-gray-800';
                      case 'resolved':
                        return 'bg-green-100 text-green-800';
                      default:
                        return 'bg-gray-100 text-gray-800';
                    }
                  };

                  const getStatusLabel = (status: string) => {
                    switch (status) {
                      case 'pending':
                        return 'Pending';
                      case 'matched':
                      case 'high_confidence':
                        return 'Matched';
                      case 'medium_confidence':
                        return 'Potential Match';
                      case 'no_match':
                        return 'No Match';
                      case 'resolved':
                        return 'Resolved';
                      default:
                        return status.charAt(0).toUpperCase() + status.slice(1);
                    }
                  };

                  return (
                    <div key={item.job_id} className="bg-white p-4 rounded shadow flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{item.itemName || 'Unnamed Item'}</span>
                          <span className={`text-xs px-2 py-1 rounded ${getStatusBadge(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Location:</span> {item.location} • 
                          <span className="font-medium ml-2">Date:</span> {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                        </p>
                        {item.message && (
                          <p className="text-xs text-gray-500 mt-1">{item.message}</p>
                        )}
                        {item.matches && item.matches.length > 0 && (
                          <p className="text-xs text-blue-600 mt-1">
                            {item.matches.length} potential match{item.matches.length > 1 ? 'es' : ''} found
                          </p>
                        )}
                      </div>
                      <div className="space-x-2">
                        <button 
                          className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600" 
                          onClick={() => handleDeleteComplaint(item.job_id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'matched' && (
            <div className="space-y-2">
              {matchedItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No matched items yet</p>
              ) : (
                matchedItems.map(item => (
                  <div key={item.job_id} className="bg-white p-4 rounded shadow flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{item.itemName || 'Unnamed Item'}</span>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Matched</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Location:</span> {item.location} • 
                        <span className="font-medium ml-2">Date:</span> {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                      </p>
                      {item.message && (
                        <p className="text-xs text-gray-500 mt-1">{item.message}</p>
                      )}
                      {item.matches && item.matches.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-blue-600">
                            {item.matches.length} potential match{item.matches.length > 1 ? 'es' : ''} found:
                          </p>
                          <ul className="text-xs text-gray-600 mt-1 ml-4 list-disc">
                            {item.matches.slice(0, 3).map((match, idx) => (
                              <li key={idx}>
                                Match {idx + 1}: Score {(match.score * 100).toFixed(1)}% 
                                {match.meta.location && ` - Location: ${match.meta.location}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <button className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                      View Details
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'resolved' && (
            <div className="space-y-2">
              {resolvedItems.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No resolved cases</p>
              ) : (
                resolvedItems.map(item => (
                  <div key={item.job_id} className="bg-white p-4 rounded shadow">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{item.itemName || 'Unnamed Item'}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Resolved ✓</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Location:</span> {item.location} • 
                      <span className="font-medium ml-2">Date:</span> {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                    </p>
                    {item.message && (
                      <p className="text-xs text-gray-500 mt-1">{item.message}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

            {/* Add Complaint Form Modal */}
      {showAddComplaint && (
        <AddComplaintForm
          onClose={() => setShowAddComplaint(false)}
          onSubmit={async () => {
            setShowAddComplaint(false);
            // Refresh data to show the newly created complaint
            await fetchData();
          }}
          onStatusPolling={handleStatusPolling}
        />
      )}

      {/* Status Polling Modal */}
      {pollingJobId && (
        <StatusPollingModal
          jobId={pollingJobId}
          isOpen={statusModalOpen}
          status={pollingStatus}
          result={pollingResult}
          onClose={handleCloseStatusModal}
        />
      )}
    </div>
  );
};

export default StudentDashboard;
