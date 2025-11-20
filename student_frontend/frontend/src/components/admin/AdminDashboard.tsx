import { useState, useRef, useEffect } from "react";
import { Search, Bell } from "lucide-react";
import { Input } from "../ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import StatsPanel from "./StatsPanel";
import FoundItemsTable from "./FoundItemsTable";
import LostItemsTable from "./LostItemsTable";
import NotificationPanel from "./NotificationPanel";
import UserProfileDropdown from "./UserProfileDropdown";
import { Toaster } from "../ui/sonner";
import { useAuth } from "../../context/AuthContext";

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("found");
  const tabsRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const adminUserId = user?._id || "admin";
  // Initialize unread count from localStorage
  const [unreadCount, setUnreadCount] = useState(() => {
    const saved = localStorage.getItem(`unreadNotificationCount:found:${adminUserId}`);
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  // Save unread count to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`unreadNotificationCount:found:${adminUserId}`, unreadCount.toString());
  }, [unreadCount, adminUserId]);

  const scrollToTabs = () => {
    tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Function to decrease notification count
  const handleNotificationRead = () => {
    setUnreadCount((prevCount) => Math.max(0, prevCount - 1));
  };

  // Function to mark all as read
  const handleMarkAllAsRead = () => {
    setUnreadCount(0);
  };

  // Function to add new notification (called when new match/item is found)
  const handleNewNotification = () => {
    setUnreadCount((prevCount) => prevCount + 1);
  };

  return (
    <>
      <Toaster />
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Lost & Found</h1>
              <p className="text-sm text-muted-foreground">Admin Dashboard</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items, claims, or users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
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
                    onNotificationRead={handleNotificationRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                    userId={adminUserId}
                    category="found"
                  />
                </PopoverContent>
              </Popover>
              <UserProfileDropdown onLogout={onLogout} />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <StatsPanel />

        <div className="mt-8" ref={tabsRef}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="found" onClick={scrollToTabs}>
                Found Items
              </TabsTrigger>
              <TabsTrigger value="lost" onClick={scrollToTabs}>
                Lost Items
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="found" className="mt-0">
              <FoundItemsTable 
                searchQuery={searchQuery}
                onNewItem={handleNewNotification}
              />
            </TabsContent>
            
            <TabsContent value="lost" className="mt-0">
              <LostItemsTable searchQuery={searchQuery} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
      </div>
    </>
  );
};

export default AdminDashboard;

