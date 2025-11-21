import { useState, useEffect, useRef } from "react";
import { fastApiService, StatusResponse, MatchResult, ComplaintItem } from "../../services/fastApiService";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../ui/dialog";
import { MapPin, Calendar, Sparkles, Plus, Package } from "lucide-react";
import { toast } from "sonner";
import { addNotification } from "../../utils/notifications";

interface FoundItemsTableProps {
  searchQuery: string;
  onNewItem?: () => void;
}

interface FoundItem {
  id: string;
  name: string;
  location: string;
  date: string;
  status: string;
  matchCount: number;
  aiMatch: string;
  aiConfidence: number;
  description?: string;
  category?: string;
  jobId?: string;
  photoUrl?: string;
}

const FoundItemsTable = ({ searchQuery, onNewItem }: FoundItemsTableProps) => {
  // Load items from localStorage ONLY - NO DEFAULT DATA AT ALL
  const [items, setItems] = useState<FoundItem[]>(() => {
    const saved = localStorage.getItem('foundItems');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return []; // Return empty array if nothing saved
  });

  // Save items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('foundItems', JSON.stringify(items));
    // Trigger stats update
    window.dispatchEvent(new Event('statsUpdate'));
  }, [items]);

  useEffect(() => {
    const fetchFound = async () => {
      try {
        const found = await fastApiService.getAdminFoundItems();
        const mapped: FoundItem[] = found.map((c: ComplaintItem) => {
          const matchCount = Array.isArray(c.matches) ? c.matches.length : 0;
          const status = c.status || (matchCount > 0 ? 'matched' : 'pending');
          const aiConfidence = matchCount > 0 ? Math.round(c.matches![0].score * 100) : 0;
          return {
            id: c.job_id || generateId(),
            name: c.itemName || 'Item',
            location: c.location || '',
            date: c.date || new Date(c.timestamp * 1000).toISOString().split('T')[0],
            status,
            matchCount,
            aiMatch: matchCount > 0 ? 'Matched' : 'None',
            aiConfidence,
            description: c.message,
            category: undefined,
            jobId: c.job_id,
            photoUrl: c.job_id ? fastApiService.getImageUrl(c.job_id) : undefined,
          };
        });
        // Reconcile using lost-items FAISS: if any lost report matches reference a found jobId, mark that found item matched
        try {
          const lostFaiss = await fastApiService.getAdminLostItemsFaiss();
          const matchedFoundIds = new Set<string>();
          for (const l of lostFaiss) {
            const ls = (l as any).status;
            const ms = (l as any).matches;
            if (ls === 'matched' && Array.isArray(ms)) {
              for (const m of ms) {
                const meta = m && (m as any).meta;
                const fid = meta && meta.job_id;
                if (fid) matchedFoundIds.add(fid);
              }
            }
          }
          const reconciled = mapped.map(it => matchedFoundIds.has(it.jobId || '')
            ? { ...it, status: 'matched', aiMatch: 'Matched', matchCount: Math.max(it.matchCount, 1) }
            : it);
          setItems(reconciled);
        } catch {
          setItems(mapped);
        }
        mapped.forEach((it) => {
          const jid = it.jobId;
          if ((it.status === 'pending' || it.status === 'unclaimed' || !it.status) && jid && !pendingWatchRef.current[jid]) {
            pendingWatchRef.current[jid] = setInterval(async () => {
              try {
                const res = await fastApiService.checkStatus(jid);
                if (res.status && res.status !== 'pending') {
                  setItems(prev => prev.map(item => (
                    item.jobId === jid
                      ? {
                          ...item,
                          status: 'matched',
                          matchCount: Array.isArray(res.matches) ? res.matches.length : item.matchCount,
                          aiMatch: 'Matched',
                          aiConfidence: Array.isArray(res.matches) && res.matches.length > 0 ? Math.round((res.matches[0] as any).score * 100) : item.aiConfidence,
                        }
                      : item
                  )));
                  clearInterval(pendingWatchRef.current[jid]);
                  delete pendingWatchRef.current[jid];
                }
              } catch {}
            }, 6000);
          }
        });
      } catch {
        // keep local storage items if backend not available
      }
    };
    fetchFound();
    return () => {
      Object.values(pendingWatchRef.current).forEach(clearInterval);
      pendingWatchRef.current = {};
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const found = await fastApiService.getAdminFoundItems();
        const mapped: FoundItem[] = found.map((c: ComplaintItem) => {
          const matchCount = Array.isArray(c.matches) ? c.matches.length : 0;
          const status = c.status || (matchCount > 0 ? 'matched' : 'pending');
          const aiConfidence = matchCount > 0 ? Math.round(c.matches![0].score * 100) : 0;
          return {
            id: c.job_id || '',
            name: c.itemName || 'Item',
            location: c.location || '',
            date: c.date || new Date(c.timestamp * 1000).toISOString().split('T')[0],
            status,
            matchCount,
            aiMatch: matchCount > 0 ? 'Matched' : 'None',
            aiConfidence,
            description: c.message,
            category: undefined,
            jobId: c.job_id,
            photoUrl: c.job_id ? fastApiService.getImageUrl(c.job_id) : undefined,
          };
        });
        setItems(prev => {
          const byId: Record<string, FoundItem> = {};
          prev.forEach(p => { byId[p.jobId || p.id] = p; });
          mapped.forEach(m => {
            const key = m.jobId || m.id;
            const prevItem = byId[key];
            if (prevItem) {
              byId[key] = {
                ...prevItem,
                status: m.status,
                matchCount: m.matchCount,
                aiMatch: m.aiMatch,
                aiConfidence: m.aiConfidence,
                name: m.name || prevItem.name,
                location: m.location || prevItem.location,
                date: m.date || prevItem.date,
              };
            } else {
              byId[key] = m;
            }
          });
          const next = Object.values(byId);
          return next;
        });
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoundItem | null>(null);
  
  // Status polling state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string>('pending');
  const [pollingResult, setPollingResult] = useState<StatusResponse | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCyclesRef = useRef<number>(0);
  const errorCyclesRef = useRef<number>(0);
  const pendingWatchRef = useRef<Record<string, NodeJS.Timeout>>({});
  
  const [newItem, setNewItem] = useState({
    name: "",
    location: "",
    date: "",
    photo: null as File | null,
  });

  const filteredItems = items.filter((item) =>
    searchQuery === "" ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string, matchCount: number) => {
    if (status === "matched") {
      return (
        <Badge className="bg-accent">
          <Sparkles className="h-3 w-3 mr-1" />
          {matchCount} Match{matchCount > 1 ? "es" : ""}
        </Badge>
      );
    }
    return <Badge variant="outline">Unclaimed</Badge>;
  };

  const openViewDialog = (item: FoundItem) => {
    setSelectedItem(item);
    setViewDialogOpen(true);
  };

  const openAddDialog = () => {
    setAddDialogOpen(true);
  };

  const generateId = () => {
    if (items.length === 0) {
      return 'FND-001';
    }
    
    const existingIds = items.map(item => {
      const idNum = parseInt(item.id.split('-')[1]);
      return isNaN(idNum) ? 0 : idNum;
    });
    const maxId = Math.max(...existingIds);
    return `FND-${String(maxId + 1).padStart(3, '0')}`;
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.location || !newItem.photo) {
      toast.error("Item Name, Location, and Photo are required for AI processing");
      return;
    }

    try {
      // Submit to FastAPI backend for AI processing
      const response = await fastApiService.submitFoundItem(
        newItem.photo,
        newItem.location,
        newItem.name,
        newItem.date || undefined
      );

      // Also add to local storage for display
      const itemToAdd: FoundItem = {
        id: generateId(),
        name: newItem.name || 'Unnamed Item',
        location: newItem.location,
        date: newItem.date || new Date().toISOString().split('T')[0],
        status: "unclaimed",
        matchCount: 0,
        aiMatch: "None",
        aiConfidence: 0,
        jobId: response.job_id,
        photoUrl: newItem.photo ? URL.createObjectURL(newItem.photo) : undefined,
      };

      setItems(prevItems => [...prevItems, itemToAdd]);
      
      addNotification(
        "New Found Item Added",
        `${newItem.name || 'Item'} was added at ${newItem.location}`,
        "success",
        "found"
      );
      
      if (onNewItem) {
        onNewItem();
      }

      // Reset form and close dialog
      setNewItem({
        name: "",
        location: "",
        date: "",
        photo: null,
      });
      setAddDialogOpen(false);

      // Start status polling
      startStatusPolling(response.job_id, itemToAdd);
    } catch (error: any) {
      toast.error("Failed to submit found item", {
        description: error.response?.data?.detail || error.message || "An error occurred",
      });
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Start status polling
  const startStatusPolling = (jobId: string, item: FoundItem) => {
    setPollingJobId(jobId);
    setStatusModalOpen(true);
    setPollingStatus('pending');
    setPollingResult(null);

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
        } else if (statusResponse.status === 'high_confidence' || 
                   statusResponse.status === 'medium_confidence' || 
                   statusResponse.status === 'no_match') {
          // Processing complete
          setPollingStatus('complete');
          setPollingResult(statusResponse);
          
          // Normalize matches array - backend may return matches directly or in different format
          if (statusResponse.matches) {
            // Matches already in correct format
          } else if ((statusResponse as any).matches && Array.isArray((statusResponse as any).matches)) {
            // Ensure matches are properly structured
            statusResponse.matches = (statusResponse as any).matches;
          }
          
          // Update item status if matches found
          if (statusResponse.matches && statusResponse.matches.length > 0) {
            setItems(prevItems => prevItems.map(prevItem => 
              prevItem.id === item.id 
                ? {
                    ...prevItem,
                    status: "matched",
                    matchCount: statusResponse.matches!.length,
                    aiMatch: statusResponse.status === 'high_confidence' ? 'High' : 'Medium',
                    aiConfidence: statusResponse.matches![0].score * 100,
                  }
                : prevItem
            ));
          }
          
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          // Trigger stats update
          window.dispatchEvent(new Event('statsUpdate'));
        } else {
          // Error or unknown status
          setPollingStatus('error');
          setPollingResult(statusResponse);
          errorCyclesRef.current += 1;
          if (errorCyclesRef.current >= 1) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
            setStatusModalOpen(false);
          }
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
        setPollingStatus('error');
        setPollingResult({ status: 'error', message: 'Failed to check status' });
        errorCyclesRef.current += 1;
        if (errorCyclesRef.current >= 1) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setStatusModalOpen(false);
        }
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      }
    }, 4000);
  };

  const handleCloseStatusModal = () => {
    setStatusModalOpen(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Found Items Inventory</CardTitle>
          <Button onClick={openAddDialog} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Found Item
          </Button>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">No found items yet</p>
              <p className="text-sm text-muted-foreground">Start by adding your first found item</p>
            </div>
          ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 flex-wrap">
                  <img
                    src={item.photoUrl || (item.jobId ? fastApiService.getImageUrl(item.jobId) : undefined)}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-md border"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <h4 className="font-semibold text-foreground">{item.name}</h4>
                    {getStatusBadge(item.status, item.matchCount)}
                    <Badge variant="outline" className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      AI: {item.aiMatch}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {item.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {item.date}
                    </span>
                    <span>ID: {item.id}</span>
                    {item.aiConfidence > 0 && (
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        {item.aiConfidence}% Match
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto sm:justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openViewDialog(item)}
                    className="w-full sm:w-auto"
                  >
                    View Details
                  </Button>
                  {item.jobId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const res = await fastApiService.deleteFoundItem(item.jobId!);
                          setItems(prev => prev.filter(i => i.jobId !== item.jobId));
                          if (pendingWatchRef.current[item.jobId!]) {
                            clearInterval(pendingWatchRef.current[item.jobId!]);
                            delete pendingWatchRef.current[item.jobId!];
                          }
                          toast.success("Item resolved", { description: `Removed ${item.name}` });
                        } catch (error: any) {
                          toast.error("Failed to resolve item", { description: error.response?.data?.detail || error.message });
                        }
                      }}
                      className="w-full sm:w-auto"
                    >
                      Resolved
                    </Button>
                  )}
                </div>
              </div>
            ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Found Item Details</DialogTitle>
            <DialogDescription>
              Complete information about this found item
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Item Name</p>
                  <p className="text-base font-semibold">{selectedItem.name}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Item ID</p>
                  <p className="text-base">{selectedItem.id}</p>
                </div>

                {/* removed Category display */}

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date Found</p>
                  <p className="text-base">{selectedItem.date}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location Found</p>
                  <p className="text-base">{selectedItem.location}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="text-base capitalize">{selectedItem.status}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">AI Match Level</p>
                  <p className="text-base">{selectedItem.aiMatch}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Match Confidence</p>
                  <p className="text-base">
                    {selectedItem.aiConfidence > 0 ? `${selectedItem.aiConfidence}%` : "N/A"}
                  </p>
                </div>

                {selectedItem.matchCount > 0 && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Potential Matches</p>
                    <p className="text-base">{selectedItem.matchCount} match(es) found</p>
                  </div>
                )}

                {/* removed Description display */}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Found Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Found Item</DialogTitle>
            <DialogDescription>
              Enter the details of the found item to add it to the inventory
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-name">
                  Item Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="item-name"
                  placeholder="e.g., Blue Backpack"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  required
                />
              </div>

              {/* removed Item Type/Category field */}

              <div className="space-y-2">
                <Label htmlFor="item-location">
                  Location Found <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="item-location"
                  placeholder="e.g., Library - 2nd Floor"
                  value={newItem.location}
                  onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-date">
                  Date Found <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="item-date"
                  type="date"
                  value={newItem.date}
                  onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
                  max={getTodayDate()}
                />
                <p className="text-xs text-muted-foreground">
                  Cannot select future dates
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-photo">
                Upload Photo <span className="text-destructive">*</span> (Required for AI Processing)
              </Label>
              <Input
                id="item-photo"
                type="file"
                accept="image/*"
                onChange={(e) => setNewItem({ ...newItem, photo: e.target.files?.[0] || null })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Photo is required for AI matching
              </p>
            </div>

            {/* removed Description field */}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setNewItem({
                  name: "",
                  location: "",
                  date: "",
                  photo: null,
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Polling Modal */}
      {pollingJobId && (
        <Dialog open={statusModalOpen} onOpenChange={handleCloseStatusModal}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request Status</DialogTitle>
              <DialogDescription>
                Processing your found item submission
              </DialogDescription>
            </DialogHeader>
            
            {pollingStatus === 'pending' && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-lg font-medium">Request Queued. Checking for status...</p>
                <p className="text-sm text-muted-foreground mt-2">Job ID: {pollingJobId}</p>
              </div>
            )}

            {pollingStatus === 'complete' && pollingResult && (
              <div className="py-4">
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-semibold">Processing Complete!</p>
                  <p className="text-sm text-green-600 mt-1">{pollingResult.message}</p>
                </div>
                
                {pollingResult.matches && pollingResult.matches.length > 0 ? (
                  <div>
                    <p className="font-semibold mb-3">Potential Matches Found ({pollingResult.matches.length})</p>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {pollingResult.matches
                        .slice(0, 5)
                        .sort((a, b) => b.score - a.score)
                        .map((match, index) => (
                          <div
                            key={index}
                            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">Match #{index + 1}</span>
                              <Badge className="bg-accent">
                                Score: {(match.score * 100).toFixed(1)}%
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              {match.meta.location && (
                                <p>
                                  <MapPin className="h-3 w-3 inline mr-1" />
                                  Location: {match.meta.location}
                                </p>
                              )}
                              {match.meta.date && (
                                <p>
                                  <Calendar className="h-3 w-3 inline mr-1" />
                                  Date: {match.meta.date}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold mb-2">No Matches Found</p>
                    <p className="text-sm text-muted-foreground">
                      No matching items found in the database. The found item has been added to the database.
                    </p>
                  </div>
                )}
                
                <div className="mt-4">
                  <Button onClick={handleCloseStatusModal} className="w-full">
                    Close
                  </Button>
                </div>
              </div>
            )}

            {pollingStatus === 'error' && (
              <div className="py-4">
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-semibold">Error Processing Request</p>
                  <p className="text-sm text-red-600 mt-1">
                    {pollingResult?.message || 'An error occurred'}
                  </p>
                </div>
                <Button onClick={handleCloseStatusModal} variant="destructive" className="w-full">
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default FoundItemsTable;
