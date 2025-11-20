import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { FileSearch } from "lucide-react";
import { fastApiService, ComplaintItem } from "../../services/fastApiService";

interface LostItemsTableProps {
  searchQuery: string;
}

interface LostItem {
  id: string;
  name: string;
  reporter: string;
  dateReported: string;
  location: string;
  status: string;
  imageUrl?: string;
}

const LostItemsTable = ({ searchQuery }: LostItemsTableProps) => {
  // Load items from localStorage - NO DEFAULT DATA
  const [items, setItems] = useState<LostItem[]>(() => {
    const saved = localStorage.getItem('lostItems');
    return saved !== null ? JSON.parse(saved) : [];
  });
  const pendingWatchRef = useRef<Record<string, NodeJS.Timeout>>({});

  // Save items whenever they change
  useEffect(() => {
    localStorage.setItem('lostItems', JSON.stringify(items));
  }, [items]);

  const fetchLost = async () => {
    try {
      let lost = await fastApiService.getAdminLostItemsFaiss();
      if (!Array.isArray(lost) || lost.length === 0) {
        lost = await fastApiService.getAdminLostItems();
      }
      const mapped: LostItem[] = lost.map((c: ComplaintItem) => ({
        id: c.job_id,
        name: c.itemName || "Item",
        reporter: (c as any).user_name || (c.user_id ? `User ${c.user_id.substring(0,6)}` : "Unknown"),
        dateReported: c.date || new Date(c.timestamp * 1000).toISOString().split('T')[0],
        location: c.location || "",
        status: c.status || "searching",
        imageUrl: c.job_id ? ((c as any).image_url || fastApiService.getImageUrl(c.job_id)) : undefined,
      }));
      setItems(mapped);
      mapped.forEach((it) => {
        const jid = it.id;
        if (it.status === 'pending' && jid && !pendingWatchRef.current[jid]) {
          pendingWatchRef.current[jid] = setInterval(async () => {
            try {
              const res = await fastApiService.checkStatus(jid);
              if (res.status && res.status !== 'pending') {
                setItems(prev => prev.map(item => (
                  item.id === jid ? { ...item, status: res.status as any } : item
                )));
                clearInterval(pendingWatchRef.current[jid]);
                delete pendingWatchRef.current[jid];
              }
            } catch {}
          }, 6000);
        }
      });
    } catch (e) {
      // fallback keeps localStorage display
    }
  };

  useEffect(() => {
    fetchLost();
    return () => {
      Object.values(pendingWatchRef.current).forEach(clearInterval);
      pendingWatchRef.current = {};
    };
  }, []);

  const filteredItems = items.filter((item) =>
    searchQuery === "" ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.reporter.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "matched":
        return <Badge className="bg-success">Matched</Badge>;
      case "searching":
        return <Badge variant="secondary">Searching</Badge>;
      case "closed":
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lost Items Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-12">
            <FileSearch className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No lost items reported</p>
            <p className="text-sm text-muted-foreground">Lost item reports will appear here when users submit them</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <img
                    src={(item as any).imageUrl || undefined}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-md border"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-foreground">{item.name}</h4>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
                    <span>Reporter: {item.reporter}</span>
                    <span>•</span>
                    <span>{item.dateReported}</span>
                    <span>•</span>
                    <span>{item.location}</span>
                  </div>
                </div>
                <div className="w-0" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LostItemsTable;
