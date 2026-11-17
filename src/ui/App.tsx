import { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookCopy,
  BookOpen,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Clock3,
  LayoutDashboard,
  LibraryBig,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react';

type ApiHealth = { status: string; service: string; timestamp: string };

const navGroups = [
  {
    label: 'WORKSPACE',
    items: [
      { label: 'Overview', icon: LayoutDashboard, active: true },
      { label: 'Catalog', icon: BookOpen },
      { label: 'Members', icon: UsersRound },
    ],
  },
  {
    label: 'CIRCULATION',
    items: [
      { label: 'Loans', icon: BookCopy, count: '18' },
      { label: 'Reservations', icon: CalendarDays, count: '6' },
    ],
  },
];

const activity = [
  { initials: 'AM', name: 'Ama Mensah', action: 'checked out', title: 'Things Fall Apart', time: '09:42 AM', color: 'sage' },
  { initials: 'KO', name: 'Kofi Owusu', action: 'returned', title: 'The River Between', time: '09:18 AM', color: 'peach' },
  { initials: 'EA', name: 'Esi Agyeman', action: 'placed a hold on', title: 'Half of a Yellow Sun', time: '08:56 AM', color: 'blue' },
  { initials: 'NA', name: 'Nana Asante', action: 'checked out', title: 'The Beautyful Ones Are Not Yet Born', time: '08:31 AM', color: 'lavender' },
];

function App() {
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [mobileNav, setMobileNav] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/health', { signal: controller.signal, headers: authHeader ? { Authorization: authHeader } : undefined })
      .then((response) => {
        if (response.ok) return response.json() as Promise<ApiHealth>;
        if (response.status === 401) setShowLogin(true);
        throw new Error('API unavailable');
      })
      .then(() => setHealth('online'))
      .catch(() => setHealth('offline'));
    return () => controller.abort();
  }, [authHeader]);

  function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = btoa(`${username}:${password}`);
    const header = `Basic ${token}`;
    setLoginError('');
    fetch('/api/v1/session', { headers: { Authorization: header } })
      .then((response) => {
        if (!response.ok) throw new Error('Credentials were not accepted.');
        setAuthHeader(header);
        setShowLogin(false);
        setPassword('');
      })
      .catch(() => setLoginError('Could not sign in. Check that the API is running and the credentials match your environment.'));
  }

  const statusLabel = health === 'online' ? 'All systems operational' : health === 'checking' ? 'Connecting to LibTrack' : 'API connection needed';

  return (
    <div className="app-shell">
      {mobileNav && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><LibraryBig size={21} strokeWidth={2.1} /></div>
          <div className="brand-name">libtrack<span>.</span></div>
          <button className="icon-button sidebar-close" aria-label="Close menu" onClick={() => setMobileNav(false)}><X size={18} /></button>
        </div>

        <button className="library-switcher">
          <span className="school-monogram">A</span>
          <span className="switcher-copy"><strong>Akora College</strong><small>Library workspace</small></span>
          <ChevronDown size={15} className="switcher-chevron" />
        </button>

        <nav className="primary-nav" aria-label="Main navigation">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <p className="nav-label">{group.label}</p>
              {group.items.map(({ label, icon: Icon, active, count }) => (
                <a className={`nav-item ${active ? 'active' : ''}`} href={`#${label.toLowerCase()}`} key={label} onClick={(event) => event.preventDefault()}>
                  <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{count && <span className="nav-count">{count}</span>}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help"><div className="help-icon"><CircleHelp size={17} /></div><div><strong>Need a hand?</strong><small>Visit the help centre</small></div><ArrowUpRight size={14} /></div>
          <div className="staff-card">
            <div className="staff-avatar">EA</div>
            <div className="staff-copy"><strong>Efua Asare</strong><small>Head librarian</small></div>
            <button className="icon-button staff-menu" aria-label="Staff menu"><MoreHorizontal size={18} /></button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-actions">
            <div className={`system-status ${health}`}><span className="status-dot" />{statusLabel}</div>
            <div className="topbar-divider" />
            <button className="top-avatar" aria-label="Account menu">EA</button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> SUNDAY, 15 NOVEMBER 2026</div>
              <h1>Good afternoon, Efua <span className="wave">✳</span></h1>
              <p className="page-subtitle">Here’s what’s happening at your library today.</p>
            </div>
            <div className="welcome-actions"><button className="button button-quiet"><CalendarDays size={16} />This week<ChevronDown size={14} /></button><button className="button button-primary" onClick={() => setShowLogin(true)}><Plus size={17} />New checkout</button></div>
          </section>

          {health !== 'online' && <div className="connection-banner"><div className="connection-symbol"><ShieldCheck size={17} /></div><div><strong>{health === 'checking' ? 'Connecting your workspace' : 'Your API is not connected yet'}</strong><p>{health === 'checking' ? 'Waiting for the LibTrack service to respond.' : 'Start the Spring Boot API to enable live library operations. Dashboard figures below are sample data.'}</p></div><button onClick={() => setShowLogin(true)}>Connect <ArrowUpRight size={14} /></button></div>}

          <section className="metrics-grid" aria-label="Library overview">
            <MetricCard label="Titles in catalogue" value="2,486" change="4.8%" direction="up" note="vs. last month" icon={<BookOpen size={18} />} tone="green" />
            <MetricCard label="Active members" value="1,204" change="2.1%" direction="up" note="vs. last month" icon={<UsersRound size={18} />} tone="blue" />
            <MetricCard label="Currently on loan" value="318" change="12.4%" direction="up" note="vs. last month" icon={<BookCopy size={18} />} tone="peach" />
            <MetricCard label="Overdue items" value="12" change="3 fewer" direction="down" note="than last week" icon={<Clock3 size={18} />} tone="lavender" />
          </section>

          <section className="dashboard-grid">
            <article className="panel circulation-panel">
              <div className="panel-heading"><div><div className="section-kicker">CIRCULATION</div><h2>Checkout activity</h2></div><button className="button button-quiet button-small">Last 7 days<ChevronDown size={13} /></button></div>
              <div className="chart-summary"><strong>246</strong><span className="trend-chip"><ArrowUpRight size={13} /> 8.2%</span><span className="chart-summary-note">checkouts this week</span></div>
              <div className="chart-area" aria-label="Checkout activity chart">
                <div className="chart-y-labels"><span>60</span><span>40</span><span>20</span><span>0</span></div>
                <div className="chart-content"><div className="chart-guides"><i /><i /><i /><i /></div><div className="chart-bars">{[{d:'Mon',h:44},{d:'Tue',h:68},{d:'Wed',h:52},{d:'Thu',h:82},{d:'Fri',h:62},{d:'Sat',h:36},{d:'Sun',h:48}].map((item) => <div className="bar-column" key={item.d}><div className="bar-pair"><span className="bar bar-prev" style={{height:`${Math.max(item.h - 18, 12)}%`}} /><span className="bar bar-current" style={{height:`${item.h}%`}} /></div><span className="bar-day">{item.d}</span></div>)}</div><div className="chart-legend"><span><i className="legend-current" />This week</span><span><i className="legend-previous" />Last week</span></div></div>
              </div>
            </article>

            <article className="panel due-panel">
              <div className="panel-heading"><div><div className="section-kicker">NEEDS ATTENTION</div><h2>Due back today</h2></div><button className="icon-button more-button" aria-label="More options"><MoreHorizontal size={19} /></button></div>
              <div className="due-total"><strong>08</strong><span>items due today</span></div>
              <div className="due-list">
                <DueRow title="The River and the Source" author="Margaret Ogola" member="Nana A." color="peach" />
                <DueRow title="Purple Hibiscus" author="Chimamanda Adichie" member="Kojo B." color="blue" />
                <DueRow title="Anowa" author="Ama Ata Aidoo" member="Esi D." color="sage" />
              </div>
              <button className="text-link">View all due items <ArrowUpRight size={14} /></button>
            </article>
          </section>

          <section className="panel activity-panel">
            <div className="panel-heading activity-heading"><div><div className="section-kicker">LIVE UPDATES</div><h2>Recent activity</h2></div><div className="activity-controls"><label className="search-box"><Search size={15} /><input aria-label="Search activity" placeholder="Search activity" /></label><button className="button button-quiet button-small">All activity<ChevronDown size={13} /></button></div></div>
            <div className="activity-table-wrap"><table className="activity-table"><thead><tr><th>MEMBER</th><th>ACTIVITY</th><th>TIME</th><th aria-label="More" /></tr></thead><tbody>{activity.map((item) => <tr key={item.name}><td><div className="member-cell"><div className={`member-avatar ${item.color}`}>{item.initials}</div><span>{item.name}</span></div></td><td><span className="activity-action">{item.action} </span><strong className="activity-title">{item.title}</strong></td><td className="time-cell">{item.time}</td><td><button className="icon-button row-more" aria-label={`More about ${item.name}`}><MoreHorizontal size={18} /></button></td></tr>)}</tbody></table></div>
            <button className="table-footer">View all activity <ArrowUpRight size={14} /></button>
          </section>

          <footer className="page-footer"><span>© 2026 LibTrack</span><span><i />Your library, in good hands</span><a href="#settings" onClick={(event) => event.preventDefault()}><Settings2 size={14} />Workspace settings</a></footer>
        </div>
      </main>

      {showLogin && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowLogin(false); }}><form className="login-modal" onSubmit={signIn}><div className="modal-icon"><ShieldCheck size={20} /></div><button type="button" className="icon-button modal-close" aria-label="Close" onClick={() => setShowLogin(false)}><X size={18} /></button><div className="section-kicker">LIBTRACK API</div><h2>Connect your workspace</h2><p>Enter the starter administrator credentials from your local environment configuration.</p><label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required /></label><label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required /></label>{loginError && <p className="login-error" role="alert">{loginError}</p>}<button className="button button-primary modal-submit" type="submit">Sign in <ArrowUpRight size={15} /></button></form></div>}
    </div>
  );
}

function MetricCard({ label, value, change, direction, note, icon, tone }: { label: string; value: string; change: string; direction: 'up' | 'down'; note: string; icon: React.ReactNode; tone: string }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}>{icon}</span></div><div className="metric-value">{value}</div><div className="metric-foot"><span className={`metric-change ${direction}`}>{direction === 'up' ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{change}</span><span>{note}</span></div></article>;
}

function DueRow({ title, author, member, color }: { title: string; author: string; member: string; color: string }) {
  return <div className="due-row"><div className={`book-cover ${color}`}><BookOpen size={15} /></div><div className="due-book"><strong>{title}</strong><small>{author}</small></div><div className="due-member"><small>WITH</small><strong>{member}</strong></div></div>;
}

export default App;

