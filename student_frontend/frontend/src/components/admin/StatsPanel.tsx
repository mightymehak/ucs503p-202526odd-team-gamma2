import { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Package, Clock, CheckCircle } from "lucide-react";

const StatsPanel = () => {
  const [stats, setStats] = useState({
    totalFound: 0,
    pendingClaims: 0,
    resolvedCases: 0,
    foundThisWeek: 0,
    resolvedThisWeek: 0,
  });

  const calculateStats = () => {
    // Get found items from localStorage
    const foundItems = JSON.parse(localStorage.getItem('foundItems') || '[]');
    
    // Get pending claims from localStorage
    const pendingClaims = JSON.parse(localStorage.getItem('pendingClaims') || '[]');
    
    // Get resolved claims from localStorage
    const resolvedClaims = JSON.parse(localStorage.getItem('resolvedClaims') || '[]');

    // Calculate total found items
    const totalFound = foundItems.length;

    // Calculate pending claims (claims with status "pending")
    const totalPendingClaims = pendingClaims.filter(
      (claim: any) => claim.status === 'pending'
    ).length;

    // Calculate resolved cases
    const totalResolvedCases = resolvedClaims.length;

    // Calculate items added this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const foundThisWeek = foundItems.filter((item: any) => {
      const itemDate = new Date(item.date);
      return itemDate >= oneWeekAgo;
    }).length;

    const resolvedThisWeek = resolvedClaims.filter((claim: any) => {
      const resolvedDate = new Date(claim.resolvedDate || claim.dateSubmitted);
      return resolvedDate >= oneWeekAgo;
    }).length;

    setStats({
      totalFound,
      pendingClaims: totalPendingClaims,
      resolvedCases: totalResolvedCases,
      foundThisWeek,
      resolvedThisWeek,
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Claims</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.pendingClaims}</p>
              {stats.pendingClaims > 0 && (
                <p className="text-xs text-accent mt-1">Needs attention</p>
              )}
            </div>
            <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-accent" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Resolved Cases</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stats.resolvedCases}</p>
              {stats.resolvedThisWeek > 0 && (
                <p className="text-xs text-success mt-1">+{stats.resolvedThisWeek} this week</p>
              )}
            </div>
            <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatsPanel;
