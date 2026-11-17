import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, LibraryBig, LoaderCircle, LogOut, ShieldCheck } from 'lucide-react';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { apiFetch } from './api/http';

export default function App() {
  return <AuthProvider><WorkspaceGate /></AuthProvider>;
}

function WorkspaceGate() {
  const { loading, session, staff, error, configurationError, signIn, signOut, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSubmitting(true); setFormError(null);
    try { await signIn(email, password); setPassword(''); }
    catch (cause) { setFormError(cause instanceof Error ? cause.message : 'Sign-in failed. Try again.'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <main className="auth-shell"><div className="auth-card auth-loading"><LoaderCircle className="spin" /><span>Checking your LibTrack session…</span></div></main>;

  if (session && staff) return <Workspace staff={staff} token={session.access_token} signOut={signOut} />;

  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><span className="auth-brand-mark"><LibraryBig size={22} /></span><span>libtrack<span className="brand-dot">.</span></span></div>
    <p className="auth-kicker">STAFF ACCESS</p><h1>Sign in to your library</h1>
    <p className="auth-copy">Use the Supabase Auth account linked to your LibTrack staff profile.</p>
    {configurationError && <div className="auth-alert" role="alert"><strong>Sign-in is not configured.</strong><span>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for this environment.</span></div>}
    {error && <div className="auth-alert" role="alert"><strong>Staff access needs attention.</strong><span>{error}</span>{session && <button type="button" onClick={() => void refresh()}>Check again</button>}</div>}
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="staff-email">Email address</label><input id="staff-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@school.edu" required />
      <label htmlFor="staff-password">Password</label><input id="staff-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      {formError && <p className="auth-form-error" role="alert">{formError}</p>}
      <button className="auth-primary" type="submit" disabled={submitting || configurationError}>{submitting ? <><LoaderCircle size={17} className="spin" /> Signing in…</> : <>Continue <ArrowRight size={17} /></>}</button>
    </form>
    <p className="auth-footnote">Access is managed by your library administrator.</p>
  </section></main>;
}

type Page<T> = { items: T[]; page: number; size: number; total: number };
type Book = { id: string; title: string; isbn: string | null; publisher: string | null; publicationYear: number | null; authors: string; categories: string; copies: number; availableCopies: number };
type Member = { id: string; libraryNumber: string; firstName: string; lastName: string; memberType: string; email: string | null; phone: string | null; status: string };
type Dashboard = { titles: number; activeMembers: number; availableCopies: number; onLoanCopies: number; overdueLoans: number; dueToday: number; actionableHolds: number; recentActivity: { action: string; entityType: string; occurredAt: string; actorName: string | null }[] };
type View = 'overview' | 'catalog' | 'members';

function Workspace({ staff, token, signOut }: { staff: { displayName: string; role: string }; token: string; signOut: () => Promise<void> }) {
  const [view, setView] = useState<View>('overview');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [books, setBooks] = useState<Page<Book> | null>(null);
  const [members, setMembers] = useState<Page<Member> | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookForm, setShowBookForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      if (view === 'overview') setDashboard(await apiFetch<Dashboard>('/api/v1/dashboard/summary', {}, token));
      if (view === 'catalog') setBooks(await apiFetch<Page<Book>>(`/api/v1/catalog/books?query=${encodeURIComponent(query)}&page=0&size=50`, {}, token));
      if (view === 'members') setMembers(await apiFetch<Page<Member>>(`/api/v1/members?query=${encodeURIComponent(query)}&page=0&size=50`, {}, token));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load library records.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [view, query, token]);

  async function save(path: string, body: unknown) {
    setSaving(true); setError(null);
    try { await apiFetch(path, { method: 'POST', body: JSON.stringify(body) }, token); setShowBookForm(false); setShowMemberForm(false); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this record.'); }
    finally { setSaving(false); }
  }

  async function saveBook(body: { firstCopyBarcode?: string; [key: string]: unknown }) {
    const { firstCopyBarcode, ...book } = body;
    setSaving(true); setError(null);
    try {
      const created = await apiFetch<Book>('/api/v1/catalog/books', { method: 'POST', body: JSON.stringify(book) }, token);
      if (firstCopyBarcode?.trim()) await apiFetch(`/api/v1/catalog/books/${created.id}/copies`,
        { method: 'POST', body: JSON.stringify({ barcode: firstCopyBarcode.trim() }) }, token);
      setShowBookForm(false); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this book title and first copy.'); }
    finally { setSaving(false); }
  }

  const title = view === 'overview' ? 'Library overview' : view === 'catalog' ? 'Book catalogue' : 'Library members';
  return <div className="workspace-shell">
    <aside className="workspace-nav"><div className="auth-brand"><span className="auth-brand-mark"><LibraryBig size={21} /></span><span>libtrack<span className="brand-dot">.</span></span></div>
      <p className="workspace-nav-label">LIBRARY</p>
      {(['overview','catalog','members'] as View[]).map((item) => <button key={item} className={`workspace-nav-item ${view===item?'selected':''}`} onClick={() => {setView(item);setQuery('');}}>{item==='overview'?'Overview':item==='catalog'?'Catalog':'Members'}</button>)}
      <div className="workspace-account"><div><strong>{staff.displayName}</strong><small>{staff.role}</small></div><button title="Sign out" aria-label="Sign out" onClick={() => void signOut()}><LogOut size={16}/></button></div>
    </aside>
    <main className="workspace-main"><header className="workspace-header"><div><span>LIBRARY WORKSPACE</span><h1>{title}</h1></div><div className="workspace-header-actions"><button className="workspace-refresh" onClick={() => void load()} disabled={loading}>Refresh</button>{view==='catalog'&&<button className="workspace-action" onClick={() => setShowBookForm(true)}>Add book</button>}{view==='members'&&<button className="workspace-action" onClick={() => setShowMemberForm(true)}>Add member</button>}</div></header>
      {error&&<div className="workspace-error" role="alert">{error}</div>}
      {loading?<div className="workspace-empty"><LoaderCircle className="spin"/> Loading library records…</div>:view==='overview'?<>
        {!dashboard?<div className="workspace-empty">No dashboard data is available yet.</div>:<><section className="workspace-metrics">
          <Stat label="Catalogue titles" value={dashboard.titles}/><Stat label="Active members" value={dashboard.activeMembers}/><Stat label="Available copies" value={dashboard.availableCopies}/><Stat label="On loan" value={dashboard.onLoanCopies}/><Stat label="Overdue" value={dashboard.overdueLoans}/><Stat label="Due today" value={dashboard.dueToday}/><Stat label="Open holds" value={dashboard.actionableHolds}/>
        </section><section className="workspace-panel"><div className="workspace-panel-heading"><div><span>RECENT</span><h2>Library activity</h2></div></div>{dashboard.recentActivity.length===0?<p className="workspace-muted">No activity has been recorded yet.</p>:<div className="workspace-activity">{dashboard.recentActivity.map((event,index)=><div key={`${event.action}-${index}`}><strong>{event.action.replaceAll('_',' ').toLowerCase()}</strong><span>{event.entityType.toLowerCase()} · {event.actorName??'Staff account'} · {new Date(event.occurredAt).toLocaleString()}</span></div>)}</div>}</section></>}
      </>:<section className="workspace-panel"><div className="workspace-list-toolbar"><label><span className="sr-only">Search</span><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={view==='catalog'?'Search title or ISBN':'Search name, number, or email'} /></label><span>{view==='catalog'?books?.total??0:members?.total??0} records</span></div>
        {view==='catalog'?(!books?.items.length?<p className="workspace-muted">No book titles yet. Add a book to start your catalogue.</p>:<div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>TITLE</th><th>AUTHORS</th><th>ISBN</th><th>COPIES</th><th>AVAILABLE</th></tr></thead><tbody>{books.items.map(book=><tr key={book.id}><td><strong>{book.title}</strong><small>{book.publisher??''}</small></td><td>{book.authors||'—'}</td><td>{book.isbn||'—'}</td><td>{book.copies}</td><td>{book.availableCopies}</td></tr>)}</tbody></table></div>):(!members?.items.length?<p className="workspace-muted">No members yet. Add the first library member.</p>:<div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>MEMBER</th><th>LIBRARY NO.</th><th>TYPE</th><th>EMAIL</th><th>STATUS</th></tr></thead><tbody>{members.items.map(member=><tr key={member.id}><td><strong>{member.firstName} {member.lastName}</strong><small>{member.phone??''}</small></td><td>{member.libraryNumber}</td><td>{member.memberType}</td><td>{member.email||'—'}</td><td>{member.status}</td></tr>)}</tbody></table></div>)}
      </section>}
    </main>
    {showBookForm&&<BookForm busy={saving} close={()=>setShowBookForm(false)} save={(body)=>void saveBook(body)}/>}
    {showMemberForm&&<MemberForm busy={saving} close={()=>setShowMemberForm(false)} save={(body)=>void save('/api/v1/members',body)}/>}
  </div>;
}

function Stat({label,value}:{label:string;value:number}){return <article className="workspace-stat"><span>{label}</span><strong>{value.toLocaleString()}</strong></article>}
function ModalFrame({title,children,close}:{title:string;children:React.ReactNode;close:()=>void}){return <div className="workspace-modal-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><section className="workspace-modal"><header><h2>{title}</h2><button onClick={close} aria-label="Close">×</button></header>{children}</section></div>}
function BookForm({busy,close,save}:{busy:boolean;close:()=>void;save:(body:{firstCopyBarcode:string;[key:string]:unknown})=>void}){const [form,setForm]=useState({title:'',isbn:'',publisher:'',publicationYear:'',description:'',authors:'',categories:'',barcode:''});return <ModalFrame title="Add a book title" close={close}><form className="workspace-form" onSubmit={e=>{e.preventDefault();save({firstCopyBarcode:form.barcode,...(({barcode,...book})=>book)(form),publicationYear:form.publicationYear?Number(form.publicationYear):null,authors:form.authors.split(',').map(s=>s.trim()).filter(Boolean),categories:form.categories.split(',').map(s=>s.trim()).filter(Boolean)});}}><label>Title<input required maxLength={500} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>ISBN<input maxLength={20} value={form.isbn} onChange={e=>setForm({...form,isbn:e.target.value})}/></label><label>Publisher<input value={form.publisher} onChange={e=>setForm({...form,publisher:e.target.value})}/></label><label>Publication year<input type="number" min="1400" max="2200" value={form.publicationYear} onChange={e=>setForm({...form,publicationYear:e.target.value})}/></label><label>Authors <small>Separate names with commas</small><input value={form.authors} onChange={e=>setForm({...form,authors:e.target.value})}/></label><label>Categories <small>Separate names with commas</small><input value={form.categories} onChange={e=>setForm({...form,categories:e.target.value})}/></label><label>First copy barcode<input value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})}/></label><label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><button className="workspace-action" disabled={busy}>{busy?'Saving…':'Save book'}</button></form></ModalFrame>}
function MemberForm({busy,close,save}:{busy:boolean;close:()=>void;save:(body:unknown)=>void}){const [form,setForm]=useState({libraryNumber:'',firstName:'',lastName:'',memberType:'STUDENT',email:'',phone:''});return <ModalFrame title="Add a library member" close={close}><form className="workspace-form" onSubmit={e=>{e.preventDefault();save(form);}}><label>Library number<input required maxLength={50} value={form.libraryNumber} onChange={e=>setForm({...form,libraryNumber:e.target.value})}/></label><label>First name<input required value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/></label><label>Last name<input required value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/></label><label>Member type<select value={form.memberType} onChange={e=>setForm({...form,memberType:e.target.value})}><option>STUDENT</option><option>STAFF</option><option>OTHER</option></select></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><button className="workspace-action" disabled={busy}>{busy?'Saving…':'Save member'}</button></form></ModalFrame>}
