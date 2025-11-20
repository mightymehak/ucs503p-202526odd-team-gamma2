// src/components/StudentDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fastApiService, StatusResponse, ComplaintItem } from '../services/fastApiService';
import { addNotification } from '../utils/notifications';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import NotificationPanel from './admin/NotificationPanel';


interface SummaryData {
  lost: number;
  matched: number;
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
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!itemName || !location || !photo) {
      setError("Item Name, Location, and Photo are required for AI processing");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Submit to FastAPI backend for AI processing
      const response = await fastApiService.submitComplaint(photo, location, itemName, dateFound || undefined, user?._id, user?.name);
      
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
          if (user && response.job_id) {
            const key = `my_jobs:${user._id}`;
            const existing = JSON.parse(localStorage.getItem(key) || '[]');
            const updated = Array.from(new Set([response.job_id, ...existing]));
            localStorage.setItem(key, JSON.stringify(updated));
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
  const [activeTab, setActiveTab] = useState<'complaints' | 'matched'>('complaints');
  const [showAddComplaint, setShowAddComplaint] = useState<boolean>(false);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData>({ lost: 0, matched: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  
  // Status polling state
  const [statusModalOpen, setStatusModalOpen] = useState<boolean>(false);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string>('pending');
  const [pollingResult, setPollingResult] = useState<StatusResponse | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStatusesRef = useRef<Record<string, string>>({});
  const pendingWatchRef = useRef<Record<string, NodeJS.Timeout>>({});
  const pendingCyclesRef = useRef<number>(0);
  const errorCyclesRef = useRef<number>(0);

  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    const saved = localStorage.getItem(`unreadNotificationCount:lost:${user?._id || 'anonymous'}`);
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    const key = `unreadNotificationCount:lost:${user?._id || 'anonymous'}`;
    localStorage.setItem(key, unreadCount.toString());
  }, [unreadCount, user]);

  useEffect(() => {
    const syncUnread = () => {
      const saved = localStorage.getItem(`unreadNotificationCount:lost:${user?._id || 'anonymous'}`);
      const val = saved !== null ? parseInt(saved, 10) : 0;
      setUnreadCount(val);
    };
    window.addEventListener('storage', syncUnread);
    window.addEventListener(`localStorageUpdated:lost:${user?._id || 'anonymous'}`, syncUnread);
    return () => {
      window.removeEventListener('storage', syncUnread);
      window.removeEventListener(`localStorageUpdated:lost:${user?._id || 'anonymous'}`, syncUnread);
    };
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch complaints from FastAPI only
      const myIds = user && user._id ? JSON.parse(localStorage.getItem(`my_jobs:${user._id}`) || '[]') : [];
      let complaintsData = await fastApiService.getUserComplaints(user?._id);
      if (user && user._id) {
        complaintsData = complaintsData.filter(c => c.user_id === user._id || (c.job_id && myIds.includes(c.job_id)));
      }
      if ((complaintsData.length === 0) && Array.isArray(myIds) && myIds.length > 0) {
        const results = await Promise.allSettled(myIds.map(id => fastApiService.getComplaintById(id)));
        const fetched: ComplaintItem[] = results
          .map((r) => (r.status === 'fulfilled' ? r.value : null))
          .filter((c): c is ComplaintItem => !!c);
        complaintsData = fetched.filter(c => c && (!user || !user._id || c.user_id === user._id || myIds.includes(c.job_id)));
        if (user && user._id) {
          const key = `my_jobs:${user._id}`;
          const missing: string[] = myIds.filter((_, idx) => {
            const r = results[idx];
            if (r.status === 'fulfilled') return r.value === null;
            const anyR: any = r as any;
            return !!(anyR?.reason?.response?.status === 404);
          });
          if (missing.length > 0) {
            const updated = myIds.filter(id => !missing.includes(id));
            localStorage.setItem(key, JSON.stringify(updated));
          }
        }
      }
      const prevStatuses = lastStatusesRef.current;
      const nextStatuses: Record<string, string> = {};
      for (const c of complaintsData) {
        nextStatuses[c.job_id] = c.status;
      }
      for (const c of complaintsData) {
        const prev = prevStatuses[c.job_id];
        const next = c.status;
        if (prev && next && prev !== next && next !== 'pending') {
          const label = next === 'matched' || next === 'high_confidence'
            ? 'Matched'
            : next === 'medium_confidence'
            ? 'Potential Match'
            : next === 'no_match'
            ? 'No Match'
            : next;
          addNotification(
            'Item Status Updated',
            `${c.itemName || 'Item'} is now ${label}`,
            next === 'matched' || next === 'high_confidence' ? 'success' : next === 'no_match' ? 'info' : 'warning',
            'lost',
            user?._id
          );
        }
      }
      lastStatusesRef.current = nextStatuses;
      setComplaints(complaintsData);

      // Start watchers for pending items; update UI only when status changes
      for (const c of complaintsData) {
        if (c.status === 'pending' && c.job_id && !pendingWatchRef.current[c.job_id]) {
          pendingWatchRef.current[c.job_id] = setInterval(async () => {
            try {
              const res = await fastApiService.checkStatus(c.job_id);
              if (res.status && res.status !== 'pending') {
                setComplaints(prev => prev.map(item => (
                  item.job_id === c.job_id
                    ? { ...item, status: res.status as any, matches: res.matches || [], message: res.message || item.message }
                    : item
                )));
                clearInterval(pendingWatchRef.current[c.job_id]);
                delete pendingWatchRef.current[c.job_id];
                const label = (res.status === 'matched' || res.status === 'high_confidence')
                  ? 'Matched'
                  : res.status === 'medium_confidence'
                  ? 'Potential Match'
                  : res.status === 'no_match'
                  ? 'No Match'
                  : res.status || 'Updated';
                addNotification(
                  'Item Status Updated',
                  `${c.itemName || 'Item'} is now ${label}`,
                  res.status === 'matched' || res.status === 'high_confidence' ? 'success' : res.status === 'no_match' ? 'info' : 'warning',
                  'lost',
                  user?._id
                );
              }
            } catch {
              // ignore transient errors
            }
          }, 6000);
        }
      }
      
      // Calculate stats from complaints
      const stats = {
        lost: complaintsData.length,
        matched: complaintsData.filter(c => c.status === 'matched').length,
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
    return () => {
      Object.values(pendingWatchRef.current).forEach(clearInterval);
      pendingWatchRef.current = {};
    };
  }, [user]);

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
    pendingCyclesRef.current = 0;
    errorCyclesRef.current = 0;

    // Refresh dashboard to show the complaint immediately (with pending status)
    fetchData();

    // Poll every 4 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const statusResponse = await fastApiService.checkStatus(jobId);
        
        if (statusResponse.status === 'pending') {
          setPollingStatus('pending');
          pendingCyclesRef.current += 1;
          if (pendingCyclesRef.current >= 5) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setStatusModalOpen(false);
          }
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
          const finalStatus = statusResponse.status;
          const label = (finalStatus === 'matched' || finalStatus === 'high_confidence')
            ? 'Matched'
            : finalStatus === 'medium_confidence'
            ? 'Potential Match'
            : finalStatus === 'no_match'
            ? 'No Match'
            : finalStatus || 'Updated';
          addNotification(
            'Item Status Updated',
            `Your complaint ${complaintData.itemName || 'Item'} is now ${label}`,
            finalStatus === 'matched' || finalStatus === 'high_confidence' ? 'success' : finalStatus === 'no_match' ? 'info' : 'warning',
            'lost',
            user?._id
          );
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
        setPollingStatus('error');
        setPollingResult({ status: 'error', message: 'Failed to check status. Will keep trying...' });
        errorCyclesRef.current += 1;
        if (errorCyclesRef.current >= 3) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setStatusModalOpen(false);
        }
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
        await fastApiService.deleteComplaint(jobId);
        setComplaints(prev => prev.filter(c => c.job_id !== jobId));
        if (user && user._id) {
          const key = `my_jobs:${user._id}`;
          const existing = JSON.parse(localStorage.getItem(key) || '[]');
          const updated = existing.filter((id: string) => id !== jobId);
          localStorage.setItem(key, JSON.stringify(updated));
        }
        // Stop any pending watcher for this job
        if (pendingWatchRef.current[jobId]) {
          clearInterval(pendingWatchRef.current[jobId]);
          delete pendingWatchRef.current[jobId];
        }
      } catch (error) {
        console.error('Failed to delete complaint:', error);
        alert('Failed to delete complaint');
      }
    }
  };

  const matchedItems = complaints.filter(item => item.status === 'matched');
  
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive text-destructive-foreground">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <NotificationPanel
                onNotificationRead={() => setUnreadCount((c) => Math.max(0, c - 1))}
                onMarkAllAsRead={() => setUnreadCount(0)}
                userId={user?._id || 'anonymous'}
                category="lost"
              />
            </PopoverContent>
          </Popover>
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
      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500">My Lost Items</h2>
          <p className="text-2xl font-bold">{summaryData.lost}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-gray-500">Matched Items</h2>
          <p className="text-2xl font-bold">{summaryData.matched}</p>
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
          onSubmit={async (complaintData) => {
            setShowAddComplaint(false);
            // Optimistically add pending item
            if (complaintData && complaintData.jobId) {
              const optimistic: ComplaintItem = {
                job_id: complaintData.jobId!,
                itemName: complaintData.itemName,
                location: complaintData.location,
                date: complaintData.dateFound,
                type: 'lost_report',
                timestamp: Date.now(),
                status: 'pending',
                message: 'Processing...',
                user_id: user?._id,
              };
              setComplaints(prev => [optimistic, ...prev]);
            }
            // Also refresh from backend to sync
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
