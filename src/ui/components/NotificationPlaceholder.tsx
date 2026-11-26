import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bell, CalendarClock, Check, RefreshCw } from 'lucide-react';
import { apiFetch } from '../api/http';

type CurrentLoan = { id: string; title: string; memberName: string; dueAt: string };
type ReadyHold = { id: string; title: string; memberName: string; status: string };
type NotificationItem = {
  id: string;
  title: string;
  description: string;
  count: number;
  destination: 'loans' | 'holds';
  kind: 'overdue' | 'due-today' | 'hold-ready';
};

function accraDay(value: string | Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Accra', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function sample(records: { memberName: string; title: string }[], total: number) {
  const first = records.slice(0, 2).map(record => `${record.memberName}: ${record.title}`).join(' · ');
  return total > 2 ? `${first} · and ${total - 2} more` : first;
}

export function WorkspaceNotifications({ token, onNavigate }: { token?: string; onNavigate: (view: 'loans' | 'holds') => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const count = items.reduce((total, item) => total + item.count, 0);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [loans, holds] = await Promise.all([
        apiFetch<CurrentLoan[]>('/api/v1/loans?current=true', {}, token),
        apiFetch<ReadyHold[]>('/api/v1/holds?status=READY', {}, token),
      ]);
      const now = new Date();
      const today = accraDay(now);
      const overdue = loans.filter(loan => new Date(loan.dueAt).getTime() < now.getTime());
      const dueToday = loans.filter(loan => new Date(loan.dueAt).getTime() >= now.getTime() && accraDay(loan.dueAt) === today);
      const next: NotificationItem[] = [];
      if (overdue.length) next.push({
        id: 'overdue', title: `${overdue.length} overdue ${overdue.length === 1 ? 'loan' : 'loans'}`,
        description: sample(overdue, overdue.length), count: overdue.length, destination: 'loans', kind: 'overdue',
      });
      if (dueToday.length) next.push({
        id: 'due-today', title: `${dueToday.length} ${dueToday.length === 1 ? 'book is' : 'books are'} due today`,
        description: sample(dueToday, dueToday.length), count: dueToday.length, destination: 'loans', kind: 'due-today',
      });
      if (holds.length) next.push({
        id: 'hold-ready', title: `${holds.length} ${holds.length === 1 ? 'hold is' : 'holds are'} ready for pickup`,
        description: sample(holds, holds.length), count: holds.length, destination: 'holds', kind: 'hold-ready',
      });
      setItems(next);
      setUpdatedAt(new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load library notifications.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void refresh(); }, [refresh]);

  function toggle() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    void refresh();
  }

  return <div className="notification-placeholder">
    <button className="notification-trigger" type="button" aria-label={count ? `Notifications, ${count} alerts` : 'Notifications'} aria-expanded={open} aria-controls="notification-panel" onClick={toggle}>
      <span className="notification-bell-wrap"><Bell size={16} aria-hidden="true"/>{count > 0 && <i className="notification-count" aria-label={`${count} alerts`}>{count > 99 ? '99+' : count}</i>}</span>
      <span>Notifications</span>
    </button>
    {open && <section className="notification-panel" id="notification-panel" role="region" aria-label="Notifications" aria-busy={loading}>
      <header className="notification-panel-heading"><div><strong>Library alerts</strong><small>{updatedAt ? `Updated ${updatedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Live from loans and holds'}</small></div><button type="button" className="notification-refresh" aria-label="Refresh notifications" disabled={loading} onClick={() => void refresh()}><RefreshCw size={15} className={loading ? 'is-loading' : ''}/></button></header>
      {loading && !updatedAt ? <p className="notification-state">Checking loans and holds…</p> : error ? <div className="notification-error" role="alert"><p>{error}</p><button type="button" onClick={() => void refresh()}>Try again</button></div> : items.length ? <div className="notification-list">{items.map(item=><button type="button" className={`notification-item is-${item.kind}`} key={item.id} onClick={()=>{onNavigate(item.destination);setOpen(false);}}><span className="notification-item-icon">{item.kind==='hold-ready'?<Check size={16}/>:item.kind==='due-today'?<CalendarClock size={16}/>:<AlertTriangle size={16}/>}</span><span className="notification-item-copy"><strong>{item.title}</strong><small>{item.description}</small><em>Open {item.destination === 'loans' ? 'loans' : 'hold queue'}</em></span></button>)}</div> : <p className="notification-state">No overdue loans, books due today, or holds ready for pickup.</p>}
    </section>}
  </div>;
}
