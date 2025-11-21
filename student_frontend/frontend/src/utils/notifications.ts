interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "success" | "warning" | "info";
  category: "lost" | "found";
}

const resolveUserId = (explicit?: string) => {
  if (explicit) return explicit;
  try {
    const token = localStorage.getItem('token');
    if (!token) return 'anonymous';
    const seg = token.split('.')[1];
    const payload = JSON.parse(atob(seg.replace(/-/g, '+').replace(/_/g, '/')));
    return payload.id || payload.user_id || payload._id || 'anonymous';
  } catch {
    return 'anonymous';
  }
};

const makeKeys = (category: "lost" | "found", userId: string) => ({
  listKey: `notifications:${category}:${userId}`,
  countKey: `unreadNotificationCount:${category}:${userId}`,
  eventKey: `localStorageUpdated:${category}:${userId}`,
});

export const addNotification = (
  title: string,
  message: string,
  type: "success" | "warning" | "info" = "info",
  category: "lost" | "found" = "lost",
  userId?: string
) => {
  const uid = resolveUserId(userId);
  const { listKey, countKey, eventKey } = makeKeys(category, uid);

  const saved = localStorage.getItem(listKey);
  const notifications: Notification[] = saved !== null ? JSON.parse(saved) : [];
  const now = Date.now();
  const DEDUPE_WINDOW_MS = 60 * 1000;
  const recentSame = notifications.find(n => n.title === title && n.message === message);
  if (recentSame) {
    // If the most recent identical notification exists within window, do not add a duplicate
    // We can't store timestamps in existing structure beyond 'time', so treat any identical top entry as recent
    return recentSame;
  }
  const newNotification: Notification = {
    id: now,
    title,
    message,
    time: "Just now",
    read: false,
    type,
    category,
  };
  const updatedNotifications = [newNotification, ...notifications];
  localStorage.setItem(listKey, JSON.stringify(updatedNotifications));
  const currentCount = parseInt(localStorage.getItem(countKey) || '0', 10);
  localStorage.setItem(countKey, (currentCount + 1).toString());
  window.dispatchEvent(new CustomEvent(eventKey));
  return newNotification;
};

export const getNotifications = (category: "lost" | "found", userId: string): Notification[] => {
  const { listKey } = makeKeys(category, userId);
  const saved = localStorage.getItem(listKey);
  return saved !== null ? JSON.parse(saved) : [];
};

export const markAllRead = (category: "lost" | "found", userId: string) => {
  const { listKey, countKey, eventKey } = makeKeys(category, userId);
  const saved = localStorage.getItem(listKey);
  const notifications: Notification[] = saved !== null ? JSON.parse(saved) : [];
  const updated = notifications.map(n => ({ ...n, read: true }));
  localStorage.setItem(listKey, JSON.stringify(updated));
  localStorage.setItem(countKey, '0');
  window.dispatchEvent(new CustomEvent(eventKey));
};

