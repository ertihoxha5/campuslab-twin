import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Inbox, X } from "lucide-react";
import { api } from "@/api/client.js";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton.jsx";

const formatDate = (value) => new Intl.DateTimeFormat("sq-AL", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

export function NotificationMenu() {
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    closeButtonRef.current?.focus();
    function closeOnInteraction(event) {
      if (event.type === "keydown" && event.key === "Escape") setOpen(false);
      if (event.type === "mousedown" && !panelRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnInteraction);
    document.addEventListener("keydown", closeOnInteraction);
    return () => {
      document.removeEventListener("mousedown", closeOnInteraction);
      document.removeEventListener("keydown", closeOnInteraction);
    };
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
      const readAt = new Date().toISOString();
      setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, readAt } : item));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function markAllRead() {
    try {
      await api.patch("/api/notifications/read-all", {});
      const readAt = new Date().toISOString();
      setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
      setUnreadCount(0);
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <div className="notification-menu" ref={panelRef}>
      <button type="button" className="notification-button" aria-label="Njoftimet" aria-expanded={open}
        aria-controls="university-notification-panel" onClick={toggleMenu}>
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <section className="notification-panel" id="university-notification-panel" aria-label="Njoftimet e universitetit">
          <header className="notification-panel-heading">
            <div><strong>Njoftimet</strong><small>{unreadCount} të palexuara</small></div>
            <button ref={closeButtonRef} type="button" aria-label="Mbyll njoftimet" onClick={() => setOpen(false)}><X size={17} /></button>
          </header>
          {unreadCount > 0 && (
            <button type="button" className="mark-all-read" onClick={markAllRead}>
              <CheckCheck size={15} /> Shënoji të gjitha si të lexuara
            </button>
          )}
          {message && <p className="notification-message" role="alert">{message}</p>}
          <div className="notification-list" aria-busy={loading}>
            {loading ? <LoadingSkeleton rows={4} aria-label="Po ngarkohen njoftimet" /> : notifications.length === 0 ? (
              <div className="notification-empty"><Inbox size={21} /><strong>Nuk ka njoftime</strong><p>Njoftimet e reja operative do të shfaqen këtu.</p></div>
            ) : notifications.map((notification) => (
              <button key={notification.id} type="button" className={notification.readAt ? "" : "is-unread"}
                onClick={() => markRead(notification)}>
                <span><strong>{notification.title}</strong><small>{formatDate(notification.createdAt)}</small></span>
                <p>{notification.message}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
