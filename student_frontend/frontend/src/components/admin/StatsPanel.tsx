import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Package } from "lucide-react";

const StatsPanel = () => {
  const [stats, setStats] = useState({
    totalFound: 0,
    foundThisWeek: 0,
  });

  const calculateStats = () => {
    // Get found items from localStorage
    const foundItems = JSON.parse(localStorage.getItem('foundItems') || '[]');
    

    // Calculate total found items
    const totalFound = foundItems.length;


    // Calculate items added this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const foundThisWeek = foundItems.filter((item: any) => {
      const itemDate = new Date(item.date);
      return itemDate >= oneWeekAgo;
    }).length;

    setStats({
      totalFound,
      foundThisWeek,
    });
  };

  // Calculate stats on mount and when localStorage changes
  useEffect(() => {
    calculateStats();

    // Listen for storage events (when data is added/changed)
    const handleStorageChange = () => {
      calculateStats();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdated', handleStorageChange);
    window.addEventListener('statsUpdate', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdated', handleStorageChange);
      window.removeEventListener('statsUpdate', handleStorageChange);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Found Items</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.totalFound}</p>
              {stats.foundThisWeek > 0 && (
                <p className="text-xs text-success mt-1">+{stats.foundThisWeek} this week</p>
              )}
            </div>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Package className="h-6 w-6 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      
    </div>
  );
};

export default StatsPanel;
