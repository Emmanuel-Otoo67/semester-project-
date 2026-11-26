import { useEffect, useMemo, useState } from 'react';
import { BookMarked, BookOpen, CalendarClock, CircleAlert, Clock3, GraduationCap, History, LayoutDashboard, LogOut, MapPin, Search, UserRound, type LucideIcon } from 'lucide-react';
import { apiFetch } from '../api/http';
import type { StudentSession } from '../auth/AuthProvider';
import { QRCodeSVG } from 'qrcode.react';
import { BrandLogo } from '../components/BrandLogo';

type Page<T> = { items: T[]; total: number };
type Book = { id: string; title: string; isbn: string | null; authors: string; categories: string; copies: number; availableCopies: number; description: string | null };
type Loan = { id: string; title: string; barcode: string; checkedOutAt: string; dueAt: string; returnedAt: string | null; renewalCount: number };
type Visit = { id: string; checkedInAt: string; checkedOutAt: string | null };
type View = 'overview' | 'catalog' | 'books' | 'visits' | 'profile';
const viewIcons: Record<View, LucideIcon> = {
  overview: LayoutDashboard,
  catalog: Search,
  books: BookMarked,
  visits: Clock3,
  profile: UserRound,
};

export function StudentPortal({ student, token, signOut }: { student: StudentSession; token: string; signOut: () => Promise<void> }) {
  const [view, setView] = useState<View>('overview');
  const [books, setBooks] = useState<Page<Book> | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firstName] = useState(student.displayName.trim().split(/\s+/)[0] || 'Student');

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    const encoded = encodeURIComponent(query.trim());
    Promise.all([
      apiFetch<Page<Book>>(`/api/v1/student/catalog?query=${encoded}&page=0&size=100`, {}, token),
      apiFetch<Loan[]>('/api/v1/student/loans?current=false', {}, token),
      apiFetch<Visit[]>('/api/v1/student/attendance', {}, token),
    ]).then(([catalog, memberLoans, attendance]) => {
      if (!active) return;
      setBooks(catalog); setLoans(memberLoans); setVisits(attendance);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Could not load your library account.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, query]);

  const activeLoans = useMemo(() => loans.filter(loan => !loan.returnedAt), [loans]);
  const overdueCount = activeLoans.filter(loan => new Date(loan.dueAt).getTime() < Date.now()).length;
  const dueSoonCount = activeLoans.filter(loan => {
    const remaining = new Date(loan.dueAt).getTime() - Date.now();
    return remaining >= 0 && remaining <= 7 * 24 * 60 * 60 * 1000;
  }).length;
  const titles: Record<View, string> = { overview: 'My library', catalog: 'Book catalogue', books: 'My books', visits: 'My library visits', profile: 'My profile' };
  const descriptions: Record<View, string> = {
    overview: 'Your current loans, upcoming due dates, and recorded library visits.',
    catalog: 'Search the collection and check how many copies are available.',
    books: 'Review checkout dates, due dates, renewals, and returned books.',
    visits: 'See the recorded arrival and departure times for your library visits.',
    profile: 'Your student details and the QR code used at the library entrance.',
  };
  const dateTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Accra' }).format(new Date(value));

  return <div className="student-shell">
    <aside className="student-sidebar">
      <div className="student-brand"><span className="student-brand-mark" aria-hidden="true"><BookOpen size={21}/></span><BrandLogo className="brand-logo-sidebar" /></div>
      <p className="student-nav-label">STUDENT PORTAL</p>
      {(Object.keys(titles) as View[]).map(item => { const Icon = viewIcons[item]; return <button key={item} aria-label={titles[item]} title={titles[item]} className={`student-nav-item ${view === item ? 'selected' : ''}`} onClick={() => setView(item)}><Icon size={19} strokeWidth={1.8} aria-hidden="true"/><span className="student-nav-text">{titles[item]}</span></button>; })}
      <div className="student-account"><div className="student-avatar"><UserRound size={18}/></div><div><strong>{student.displayName}</strong><small>{student.libraryNumber}</small></div><button aria-label="Sign out" title="Sign out" onClick={() => void signOut()}><LogOut size={16}/></button></div>
    </aside>
    <main className="student-main" data-view={view}>
      <header className="student-header"><div><span>STUDENT PORTAL</span><h1>{titles[view]}</h1><p className="student-header-description">{descriptions[view]}</p></div><div className="student-header-id"><small>STUDENT INDEX</small><strong>{student.libraryNumber}</strong></div></header>
      {error && <div className="student-error" role="alert">{error}</div>}
      {loading ? <section className="student-skeleton" aria-label="Loading library account"><i/><i/><i/><div/></section> : view === 'overview' ? <>
        <section className="student-welcome"><div><span>YOUR LIBRARY, IN ONE PLACE</span><h2>Welcome, {firstName}</h2><p>{student.programme && student.level ? `${student.programme} · ${student.level}` : 'Keep up with your books and library visits.'}</p></div><div className="student-welcome-icon"><GraduationCap size={42}/></div></section>
        <section className="student-metrics"><article className="metric-borrowed"><div className="student-metric-top"><span className="student-metric-icon"><BookOpen size={17}/></span><small>LOAN DESK</small></div><strong>{activeLoans.length}</strong><span className="student-metric-label">Currently borrowed</span><small>books to return</small></article><article className="metric-due"><div className="student-metric-top"><span className="student-metric-icon"><CalendarClock size={17}/></span><small>COMING UP</small></div><strong>{dueSoonCount}</strong><span className="student-metric-label">Due in 7 days</span><small>based on active loans</small></article><article className={`metric-overdue${overdueCount ? ' attention' : ''}`}><div className="student-metric-top"><span className="student-metric-icon"><CircleAlert size={17}/></span><small>RETURN STATUS</small></div><strong>{overdueCount}</strong><span className="student-metric-label">Overdue books</span><small>{overdueCount ? 'Please return or contact the library' : 'You are up to date'}</small></article><article className="metric-visits"><div className="student-metric-top"><span className="student-metric-icon"><MapPin size={17}/></span><small>ENTRANCE KIOSK</small></div><strong>{visits.length}</strong><span className="student-metric-label">Library visits</span><small>recorded visits</small></article></section>
        <section className="student-card"><div className="student-card-heading"><div><span>LOAN ACTIVITY</span><h2>Books to keep track of</h2></div><button onClick={() => setView('books')}>View all</button></div>
          {!activeLoans.length ? <p className="student-empty">You have no books checked out right now.</p> : <div className="student-table-scroll"><table className="student-table"><thead><tr><th>BOOK</th><th>BARCODE</th><th>CHECKED OUT</th><th>DUE DATE</th><th>STATUS</th></tr></thead><tbody>{activeLoans.slice(0, 5).map(loan => <tr key={loan.id}><td>{loan.title}</td><td>{loan.barcode}</td><td>{dateTime(loan.checkedOutAt)}</td><td>{dateTime(loan.dueAt)}</td><td><span className={`student-status ${new Date(loan.dueAt).getTime() < Date.now() ? 'late' : ''}`}>{new Date(loan.dueAt).getTime() < Date.now() ? 'Overdue' : 'On loan'}</span></td></tr>)}</tbody></table></div>}
        </section>
        <section className="student-card"><div className="student-card-heading"><div><span>ATTENDANCE ACTIVITY</span><h2>Recent library visits</h2></div><button onClick={() => setView('visits')}>View history</button></div>{!visits.length?<p className="student-empty">No visits have been recorded yet.</p>:<div className="student-table-scroll"><table className="student-table"><thead><tr><th>DATE</th><th>CHECKED IN</th><th>CHECKED OUT</th><th>VISIT</th></tr></thead><tbody>{visits.slice(0,4).map(visit=><tr key={visit.id}><td>{new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeZone:'Africa/Accra'}).format(new Date(visit.checkedInAt))}</td><td>{dateTime(visit.checkedInAt)}</td><td>{visit.checkedOutAt?dateTime(visit.checkedOutAt):'Still inside'}</td><td>{visit.checkedOutAt?'Complete':'Open'}</td></tr>)}</tbody></table></div>}</section>
      </> : view === 'catalog' ? <section className="student-card">
        <div className="student-card-heading"><div><span>CATALOGUE</span><h2>Find a book</h2><p>Search by title, author, ISBN, or category and check copy availability.</p></div><span className="student-card-count">{books?.total ?? 0} titles</span></div>
        <label className="student-search"><Search size={18}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search titles, authors, ISBN, or category"/></label>
        {!books?.items.length ? <div className="student-empty-state"><span><BookOpen size={22}/></span><strong>No matching titles</strong><p>Try another title, author, ISBN, or category.</p></div> : <div className="student-book-grid">{books.items.map(book => <article key={book.id}><span className="student-book-icon"><BookOpen size={20}/></span><small>{book.categories || 'Library collection'}</small><h3>{book.title}</h3><p className="student-book-authors">{book.authors || 'Author not listed'}</p>{book.description && <p className="student-description">{book.description}</p>}<strong className={`student-availability ${book.availableCopies ? 'available' : 'unavailable'}`}>{book.availableCopies} of {book.copies} copies available</strong>{book.isbn && <small className="student-book-isbn">ISBN {book.isbn}</small>}</article>)}</div>}
      </section> : view === 'books' ? <section className="student-card">
        <div className="student-card-heading"><div><span>BORROWING HISTORY</span><h2>Books issued to you</h2><p>Check due dates, renewals, and which books have been returned.</p></div><span className="student-card-count">{loans.length} records</span></div>
        {!loans.length ? <div className="student-empty-state"><span><BookMarked size={22}/></span><strong>No borrowing history yet</strong><p>Books checked out to you will appear here with their due dates.</p></div> : <div className="student-table-scroll"><table className="student-table"><thead><tr><th>BOOK</th><th>COPY BARCODE</th><th>CHECKED OUT</th><th>DUE DATE</th><th>RENEWALS</th><th>STATUS</th><th>RETURNED</th></tr></thead><tbody>{loans.map(loan => { const overdue = !loan.returnedAt && new Date(loan.dueAt).getTime() < Date.now(); const status = loan.returnedAt ? 'Returned' : overdue ? 'Overdue' : 'On loan'; return <tr key={loan.id}><td><strong className="student-cell-title">{loan.title}</strong></td><td><span className="student-barcode">{loan.barcode}</span></td><td>{dateTime(loan.checkedOutAt)}</td><td>{dateTime(loan.dueAt)}</td><td>{loan.renewalCount}</td><td><span className={`student-status ${overdue ? 'late' : loan.returnedAt ? 'returned' : ''}`}>{status}</span></td><td>{loan.returnedAt ? dateTime(loan.returnedAt) : '—'}</td></tr>; })}</tbody></table></div>}
      </section> : view === 'visits' ? <section className="student-card">
        <div className="student-card-heading"><div><span>ATTENDANCE HISTORY</span><h2>Your library visits</h2><p>Each visit records when you entered and when you left the library.</p></div><span className="student-card-count"><History size={15}/>{visits.length} visits</span></div>
        {!visits.length ? <div className="student-empty-state"><span><MapPin size={22}/></span><strong>No visits recorded yet</strong><p>Your entrance kiosk check-ins and check-outs will appear here.</p></div> : <div className="student-table-scroll"><table className="student-table"><thead><tr><th>DATE</th><th>CHECKED IN</th><th>CHECKED OUT</th><th>VISIT STATUS</th></tr></thead><tbody>{visits.map(visit => <tr key={visit.id}><td><strong className="student-cell-title">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'Africa/Accra' }).format(new Date(visit.checkedInAt))}</strong></td><td>{dateTime(visit.checkedInAt)}</td><td>{visit.checkedOutAt ? dateTime(visit.checkedOutAt) : 'Still inside'}</td><td><span className={`student-status ${visit.checkedOutAt ? 'returned' : 'visit-open'}`}>{visit.checkedOutAt ? 'Complete' : 'Currently inside'}</span></td></tr>)}</tbody></table></div>}
      </section> : <section className="student-card student-profile-card">
        <div className="student-card-heading"><div><span>STUDENT PROFILE</span><h2>Your details and entrance pass</h2><p>Use your student QR code at the library entrance kiosk.</p></div></div>
        <div className="student-profile-layout"><dl className="student-profile"><div><dt>Full name</dt><dd>{student.displayName}</dd></div><div><dt>Student index number</dt><dd>{student.libraryNumber}</dd></div><div><dt>Programme / department</dt><dd>{student.programme || 'Not provided'}</dd></div><div><dt>Level / year</dt><dd>{student.level || 'Not provided'}</dd></div><div><dt>Email address</dt><dd>{student.email || 'Not provided'}</dd></div><div><dt>Phone</dt><dd>{student.phone || 'Not provided'}</dd></div></dl><aside className="student-qr"><span className="student-qr-heading"><MapPin size={15}/> ENTRANCE QR</span><QRCodeSVG value={student.studentId} size={145} level="Q" includeMargin/><strong>{student.displayName}</strong><small>Scan this code to record your library visit.</small></aside></div><p className="student-note">For changes to your official student details, contact a librarian.</p>
      </section>}
    </main>
  </div>;
}
