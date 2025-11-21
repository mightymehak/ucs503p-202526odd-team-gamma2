import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Bell, CheckCircle2, Clock } from "lucide-react";

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "success" | "warning" | "info";
}

interface NotificationPanelProps {
  onNotificationRead?: () => void;
  onMarkAllAsRead?: () => void;
  userId: string;
  category: "lost" | "found";
}

const NotificationPanel = ({ onNotificationRead, onMarkAllAsRead, userId, category }: NotificationPanelProps) => {
  // Load notifications from localStorage on mount
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const key = `notifications:${category}:${userId}`;
    const saved = localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : [];
  });

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    const key = `notifications:${category}:${userId}`;
    localStorage.setItem(key, JSON.stringify(notifications));
  }, [notifications, userId, category]);

  // Listen for storage changes (new notifications added)
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(`notifications:${category}:${userId}`);
      if (saved !== null) {
        setNotifications(JSON.parse(saved));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(`localStorageUpdated:${category}:${userId}`, handleStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(`localStorageUpdated:${category}:${userId}`, handleStorageChange as EventListener);
    };
  }, [userId, category]);

  // Mark individual notification as read
  const handleMarkAsRead = (notificationId: number) => {
    setNotifications((prevNotifications) => {
      const updated = prevNotifications.filter((n) => n.id !== notificationId);
      const countKey = `unreadNotificationCount:${category}:${userId}`;
      const currentCount = parseInt(localStorage.getItem(countKey) || '0', 10);
      localStorage.setItem(countKey, Math.max(0, currentCount - 1).toString());
      localStorage.setItem(`notifications:${category}:${userId}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(`localStorageUpdated:${category}:${userId}`));
      return updated;
    });
    
    if (onNotificationRead) {
      setTimeout(() => onNotificationRead(), 0);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = () => {
    setNotifications(() => {
      const countKey = `unreadNotificationCount:${category}:${userId}`;
      localStorage.setItem(countKey, '0');
      localStorage.setItem(`notifications:${category}:${userId}`, JSON.stringify([]));
      window.dispatchEvent(new CustomEvent(`localStorageUpdated:${category}:${userId}`));
      return [];
    });
    
    if (onMarkAllAsRead) {
      setTimeout(() => onMarkAllAsRead(), 0);
    }
  };

  // Calculate unread count
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Get icon based on notification type
  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "warning":
        return <Clock className="h-4 w-4 text-accent" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <Card className="w-full sm:w-96 max-w-[calc(100vw-2rem)] border-0 shadow-lg">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Notifications</CardTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-xs h-8"
            >
              Mark all as read
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0 max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-muted/50 transition-colors ${
                  !notification.read ? "bg-muted/30" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-medium text-sm">{notification.title}</p>
                      {!notification.read && (
                        <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {notification.time}
                      </span>
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="h-6 text-xs px-2"
                        >
                          Mark as read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationPanel;
