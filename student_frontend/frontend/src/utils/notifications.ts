interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "success" | "warning" | "info";
}

export const addNotification = (
  title: string,
  message: string,
  type: "success" | "warning" | "info" = "info"
) => {
  // Get existing notifications
  const saved = localStorage.getItem('notifications');
  const notifications: Notification[] = saved !== null ? JSON.parse(saved) : [];
  
  // Create new notification
  const newNotification: Notification = {
    id: Date.now(),
    title,
    message,
    time: "Just now",
    read: false,
    type,
  };
  
  // Add to beginning of array
  const updatedNotifications = [newNotification, ...notifications];
  
  // Save back to localStorage
  localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  
  // Update unread count
  const currentCount = parseInt(localStorage.getItem('unreadNotificationCount') || '0', 10);
  localStorage.setItem('unreadNotificationCount', (currentCount + 1).toString());
  
  // Trigger custom event for same-tab updates
  window.dispatchEvent(new CustomEvent('localStorageUpdated'));
  
  return newNotification;
};

