import { useState } from 'react';
import { Bell } from 'lucide-react';

export function NotificationPlaceholder() {
  const [open, setOpen] = useState(false);

  return (
    <div className="notification-placeholder">
      <button
        className="notification-trigger"
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        aria-controls="notification-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={16} aria-hidden="true" />
        <span>Notifications</span>
      </button>
      {open && (
        <section className="notification-panel" id="notification-panel" role="region" aria-label="Notifications">
          <strong>Notifications</strong>
          <p>No notifications to show yet.</p>
        </section>
      )}
    </div>
  );
}
