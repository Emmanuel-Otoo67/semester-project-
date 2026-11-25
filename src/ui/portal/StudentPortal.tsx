import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Clock3, GraduationCap, LibraryBig, LogOut, Search, UserRound } from 'lucide-react';
import { apiFetch } from '../api/http';
import type { StudentSession } from '../auth/AuthProvider';
import { QRCodeSVG } from 'qrcode.react';

type Page<T> = { items: T[]; total: number };
type Book = { id: string; title: string; isbn: string | null; authors: string; categories: string; copies: number; availableCopies: number; description: string | null };
type Loan = { id: string; title: string; barcode: string; checkedOutAt: string; dueAt: string; returnedAt: string | null; renewalCount: number };
type Visit = { id: string; checkedInAt: string; checkedOutAt: string | null };
type View = 'overview' | 'catalog' | 'books' | 'visits' | 'profile';

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
  const dateTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Accra' }).format(new Date(value));

  return <div className="student-shell">
    <aside className="student-sidebar">
      <div className="student-brand"><span><LibraryBig size={22}/></span><strong>libtrack<span>.</span></strong></div>
      <p className="student-nav-label">STUDENT PORTAL</p>
      {(Object.keys(titles) as View[]).map(item => <button key={item} className={`student-nav-item ${view === item ? 'selected' : ''}`} onClick={() => setView(item)}>{titles[item]}</button>)}
      <div className="student-account"><div className="student-avatar"><UserRound size={18}/></div><div><strong>{student.displayName}</strong><small>{student.libraryNumber}</small></div><button aria-label="Sign out" title="Sign out" onClick={() => void signOut()}><LogOut size={16}/></button></div>
    </aside>
    <main className="student-main">
      <header className="student-header"><div><span>STUDENT PORTAL</span><h1>{titles[view]}</h1></div><div className="student-header-id"><small>LIBRARY ID</small><strong>{student.libraryNumber}</strong></div></header>
      {error && <div className="student-error" role="alert">{error}</div>}
      {loading ? <section className="student-skeleton" aria-label="Loading library account"><i/><i/><i/><div/></section> : view === 'overview' ? <>
        <section className="student-welcome"><div><span>YOUR LIBRARY, IN ONE PLACE</span><h2>Welcome, {firstName}</h2><p>{student.programme && student.level ? `${student.programme} · ${student.level}` : 'Keep up with your books and library visits.'}</p></div><div className="student-welcome-icon"><GraduationCap size={42}/></div></section>
        <section className="student-metrics"><article><span>Currently borrowed</span><strong>{activeLoans.length}</strong><small>books to return</small></article><article><span>Due in the next 7 days</span><strong>{dueSoonCount}</strong><small>based on your active loans</small></article><article className={overdueCount ? 'attention' : ''}><span>Overdue books</span><strong>{overdueCount}</strong><small>{overdueCount ? 'Please return or contact the library' : 'You are up to date'}</small></article><article><span>Library visits</span><strong>{visits.length}</strong><small>recorded visits</small></article></section>
        <section className="student-card"><div className="student-card-heading"><div><span>LOAN ACTIVITY</span><h2>Books to keep track of</h2></div><button onClick={() => setView('books')}>View all</button></div>
          {!activeLoans.length ? <p className="student-empty">You have no books checked out right now.</p> : <div className="student-table-scroll"><table className="student-table"><thead><tr><th>BOOK</th><th>BARCODE</th><th>CHECKED OUT</th><th>DUE DATE</th><th>STATUS</th></tr></thead><tbody>{activeLoans.slice(0, 5).map(loan => <tr key={loan.id}><td>{loan.title}</td><td>{loan.barcode}</td><td>{dateTime(loan.checkedOutAt)}</td><td>{dateTime(loan.dueAt)}</td><td><span className={`student-status ${new Date(loan.dueAt).getTime() < Date.now() ? 'late' : ''}`}>{new Date(loan.dueAt).getTime() < Date.now() ? 'Overdue' : 'On loan'}</span></td></tr>)}</tbody></table></div>}
        </section>
        <section className="student-card"><div className="student-card-heading"><div><span>ATTENDANCE ACTIVITY</span><h2>Recent library visits</h2></div><button onClick={() => setView('visits')}>View history</button></div>{!visits.length?<p className="student-empty">No visits have been recorded yet.</p>:<div className="student-table-scroll"><table className="student-table"><thead><tr><th>DATE</th><th>CHECKED IN</th><th>CHECKED OUT</th><th>VISIT</th></tr></thead><tbody>{visits.slice(0,4).map(visit=><tr key={visit.id}><td>{new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeZone:'Africa/Accra'}).format(new Date(visit.checkedInAt))}</td><td>{dateTime(visit.checkedInAt)}</td><td>{visit.checkedOutAt?dateTime(visit.checkedOutAt):'Still inside'}</td><td>{visit.checkedOutAt?'Complete':'Open'}</td></tr>)}</tbody></table></div>}</section>
      </> : view === 'catalog' ? <section className="student-card"><div className="student-card-heading"><div><span>LIBRARY COLLECTION</span><h2>Find a book</h2></div></div><label className="student-search"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search titles, authors, ISBN, or category"/></label>{!books?.items.length ? <p className="student-empty">No books match your search.</p> : <div className="student-book-grid">{books.items.map(book => <article key={book.id}><span className="student-book-icon"><BookOpen size={20}/></span><small>{book.categories || 'LIBRARY COLLECTION'}</small><h3>{book.title}</h3><p>{book.authors || 'Author not listed'}</p>{book.description && <p className="student-description">{book.description}</p>}<strong className={book.availableCopies ? 'available' : 'unavailable'}>{book.availableCopies} of {book.copies} available</strong>{book.isbn && <small>ISBN {book.isbn}</small>}</article>)}</div>}</section> : view === 'books' ? <section className="student-card"><div className="student-card-heading"><div><span>YOUR CIRCULATION RECORD</span><h2>Borrowing history</h2></div></div>{!loans.length ? <p className="student-empty">You have no borrowing records yet.</p> : <div className="student-table-scroll"><table className="student-table"><thead><tr><th>BOOK</th><th>BARCODE</th><th>CHECKED OUT</th><th>DUE DATE</th><th>RETURNED</th></tr></thead><tbody>{loans.map(loan => <tr key={loan.id}><td>{loan.title}</td><td>{loan.barcode}</td><td>{dateTime(loan.checkedOutAt)}</td><td>{dateTime(loan.dueAt)}</td><td>{loan.returnedAt ? dateTime(loan.returnedAt) : 'Not returned'}</td></tr>)}</tbody></table></div>}</section> : view === 'visits' ? <section className="student-card"><div className="student-card-heading"><div><span>ATTENDANCE</span><h2>Your library visits</h2></div><Clock3 size={20}/></div>{!visits.length ? <p className="student-empty">No library visits have been recorded yet.</p> : <div className="student-table-scroll"><table className="student-table"><thead><tr><th>DATE</th><th>CHECKED IN</th><th>CHECKED OUT</th><th>VISIT</th></tr></thead><tbody>{visits.map(visit => <tr key={visit.id}><td>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'Africa/Accra' }).format(new Date(visit.checkedInAt))}</td><td>{dateTime(visit.checkedInAt)}</td><td>{visit.checkedOutAt ? dateTime(visit.checkedOutAt) : 'Still inside'}</td><td>{visit.checkedOutAt ? 'Complete' : 'Open'}</td></tr>)}</tbody></table></div>}</section> : <section className="student-card"><div className="student-card-heading"><div><span>STUDENT RECORD</span><h2>My profile</h2></div></div><div className="student-profile-layout"><dl className="student-profile"><div><dt>Full name</dt><dd>{student.displayName}</dd></div><div><dt>Library number</dt><dd>{student.libraryNumber}</dd></div><div><dt>Programme / department</dt><dd>{student.programme || 'Not provided'}</dd></div><div><dt>Level / year</dt><dd>{student.level || 'Not provided'}</dd></div><div><dt>Email</dt><dd>{student.email || 'Not provided'}</dd></div><div><dt>Phone</dt><dd>{student.phone || 'Not provided'}</dd></div></dl><aside className="student-qr"><QRCodeSVG value={student.studentId} size={145} level="Q" includeMargin/><strong>My library QR code</strong><small>Show this code at the entrance kiosk.</small></aside></div><p className="student-note">For changes to your official student details, contact a librarian.</p></section>}
    </main>
  </div>;
}
