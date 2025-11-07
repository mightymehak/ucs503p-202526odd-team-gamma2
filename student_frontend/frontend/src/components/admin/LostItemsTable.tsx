import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { FileSearch } from "lucide-react";

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
  description?: string;
}

const LostItemsTable = ({ searchQuery }: LostItemsTableProps) => {
  // Load items from localStorage - NO DEFAULT DATA
  const [items, setItems] = useState<LostItem[]>(() => {
    const saved = localStorage.getItem('lostItems');
    return saved !== null ? JSON.parse(saved) : [];
  });

  // Save items whenever they change
  useEffect(() => {
    localStorage.setItem('lostItems', JSON.stringify(items));
  }, [items]);

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
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-foreground">{item.name}</h4>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
                    <span>ID: {item.id}</span>
                    <span>•</span>
                    <span>Reporter: {item.reporter}</span>
                    <span>•</span>
                    <span>{item.dateReported}</span>
                    <span>•</span>
                    <span>{item.location}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  View Details
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LostItemsTable;
