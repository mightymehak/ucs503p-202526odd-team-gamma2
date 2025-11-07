import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { CheckCircle2, XCircle, Eye, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import ApproveClaimDialog from "./ApproveClaimDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/dialog";

interface PendingClaimsTableProps {
  searchQuery: string;
}

interface Claim {
  id: string;
  itemName: string;
  claimant: string;
  dateSubmitted: string;
  matchConfidence: number;
  aiMatch: string;
  status: string;
}

const PendingClaimsTable = ({ searchQuery }: PendingClaimsTableProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<{ id: string; itemName: string } | null>(null);
  const [dialogAction, setDialogAction] = useState<"approve" | "reject">("approve");
  
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewSelectedClaim, setViewSelectedClaim] = useState<Claim | null>(null);

  // Load claims from localStorage - NO DEFAULT DATA
  const [claims, setClaims] = useState<Claim[]>(() => {
    const saved = localStorage.getItem('pendingClaims');
    return saved !== null ? JSON.parse(saved) : [];
  });

  // Initialize empty resolved claims storage
  useEffect(() => {
    const existingResolved = localStorage.getItem('resolvedClaims');
    if (!existingResolved) {
      localStorage.setItem('resolvedClaims', JSON.stringify([]));
    }
  }, []);

  // Save claims whenever they change
  useEffect(() => {
    localStorage.setItem('pendingClaims', JSON.stringify(claims));
  }, [claims]);

  const filteredClaims = claims.filter((claim) =>
    searchQuery === "" ||
    claim.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    claim.claimant.toLowerCase().includes(searchQuery.toLowerCase()) ||
    claim.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openApproveDialog = (id: string, itemName: string) => {
    setSelectedClaim({ id, itemName });
    setDialogAction("approve");
    setDialogOpen(true);
  };

  const openRejectDialog = (id: string, itemName: string) => {
    setSelectedClaim({ id, itemName });
    setDialogAction("reject");
    setDialogOpen(true);
  };

  const openViewDialog = (claim: Claim) => {
    setViewSelectedClaim(claim);
    setViewDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!selectedClaim) return;
    
    if (dialogAction === "approve") {
      // Remove from pending and add to resolved
      const claimToResolve = claims.find(c => c.id === selectedClaim.id);
      if (claimToResolve) {
        setClaims(claims.filter(c => c.id !== selectedClaim.id));
        
        const resolvedClaims = JSON.parse(localStorage.getItem('resolvedClaims') || '[]');
        resolvedClaims.push({
          ...claimToResolve,
          status: 'approved',
          resolvedDate: new Date().toISOString().split('T')[0]
        });
        localStorage.setItem('resolvedClaims', JSON.stringify(resolvedClaims));
        
        window.dispatchEvent(new Event('statsUpdate'));
      }
      
      toast.success(`Claim ${selectedClaim.id} approved`, {
        description: `${selectedClaim.itemName} will be returned to the claimant`,
      });
    } else {
      setClaims(claims.filter(c => c.id !== selectedClaim.id));
      window.dispatchEvent(new Event('statsUpdate'));
      
      toast.error(`Claim ${selectedClaim.id} rejected`, {
        description: "The claimant has been notified",
      });
    }
    
    setDialogOpen(false);
    setSelectedClaim(null);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 85) return <Badge className="bg-success">High Match</Badge>;
    if (confidence >= 70) return <Badge variant="secondary">Medium Match</Badge>;
    return <Badge variant="outline">Low Match</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Pending Claims</CardTitle>
        </CardHeader>
        <CardContent>
          {claims.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">No pending claims</p>
              <p className="text-sm text-muted-foreground">Claims will appear here when users report lost items</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-foreground">{claim.itemName}</h4>
                      {getConfidenceBadge(claim.matchConfidence)}
                      <Badge variant="outline" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        AI: {claim.aiMatch}
                      </Badge>
                    </div>
                    <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
                      <span>ID: {claim.id}</span>
                      <span>•</span>
                      <span>Claimant: {claim.claimant}</span>
                      <span>•</span>
                      <span>{claim.dateSubmitted}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openViewDialog(claim)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-success hover:text-success"
                      onClick={() => openApproveDialog(claim.id, claim.itemName)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => openRejectDialog(claim.id, claim.itemName)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedClaim && (
        <ApproveClaimDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onConfirm={handleConfirmAction}
          itemName={selectedClaim.itemName}
          claimId={selectedClaim.id}
          action={dialogAction}
        />
      )}

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Claim Details</DialogTitle>
            <DialogDescription>
              Complete information about this claim
            </DialogDescription>
          </DialogHeader>
          
          {viewSelectedClaim && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Item Name</p>
                  <p className="text-base font-semibold">{viewSelectedClaim.itemName}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Claim ID</p>
                  <p className="text-base">{viewSelectedClaim.id}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Claimant</p>
                  <p className="text-base">{viewSelectedClaim.claimant}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date Submitted</p>
                  <p className="text-base">{viewSelectedClaim.dateSubmitted}</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Match Confidence</p>
                  <p className="text-base">{viewSelectedClaim.matchConfidence}%</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">AI Match Level</p>
                  <p className="text-base">{viewSelectedClaim.aiMatch}</p>
                </div>
                
                <div className="col-span-2">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="text-base capitalize">{viewSelectedClaim.status.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PendingClaimsTable;
