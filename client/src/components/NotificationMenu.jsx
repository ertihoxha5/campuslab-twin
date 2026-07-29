import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, X } from "lucide-react";
import { api } from "@/api/client.js";

const formatDate = (value) =>
  new Intl.DateTimeFormat("sq-AL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function NotificationMenu() {
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    function closeOnOutsideClick(event) {
      if (!panelRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  async function loadNotifications() {
    setLoading(true);
    setMessage("");
    try {
      const response = await api.get("/api/notifications");
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleMenu() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) await loadNotifications();
  }

  async function markRead(notification) {
    if (notification.readAt) return;
    try {
      await api.patch(`/api/notifications/${notification.id}/read`, {});
      setNotifications((items) =>
        items.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function markAllRead() {
    try {
      await api.patch("/api/notifications/read-all", {});
      const readAt = new Date().toISOString();
      setNotifications((items) =>
        items.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
      );
      setUnreadCount(0);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="notification-menu" ref={panelRef}>
      <button
        type="button"
        className="notification-button"
        aria-label="Njoftimet"
        aria-expanded={open}
        onClick={toggleMenu}
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="notification-panel">
          <div className="notification-panel-heading">
            <div>
              <strong>Njoftimet</strong>
              <small>{unreadCount} të palexuara</small>
            </div>
            <button
              type="button"
              aria-label="Mbyll njoftimet"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              className="mark-all-read"
              onClick={markAllRead}
            >
              <CheckCheck size={16} /> Shënoji të gjitha si të lexuara
            </button>
          )}
          {message && (
            <p className="notification-message" role="alert">
              {message}
            </p>
          )}
          <div className="notification-list" aria-busy={loading}>
            {loading ? (
              <p>Po ngarkohen njoftimet…</p>
            ) : notifications.length === 0 ? (
              <p>Nuk keni njoftime.</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={notification.readAt ? "" : "is-unread"}
                  onClick={() => markRead(notification)}
                >
                  <span>
                    <strong>{notification.title}</strong>
                    <small>{formatDate(notification.createdAt)}</small>
                  </span>
                  <p>{notification.message}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
