import React, { useEffect, useRef, useState } from 'react';
import { LibraryBig, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { apiFetch } from '../api/http';
import { NotificationPlaceholder } from '../components/NotificationPlaceholder';

type Page<T> = { items: T[]; page: number; size: number; total: number };
type Book = { id: string; title: string; isbn: string | null; publisher: string | null; publicationYear: number | null; description: string | null; authors: string; categories: string; copies: number; availableCopies: number };
type BookCopyCode = { id: string; barcode: string; status: string };
type Member = { id: string; libraryNumber: string; firstName: string; lastName: string; memberType: string; email: string | null; phone: string | null; status: string; programme?: string | null; level?: string | null };
type AttendanceRecord = { id: string; memberId: string; libraryNumber: string; studentName: string; programme: string | null; level: string | null; checkedInAt: string; checkedOutAt: string | null };
type Dashboard = { titles: number; activeMembers: number; availableCopies: number; onLoanCopies: number; overdueLoans: number; dueToday: number; actionableHolds: number; registeredStudents: number; currentlyInside: number; todayAttendance: number; recentActivity: { action: string; entityType: string; occurredAt: string; actorName: string | null }[] };
type LibraryReports = { from:string;to:string;attendanceByDay:{date:string;visits:number;students:number}[];borrowingByTitle:{title:string;checkouts:number}[];returnsByDay:{date:string;returns:number}[];overdueBooks:{libraryNumber:string;studentName:string;title:string;barcode:string;dueAt:string;overdueDays:number}[];inventory:{total:number;available:number;borrowed:number;on_hold:number} };
type Loan = { id:string; memberId:string; libraryNumber:string; memberName:string; barcode:string; title:string; dueAt:string; returnedAt:string|null; renewalCount:number };
type Hold = { id:string; status:string; title:string; memberName:string; libraryNumber:string; requestedAt:string; readyUntil:string|null };
type StaffRow = { id:string; authUserId:string; email:string; displayName:string; role:string; active:boolean };
type View = 'overview' | 'catalog' | 'members' | 'attendance' | 'loans' | 'holds' | 'reports' | 'audit' | 'settings' | 'staff';

export function Workspace({ staff, token, localDevelopment, signOut }: { staff: { displayName: string; role: string }; token?: string; localDevelopment: boolean; signOut: () => Promise<void> }) {
  const [view, setView] = useState<View>('overview');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [reports, setReports] = useState<LibraryReports | null>(null);
  const [books, setBooks] = useState<Page<Book> | null>(null);
  const [members, setMembers] = useState<Page<Member> | null>(null);
  const [currentVisits, setCurrentVisits] = useState<AttendanceRecord[]>([]);
  const [visitHistory, setVisitHistory] = useState<Page<AttendanceRecord> | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);
  const [auditRows, setAuditRows] = useState<Page<Record<string, unknown>> | null>(null);
  const [settings, setSettings] = useState<Record<string, Record<string, unknown>> | null>(null);
  const [query, setQuery] = useState('');
  const [visitFrom, setVisitFrom] = useState('');
  const [visitTo, setVisitTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadedViews, setLoadedViews] = useState<Set<View>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const [showBookForm, setShowBookForm] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [copyBook, setCopyBook] = useState<Book | null>(null);
  const [codeBook, setCodeBook] = useState<Book | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError(null);
    try {
      if (view === 'overview') setDashboard(await apiFetch<Dashboard>('/api/v1/dashboard/summary', {}, token));
      if (view === 'catalog') setBooks(await apiFetch<Page<Book>>(`/api/v1/catalog/books?query=${encodeURIComponent(query)}&page=0&size=50`, {}, token));
      if (view === 'members') setMembers(await apiFetch<Page<Member>>(`/api/v1/members?query=${encodeURIComponent(query)}&page=0&size=50`, {}, token));
      if (view === 'attendance') {
        const filter = `query=${encodeURIComponent(query)}&from=${encodeURIComponent(visitFrom)}&to=${encodeURIComponent(visitTo)}&page=0&size=50`;
        const [current, history, studentPage] = await Promise.all([
          apiFetch<AttendanceRecord[]>('/api/v1/attendance/current', {}, token),
          apiFetch<Page<AttendanceRecord>>(`/api/v1/attendance/history?${filter}`, {}, token),
          apiFetch<Page<Member>>(`/api/v1/members?query=${encodeURIComponent(query)}&page=0&size=50`, {}, token),
        ]);
        setCurrentVisits(current); setVisitHistory(history); setMembers(studentPage);
    }
      if (view === 'loans') setLoans(await apiFetch<Loan[]>('/api/v1/loans?current=true', {}, token));
      if (view === 'loans' || view === 'holds') setMembers(await apiFetch<Page<Member>>('/api/v1/members?page=0&size=100', {}, token));
      if (view === 'holds') { setHolds(await apiFetch<Hold[]>('/api/v1/holds', {}, token)); setBooks(await apiFetch<Page<Book>>('/api/v1/catalog/books?page=0&size=100', {}, token)); }
      if (view === 'audit') setAuditRows(await apiFetch<Page<Record<string, unknown>>>('/api/v1/audit?page=0&size=50', {}, token));
      if (view === 'reports') setReports(await apiFetch<LibraryReports>(`/api/v1/reports/library?from=${encodeURIComponent(visitFrom)}&to=${encodeURIComponent(visitTo)}`, {}, token));
      if (view === 'settings') setSettings(await apiFetch<Record<string, Record<string, unknown>>>('/api/v1/settings', {}, token));
      if (view === 'staff' && staff.role === 'ADMIN') setStaffRows(await apiFetch<StaffRow[]>('/api/v1/staff', {}, token));
      setLoadedViews(previous => new Set(previous).add(view));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load library records.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [view, query, visitFrom, visitTo, token]);


  async function saveBook(body: { firstCopyBarcode?: string; [key: string]: unknown }) {
    const { firstCopyBarcode, bookId, ...book } = body;
    setSaving(true); setError(null);
    try {
      const created = await apiFetch<Book>(bookId ? `/api/v1/catalog/books/${bookId}` : '/api/v1/catalog/books', { method: bookId ? 'PUT' : 'POST', body: JSON.stringify(book) }, token);
      if (!bookId && firstCopyBarcode?.trim()) await apiFetch(`/api/v1/catalog/books/${created.id}/copies`,
        { method: 'POST', body: JSON.stringify({ barcode: firstCopyBarcode.trim() }) }, token);
      setShowBookForm(false); setEditingBook(null); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this book title and first copy.'); }
    finally { setSaving(false); }
  }

  async function saveMember(body: { memberId?: string; [key: string]: unknown }) {
    const { memberId, ...member } = body; if (!memberId) return; setSaving(true); setError(null);
    try { await apiFetch(`/api/v1/members/${memberId}`, { method: 'PUT', body: JSON.stringify(member) }, token); setShowMemberForm(false); setEditingMember(null); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this member.'); }
    finally { setSaving(false); }
  }
  async function addCopy(book: Book, barcode: string) {
    setSaving(true); setError(null);
    try { await apiFetch(`/api/v1/catalog/books/${book.id}/copies`, { method: 'POST', body: JSON.stringify({ barcode }) }, token); setCopyBook(null); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not add this copy.'); }
    finally { setSaving(false); }
  }
  async function mutate(path:string,method:string='POST',body?:unknown):Promise<boolean>{setSaving(true);setError(null);try{await apiFetch(path,{method,...(body===undefined?{}:{body:JSON.stringify(body)})},token);await load();return true;}catch(cause){setError(cause instanceof Error?cause.message:'The action could not be completed.');return false;}finally{setSaving(false);}}

  const title: Record<View,string> = {overview:'Library overview',catalog:'Book catalogue',members:'Library members',attendance:'Library attendance',loans:'Loan desk',holds:'Hold queue',reports:'Library reports',staff:'Staff access',settings:'Library policy',audit:'Audit log'};
  return <div className="workspace-shell">
    <aside className="workspace-nav"><div className="auth-brand"><span className="auth-brand-mark"><LibraryBig size={21} /></span><span>libtrack<span className="brand-dot">.</span></span></div>
      <p className="workspace-nav-label">LIBRARY</p>
      <Link className="workspace-nav-item workspace-nav-link" to="/kiosk">Entrance kiosk</Link>
      {(['overview','members','attendance','catalog','loans','holds','reports',...(staff.role==='ADMIN'?['staff','settings','audit']:[])] as View[]).map((item) => <button key={item} className={`workspace-nav-item ${view===item?'selected':''}`} onClick={() => {setView(item);setQuery('');setVisitFrom('');setVisitTo('');}}>{title[item]}</button>)}
      <div className="workspace-account"><div><strong>{staff.displayName}</strong><small>{staff.role}</small></div>{!localDevelopment&&<button title="Sign out" aria-label="Sign out" onClick={() => void signOut()}><LogOut size={16}/></button>}</div>
    </aside>
    <main className="workspace-main"><header className="workspace-header"><div><span>LIBRARY WORKSPACE</span><h1>{title[view]}</h1></div><div className="workspace-header-actions"><NotificationPlaceholder/>{localDevelopment&&<span className="local-dev-badge">LOCAL DEVELOPMENT</span>}<button className="workspace-refresh" onClick={() => void load()} disabled={loading}>Refresh</button>{view==='catalog'&&<button className="workspace-action" onClick={() => {setEditingBook(null);setShowBookForm(true);}}>Add book</button>}</div></header>
      {error&&<div className="workspace-error" role="alert">{error}</div>}
      {loading&&!loadedViews.has(view)?<PageSkeleton view={view}/>:view==='overview'?<>
        {!dashboard?<div className="workspace-empty">No dashboard data is available yet.</div>:<>
          <div className="workspace-overview-label"><h2>Circulation at a glance</h2><span>Live figures from your library</span></div>
          <section className="workspace-metrics" aria-label="Library statistics">
            <Stat label="Catalogue titles" value={dashboard.titles}/><Stat label="Registered students" value={dashboard.registeredStudents}/><Stat label="Students inside" value={dashboard.currentlyInside}/><Stat label="Today's visits" value={dashboard.todayAttendance}/><Stat label="Active members" value={dashboard.activeMembers}/><Stat label="Available copies" value={dashboard.availableCopies}/><Stat label="On loan" value={dashboard.onLoanCopies}/><Stat label="Overdue" value={dashboard.overdueLoans}/><Stat label="Due today" value={dashboard.dueToday}/><Stat label="Open holds" value={dashboard.actionableHolds}/>
          </section>
          <div className="workspace-overview-grid">
            <CopyAvailability available={dashboard.availableCopies} onLoan={dashboard.onLoanCopies}/>
            <section className="workspace-panel workspace-activity-panel"><div className="workspace-panel-heading"><div><span>RECENT</span><h2>Library activity</h2></div><span className="workspace-live-indicator">Live</span></div>{dashboard.recentActivity.length===0?<p className="workspace-muted">No activity has been recorded yet.</p>:<div className="workspace-activity">{dashboard.recentActivity.map((event,index)=><div key={`${event.action}-${index}`}><strong>{event.action.replace(/_/g,' ').toLowerCase()}</strong><span>{event.entityType.toLowerCase()} · {event.actorName??'Staff account'} · {new Date(event.occurredAt).toLocaleString()}</span></div>)}</div>}</section>
          </div>
        </>}
      </>:view==='attendance'?<AttendancePanel current={currentVisits} history={visitHistory} members={members?.items??[]} query={query} from={visitFrom} to={visitTo} setQuery={setQuery} setFrom={setVisitFrom} setTo={setVisitTo} busy={saving} checkIn={memberId=>void mutate('/api/v1/attendance/check-in','POST',{memberId})} checkOut={visitId=>void mutate(`/api/v1/attendance/${visitId}/check-out`)}/>:view==='reports'?<ReportsPanel data={reports} from={visitFrom} to={visitTo} setFrom={setVisitFrom} setTo={setVisitTo}/>:view==='loans'?<LoansPanel loans={loans} members={members?.items??[]} busy={saving} checkout={body=>void mutate('/api/v1/loans/checkout','POST',body)} renew={id=>void mutate(`/api/v1/loans/${id}/renew`)} returnLoan={id=>void mutate(`/api/v1/loans/${id}/return`)}/>:view==='holds'?<HoldsPanel holds={holds} members={members?.items??[]} books={books?.items??[]} busy={saving} create={body=>void mutate('/api/v1/holds','POST',body)} cancel={id=>void mutate(`/api/v1/holds/${id}/cancel`)} fulfill={id=>void mutate(`/api/v1/holds/${id}/fulfill`)}/>:view==='audit'?<AuditPanel page={auditRows}/>:view==='settings'?<SettingsPanel settings={settings} busy={saving} save={(key,value)=>void mutate(`/api/v1/settings/${key}`,'PUT',value)}/>:view==='staff'?<StaffPanel rows={staffRows} busy={saving} localDevelopment={localDevelopment} link={body=>void mutate('/api/v1/staff','POST',body)} update={(id,body)=>void mutate(`/api/v1/staff/${id}`,'PATCH',body)}/>:<section className="workspace-panel"><div className="workspace-list-toolbar"><label><span className="sr-only">Search</span><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={view==='catalog'?'Search title or ISBN':'Search name, number, or email'} /></label><span>{view==='catalog'?books?.total??0:members?.total??0} records</span></div>
        {view==='catalog'?(!books?.items.length?<p className="workspace-muted">No book titles yet. Add a book to start your catalogue.</p>:<div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>TITLE</th><th>AUTHORS</th><th>ISBN</th><th>COPIES</th><th>AVAILABLE</th><th>ACTIONS</th></tr></thead><tbody>{books.items.map(book=><tr key={book.id}><td><strong>{book.title}</strong><small>{book.publisher??''}</small></td><td>{book.authors||'—'}</td><td>{book.isbn||'—'}</td><td>{book.copies}</td><td>{book.availableCopies}</td><td><button className="workspace-table-action" onClick={()=>{setEditingBook(book);setShowBookForm(true);}}>Edit</button><button className="workspace-table-action" onClick={()=>setCopyBook(book)}>Add copy</button><button className="workspace-table-action" onClick={()=>setCodeBook(book)}>Copy QR</button></td></tr>)}</tbody></table></div>):(!members?.items.length?<p className="workspace-muted">No student accounts yet. Students create their accounts from the sign-up page, and their profiles appear here automatically.</p>:<div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>STUDENT</th><th>STUDENT INDEX NO.</th><th>PROGRAMME / LEVEL</th><th>TYPE</th><th>EMAIL</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{members.items.map(member=><tr key={member.id}><td><strong>{member.firstName} {member.lastName}</strong><small>{member.phone??''}</small></td><td>{member.libraryNumber}</td><td>{[member.programme,member.level].filter(Boolean).join(' · ')||'—'}</td><td>{member.memberType}</td><td>{member.email||'—'}</td><td>{member.status}</td><td><button className="workspace-table-action" onClick={()=>{setEditingMember(member);setShowMemberForm(true);}}>Edit</button></td></tr>)}</tbody></table></div>)}
      </section>}
    </main>
    {showBookForm&&<BookForm key={editingBook?.id??'new'} initial={editingBook??undefined} busy={saving} close={()=>{setShowBookForm(false);setEditingBook(null);}} save={(body)=>void saveBook(body)}/>}
    {showMemberForm&&editingMember&&<MemberForm key={editingMember.id} initial={editingMember} busy={saving} close={()=>{setShowMemberForm(false);setEditingMember(null);}} save={(body)=>void saveMember(body)}/>}
    {codeBook&&<BookCopyCodes key={codeBook.id} book={codeBook} token={token} close={()=>setCodeBook(null)}/>}
    {copyBook&&<CopyForm book={copyBook} busy={saving} close={()=>setCopyBook(null)} save={(barcode)=>void addCopy(copyBook,barcode)}/>}
  </div>;
}

function AnimatedNumber({value}:{value:number}){
  const [displayValue,setDisplayValue]=useState(0);
  const previousValue=useRef(0);
  useEffect(()=>{
    const start=previousValue.current;
    const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduceMotion){setDisplayValue(value);previousValue.current=value;return;}
    let frame=0;
    let startTime=0;
    const duration=620;
    const animate=(time:number)=>{
      if(!startTime)startTime=time;
      const progress=Math.min((time-startTime)/duration,1);
      const eased=1-Math.pow(1-progress,3);
      setDisplayValue(Math.round(start+(value-start)*eased));
      if(progress<1)frame=window.requestAnimationFrame(animate);
      else previousValue.current=value;
    };
    frame=window.requestAnimationFrame(animate);
    return()=>window.cancelAnimationFrame(frame);
  },[value]);
  return <>{displayValue.toLocaleString()}</>;
}

function Stat({label,value}:{label:string;value:number}){return <article className="workspace-stat"><span>{label}</span><strong><AnimatedNumber value={value}/></strong><i aria-hidden="true"/></article>}

function CopyAvailability({available,onLoan}:{available:number;onLoan:number}){
  const total=available+onLoan;
  const percentage=total===0?0:Math.round((available/total)*100);
  const radius=42;
  const circumference=2*Math.PI*radius;
  const [visiblePercentage,setVisiblePercentage]=useState(0);
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setVisiblePercentage(percentage);return;}
    const frame=window.requestAnimationFrame(()=>setVisiblePercentage(percentage));
    return()=>window.cancelAnimationFrame(frame);
  },[percentage]);
  const offset=circumference-(circumference*visiblePercentage)/100;
  return <section className="workspace-panel workspace-availability" aria-labelledby="copy-status-title">
    <div className="workspace-panel-heading"><div><span>COLLECTION</span><h2 id="copy-status-title">Copy availability</h2></div></div>
    <div className="workspace-availability-content">
      <div className="workspace-ring" role="img" aria-label={`${percentage} percent of tracked copies are available`}>
        <svg viewBox="0 0 100 100" aria-hidden="true"><circle className="workspace-ring-track" cx="50" cy="50" r={radius}/><circle className="workspace-ring-value" cx="50" cy="50" r={radius} strokeDasharray={circumference} strokeDashoffset={offset}/></svg>
        <div><strong>{total===0?'—':`${percentage}%`}</strong><span>available</span></div>
      </div>
      <div className="workspace-availability-legend">
        <div><span className="workspace-legend-dot available"/><span>Available</span><strong><AnimatedNumber value={available}/></strong></div>
        <div><span className="workspace-legend-dot on-loan"/><span>On loan</span><strong><AnimatedNumber value={onLoan}/></strong></div>
        <p>{total===0?'No copy records to summarize yet.':`${total.toLocaleString()} tracked ${total===1?'copy':'copies'}`}</p>
      </div>
    </div>
  </section>;
}

function DashboardSkeleton(){return <div className="workspace-dashboard-skeleton" aria-label="Loading library overview" aria-busy="true"><div className="workspace-skeleton-label"/><div className="workspace-skeleton-metrics">{Array.from({length:7},(_,index)=><div className="workspace-skeleton-card" key={index}><i/><b/><span/></div>)}</div><div className="workspace-skeleton-lower"><div className="workspace-skeleton-chart"/><div className="workspace-skeleton-activity"><i/><span/><span/><span/></div></div></div>}

function PageSkeleton({view}:{view:View}){
  if(view==='overview')return <DashboardSkeleton/>;
  if(view==='settings')return <div className="workspace-settings-skeleton" aria-label="Loading library policy" aria-busy="true">{[0,1].map(card=><section className="workspace-panel" key={card}><div className="workspace-skeleton-heading"/><div className="workspace-skeleton-settings-grid">{Array.from({length:4},(_,index)=><div key={index}><i/><span/></div>)}</div><div className="workspace-skeleton-button"/></section>)}</div>;
  const hasToolbar=view==='catalog'||view==='members';
  const hasForm=view==='loans'||view==='holds'||view==='staff'||view==='attendance';
  return <div className={`workspace-page-skeleton workspace-page-skeleton-${view}`} aria-label={`Loading ${view}`} aria-busy="true">
    {hasToolbar&&<div className="workspace-skeleton-toolbar"><span/><i/></div>}
    <section className="workspace-panel">
      {hasForm&&<div className="workspace-skeleton-form"><div/><div/><i/></div>}
      <div className="workspace-skeleton-table"><div className="workspace-skeleton-table-head">{Array.from({length:view==='audit'?4:5},(_,index)=><i key={index}/>)}</div>{Array.from({length:6},(_,row)=><div className="workspace-skeleton-table-row" key={row}>{Array.from({length:view==='audit'?4:5},(_,column)=><span key={column}/>)}</div>)}</div>
    </section>
  </div>;
}

export function WorkspaceLoading(){return <main className="workspace-loading-screen" aria-label="Opening your LibTrack workspace" aria-busy="true"><aside><i/><span/><span/><span/><span/><span/></aside><section><header><div/><i/></header><div className="workspace-loading-cards">{Array.from({length:4},(_,index)=><div key={index}><i/><b/></div>)}</div><div className="workspace-loading-bottom"><div/><div/></div></section></main>}
function ModalFrame({title,children,close}:{title:string;children:React.ReactNode;close:()=>void}){return <div className="workspace-modal-scrim" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><section className="workspace-modal"><header><h2>{title}</h2><button onClick={close} aria-label="Close">×</button></header>{children}</section></div>}
function BookForm({initial,busy,close,save}:{initial?:Book;busy:boolean;close:()=>void;save:(body:{firstCopyBarcode:string;bookId?:string;[key:string]:unknown})=>void}){const [form,setForm]=useState({title:initial?.title??'',isbn:initial?.isbn??'',publisher:initial?.publisher??'',publicationYear:initial?.publicationYear?.toString()??'',description:initial?.description??'',authors:initial?.authors??'',categories:initial?.categories??'',barcode:''});return <ModalFrame title={initial?'Edit book title':'Add a book title'} close={close}><form className="workspace-form" onSubmit={e=>{e.preventDefault();const {barcode,...book}=form;save({bookId:initial?.id,firstCopyBarcode:barcode,...book,publicationYear:form.publicationYear?Number(form.publicationYear):null,authors:form.authors.split(',').map(s=>s.trim()).filter(Boolean),categories:form.categories.split(',').map(s=>s.trim()).filter(Boolean)});}}><label>Title<input required maxLength={500} value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>ISBN<input maxLength={20} value={form.isbn} onChange={e=>setForm({...form,isbn:e.target.value})}/></label><label>Publisher<input value={form.publisher} onChange={e=>setForm({...form,publisher:e.target.value})}/></label><label>Publication year<input type="number" min="1400" max="2200" value={form.publicationYear} onChange={e=>setForm({...form,publicationYear:e.target.value})}/></label><label>Authors <small>Separate names with commas</small><input value={form.authors} onChange={e=>setForm({...form,authors:e.target.value})}/></label><label>Categories <small>Separate names with commas</small><input value={form.categories} onChange={e=>setForm({...form,categories:e.target.value})}/></label>{!initial&&<label>First copy barcode<input value={form.barcode} onChange={e=>setForm({...form,barcode:e.target.value})}/></label>}<label>Description<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><button className="workspace-action" disabled={busy}>{busy?'Saving…':'Save book'}</button></form></ModalFrame>}
function MemberForm({initial,busy,close,save}:{initial:Member;busy:boolean;close:()=>void;save:(body:{memberId:string;[key:string]:unknown})=>void}){const [form,setForm]=useState({libraryNumber:initial.libraryNumber,firstName:initial.firstName,lastName:initial.lastName,memberType:initial.memberType,email:initial.email??'',phone:initial.phone??'',status:initial.status,programme:initial.programme??'',level:initial.level??''});return <ModalFrame title="Edit member" close={close}><form className="workspace-form" onSubmit={e=>{e.preventDefault();save({...form,memberId:initial.id});}}><label>Student index number<input required maxLength={50} value={form.libraryNumber} onChange={e=>setForm({...form,libraryNumber:e.target.value})}/></label><label>First name<input required value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/></label><label>Last name<input required value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/></label><label>Member type<select value={form.memberType} onChange={e=>setForm({...form,memberType:e.target.value})}><option>STUDENT</option><option>STAFF</option><option>OTHER</option></select></label><label>Programme / department<input maxLength={160} value={form.programme} onChange={e=>setForm({...form,programme:e.target.value})}/></label><label>Level / year<input maxLength={80} value={form.level} onChange={e=>setForm({...form,level:e.target.value})}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Status<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>ACTIVE</option><option>SUSPENDED</option><option>INACTIVE</option></select></label><button className="workspace-action" disabled={busy}>{busy?'Saving…':'Save changes'}</button></form></ModalFrame>}

function AttendancePanel({current,history,members,query,from,to,setQuery,setFrom,setTo,busy,checkIn,checkOut}:{current:AttendanceRecord[];history:Page<AttendanceRecord>|null;members:Member[];query:string;from:string;to:string;setQuery:(value:string)=>void;setFrom:(value:string)=>void;setTo:(value:string)=>void;busy:boolean;checkIn:(memberId:string)=>void;checkOut:(visitId:string)=>void}){
  const [memberId,setMemberId]=useState('');
  const students=members.filter(member=>member.memberType==='STUDENT'&&member.status==='ACTIVE');
  const time=(value:string)=>new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Accra'}).format(new Date(value));
  return <div className="workspace-settings">
    <section className="workspace-panel">
      <div className="workspace-panel-heading"><div><span>LIBRARY VISITS</span><h2>Check a student in</h2></div></div>
      <p className="workspace-muted">Select an active student when they arrive. Record their departure from the list below when they leave.</p>
      <form className="workspace-inline-form" onSubmit={event=>{event.preventDefault();if(memberId){checkIn(memberId);setMemberId('');}}}>
        <label>Student<select required aria-label="Student to check in" value={memberId} onChange={event=>setMemberId(event.target.value)}><option value="">Choose an active student</option>{students.map(student=><option key={student.id} value={student.id}>{student.libraryNumber} · {student.firstName} {student.lastName}</option>)}</select></label>
        <button className="workspace-action" disabled={busy||!memberId}>{busy?'Saving…':'Record arrival'}</button>
      </form>
      {!current.length?<p className="workspace-muted">No students are currently checked in.</p>:<div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>PROGRAMME / LEVEL</th><th>ARRIVED</th><th>ACTION</th></tr></thead><tbody>{current.map(visit=><tr key={visit.id}><td>{visit.studentName}</td><td>{visit.libraryNumber}</td><td>{[visit.programme,visit.level].filter(Boolean).join(' · ')||'—'}</td><td>{time(visit.checkedInAt)}</td><td><button className="workspace-table-action" disabled={busy} onClick={()=>checkOut(visit.id)}>Record departure</button></td></tr>)}</tbody></table></div>}
    </section>
    <section className="workspace-panel">
      <div className="workspace-panel-heading"><div><span>VISIT HISTORY</span><h2>Past attendance</h2></div></div>
      <div className="workspace-list-toolbar"><label>Search student or programme<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Name, student ID, programme, or level"/></label><label>From<input type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label><label>To<input type="date" value={to} onChange={event=>setTo(event.target.value)}/></label></div>
      {!history?.items.length?<p className="workspace-muted">No attendance records match this search.</p>:<div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>STUDENT</th><th>STUDENT ID</th><th>PROGRAMME / LEVEL</th><th>ARRIVED</th><th>LEFT</th></tr></thead><tbody>{history.items.map(visit=><tr key={visit.id}><td>{visit.studentName}</td><td>{visit.libraryNumber}</td><td>{[visit.programme,visit.level].filter(Boolean).join(' · ')||'—'}</td><td>{time(visit.checkedInAt)}</td><td>{visit.checkedOutAt?time(visit.checkedOutAt):'Still inside'}</td></tr>)}</tbody></table></div>}
      <span className="workspace-muted">{history?.total??0} visits</span>
    </section>
  </div>;
}
function CopyForm({book,busy,close,save}:{book:Book;busy:boolean;close:()=>void;save:(barcode:string)=>void}){const[barcode,setBarcode]=useState('');return <ModalFrame title={`Add copy · ${book.title}`} close={close}><form className="workspace-form" onSubmit={e=>{e.preventDefault();save(barcode.trim());}}><label>Barcode<input required maxLength={80} value={barcode} onChange={e=>setBarcode(e.target.value)}/></label><button className="workspace-action" disabled={busy}>{busy?'Saving…':'Add copy'}</button></form></ModalFrame>}
function BookCopyCodes({book,token,close}:{book:Book;token?:string;close:()=>void}){const[copies,setCopies]=useState<BookCopyCode[]>([]);const[error,setError]=useState('');useEffect(()=>{void apiFetch<BookCopyCode[]>(`/api/v1/catalog/books/${book.id}/copies`,{},token).then(setCopies).catch(cause=>setError(cause instanceof Error?cause.message:'Could not load book copies.'));},[book.id,token]);return <ModalFrame title={`Copy QR codes · ${book.title}`} close={close}><p className="workspace-muted">Each code contains only its copy barcode. Print or display the code on that physical copy.</p>{error&&<div className="workspace-error" role="alert">{error}</div>}{!error&&!copies.length?<p className="workspace-muted">No book copies are recorded for this title yet.</p>:<div className="workspace-copy-qr-grid">{copies.map(copy=><article key={copy.id}><QRCodeSVG value={copy.barcode} size={112} level="M" includeMargin/><strong>{copy.barcode}</strong><small>{copy.status.replace(/_/g,' ')}</small></article>)}</div>}</ModalFrame>}
type ReportTab='attendance'|'borrowing'|'overdue';
function exportCsv(filename:string,headers:string[],rows:unknown[][]){const escape=(value:unknown)=>`"${String(value??'').replace(/"/g,'""')}"`;const content=[headers,...rows].map(row=>row.map(escape).join(',')).join('\r\n');const blob=new Blob([content],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);}
function ReportsPanel({data,from,to,setFrom,setTo}:{data:LibraryReports|null;from:string;to:string;setFrom:(value:string)=>void;setTo:(value:string)=>void}){const[tab,setTab]=useState<ReportTab>('attendance');const attendance=data?.attendanceByDay??[];const borrowing=data?.borrowingByTitle??[];const returns=data?.returnsByDay??[];const overdue=data?.overdueBooks??[];const maxAttendance=Math.max(1,...attendance.map(item=>item.visits));const maxBorrowing=Math.max(1,...borrowing.map(item=>item.checkouts));return <div className="workspace-reports"><section className="workspace-panel"><div className="workspace-panel-heading"><div><span>ACTIVITY PERIOD</span><h2>Library reports</h2></div>{data&&<button className="workspace-table-action" onClick={()=>setTab('overdue')}>Overdue report · {overdue.length}</button>}</div><div className="workspace-list-toolbar"><label>From<input type="date" value={from} onChange={event=>setFrom(event.target.value)}/></label><label>To<input type="date" value={to} onChange={event=>setTo(event.target.value)}/></label><span>{data?`${data.from} to ${data.to}`:'Loading report…'}</span></div><div className="workspace-report-inventory">{[['Copies in catalogue',data?.inventory.total??0],['Available',data?.inventory.available??0],['Borrowed',data?.inventory.borrowed??0],['On hold',data?.inventory.on_hold??0]].map(([label,value])=><article key={String(label)}><span>{label}</span><strong>{value}</strong></article>)}</div><nav className="workspace-report-tabs" aria-label="Report type">{([['attendance','Attendance'],['borrowing','Borrowing'],['overdue','Overdue']] as [ReportTab,string][]).map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}</nav>
{tab==='attendance'?<div className="workspace-report-columns"><ReportChart title="Visits by day" rows={attendance.map(item=>({label:item.date,value:item.visits,detail:`${item.students} students`}))} max={maxAttendance}/><ReportChart title="Returns by day" rows={returns.map(item=>({label:item.date,value:item.returns,detail:`${item.returns} returned`}))} max={Math.max(1,...returns.map(item=>item.returns))}/><section className="workspace-panel"><div className="workspace-panel-heading"><div><span>ATTENDANCE RECORDS</span><h2>Daily library visits</h2></div><button className="workspace-table-action" onClick={()=>exportCsv('libtrack-attendance.csv',['Date','Visits','Students'],attendance.map(item=>[item.date,item.visits,item.students]))}>Download CSV</button></div>{!attendance.length?<p className="workspace-muted">No attendance records in this period.</p>:<div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>DATE</th><th>VISITS</th><th>STUDENTS</th></tr></thead><tbody>{attendance.map(item=><tr key={item.date}><td>{item.date}</td><td>{item.visits}</td><td>{item.students}</td></tr>)}</tbody></table></div>}</section></div>:tab==='borrowing'?<section className="workspace-panel"><div className="workspace-panel-heading"><div><span>CIRCULATION ACTIVITY</span><h2>Most borrowed titles</h2></div><button className="workspace-table-action" onClick={()=>exportCsv('libtrack-borrowing.csv',['Book title','Checkouts'],borrowing.map(item=>[item.title,item.checkouts]))}>Download CSV</button></div>{!borrowing.length?<p className="workspace-muted">No books were borrowed in this period.</p>:<><ReportChart title="Checkouts by title" rows={borrowing.map(item=>({label:item.title,value:item.checkouts,detail:`${item.checkouts} checkouts`}))} max={maxBorrowing}/><div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>BOOK TITLE</th><th>CHECKOUTS</th></tr></thead><tbody>{borrowing.map(item=><tr key={item.title}><td>{item.title}</td><td>{item.checkouts}</td></tr>)}</tbody></table></div></>}</section>:<section className="workspace-panel"><div className="workspace-panel-heading"><div><span>OPEN OVERDUE LOANS</span><h2>Books awaiting return</h2></div><button className="workspace-table-action" onClick={()=>exportCsv('libtrack-overdue.csv',['Student','Library number','Book','Barcode','Due date','Days overdue'],overdue.map(item=>[item.studentName,item.libraryNumber,item.title,item.barcode,item.dueAt,item.overdueDays]))}>Download CSV</button></div>{!overdue.length?<p className="workspace-muted">There are no overdue books right now.</p>:<div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>STUDENT</th><th>LIBRARY NO.</th><th>BOOK</th><th>DUE</th><th>OVERDUE DAYS</th></tr></thead><tbody>{overdue.map(item=><tr key={`${item.barcode}-${item.dueAt}`}><td>{item.studentName}</td><td>{item.libraryNumber}</td><td>{item.title}</td><td>{new Date(item.dueAt).toLocaleDateString()}</td><td><strong className="workspace-overdue-count">{item.overdueDays}</strong></td></tr>)}</tbody></table></div>}</section>}</section></div>}
function ReportChart({title,rows,max}:{title:string;rows:{label:string;value:number;detail:string}[];max:number}){return <section className="workspace-panel workspace-report-chart"><div className="workspace-panel-heading"><div><span>ANALYTICS</span><h2>{title}</h2></div></div>{!rows.length?<p className="workspace-muted">No records in this period.</p>:<div className="workspace-chart-bars">{rows.map((row,index)=><div key={`${row.label}-${index}`} title={`${row.label}: ${row.detail}`}><div><i style={{height:`${Math.max(3,row.value/max*100)}%`}}/></div><small>{row.label}</small><strong>{row.value}</strong></div>)}</div>}</section>}
function LoansPanel({loans,members,busy,checkout,renew,returnLoan}:{loans:Loan[];members:Member[];busy:boolean;checkout:(body:unknown)=>void;renew:(id:string)=>void;returnLoan:(id:string)=>void}){const[memberId,setMemberId]=useState('');const[barcode,setBarcode]=useState('');return <section className="workspace-panel"><form className="workspace-inline-form" onSubmit={e=>{e.preventDefault();checkout({memberId,copyBarcode:barcode});}}><label>Member<select required value={memberId} onChange={e=>setMemberId(e.target.value)}><option value="">Choose a member</option>{members.filter(m=>m.status==='ACTIVE').map(m=><option key={m.id} value={m.id}>{m.libraryNumber} · {m.firstName} {m.lastName}</option>)}</select></label><label>Copy barcode<input required value={barcode} onChange={e=>setBarcode(e.target.value)} placeholder="Scan or enter barcode"/></label><button className="workspace-action" disabled={busy}>{busy?'Processing…':'Check out'}</button></form>{!loans.length?<p className="workspace-muted">There are no active loans.</p>:<div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>MEMBER</th><th>BOOK</th><th>BARCODE</th><th>DUE</th><th>ACTIONS</th></tr></thead><tbody>{loans.map(l=><tr key={l.id}><td>{l.memberName}<small>{l.libraryNumber}</small></td><td>{l.title}</td><td>{l.barcode}</td><td>{new Date(l.dueAt).toLocaleDateString()}</td><td><button className="workspace-table-action" disabled={busy} onClick={()=>returnLoan(l.id)}>Return</button><button className="workspace-table-action" disabled={busy} onClick={()=>renew(l.id)}>Renew</button></td></tr>)}</tbody></table></div>}</section>}
function HoldsPanel({holds,members,books,busy,create,cancel,fulfill}:{holds:Hold[];members:Member[];books:Book[];busy:boolean;create:(body:unknown)=>void;cancel:(id:string)=>void;fulfill:(id:string)=>void}){const[memberId,setMemberId]=useState('');const[bookId,setBookId]=useState('');const open=holds.filter(h=>['READY','QUEUED'].includes(h.status));return <section className="workspace-panel"><form className="workspace-inline-form" onSubmit={e=>{e.preventDefault();create({memberId,bookId});}}><label>Member<select required value={memberId} onChange={e=>setMemberId(e.target.value)}><option value="">Choose a member</option>{members.filter(m=>m.status==='ACTIVE').map(m=><option key={m.id} value={m.id}>{m.libraryNumber} · {m.firstName} {m.lastName}</option>)}</select></label><label>Book<select required value={bookId} onChange={e=>setBookId(e.target.value)}><option value="">Choose a title</option>{books.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label><button className="workspace-action" disabled={busy}>Place hold</button></form>{!open.length?<p className="workspace-muted">There are no open holds.</p>:<div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>STATUS</th><th>BOOK</th><th>MEMBER</th><th>REQUESTED</th><th>ACTIONS</th></tr></thead><tbody>{open.map(h=><tr key={h.id}><td>{h.status}{h.readyUntil&&<small>Pick up by {new Date(h.readyUntil).toLocaleDateString()}</small>}</td><td>{h.title}</td><td>{h.memberName}<small>{h.libraryNumber}</small></td><td>{new Date(h.requestedAt).toLocaleDateString()}</td><td>{h.status==='READY'&&<button className="workspace-table-action" disabled={busy} onClick={()=>fulfill(h.id)}>Check out</button>}{<button className="workspace-table-action" disabled={busy} onClick={()=>cancel(h.id)}>Cancel</button>}</td></tr>)}</tbody></table></div>}</section>}
function AuditPanel({page}:{page:Page<Record<string,unknown>>|null}){return <section className="workspace-panel">{!page?.items.length?<p className="workspace-muted">No audit activity has been recorded.</p>:<div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>WHEN</th><th>STAFF</th><th>ACTION</th><th>RECORD</th></tr></thead><tbody>{page.items.map((e,i)=><tr key={String(e.id??i)}><td>{e.occurredAt?new Date(String(e.occurredAt)).toLocaleString():'—'}</td><td>{String(e.actorName??'Staff account')}</td><td>{String(e.action??'').replace(/_/g,' ').toLowerCase()}</td><td>{String(e.entityType??'')} · {String(e.entityId??'')}</td></tr>)}</tbody></table></div>}</section>}
function SettingsPanel({settings,busy,save}:{settings:Record<string,Record<string,unknown>>|null;busy:boolean;save:(key:string,value:Record<string,unknown>)=>void}){const c=settings?.circulation??{};const f=settings?.fees??{};const[days,setDays]=useState(14);const[maxLoans,setMaxLoans]=useState(5);const[renewals,setRenewals]=useState(1);const[pickup,setPickup]=useState(3);const[currency,setCurrency]=useState('');const[daily,setDaily]=useState(0);const[maxFee,setMaxFee]=useState(0);const[feesEnabled,setFeesEnabled]=useState(false);useEffect(()=>{setDays(Number(c.defaultLoanDays??14));setMaxLoans(Number(c.maxLoansPerMember??5));setRenewals(Number(c.maxRenewals??1));setPickup(Number(c.holdPickupDays??3));setCurrency(String(f.currency??''));setDaily(Number(f.overdueFeePerDay??0));setMaxFee(Number(f.maxOverdueFee??0));setFeesEnabled(Boolean(f.enabled));},[settings]);return <div className="workspace-settings"><section className="workspace-panel"><div className="workspace-panel-heading"><div><span>CIRCULATION</span><h2>Loan and hold policy</h2></div></div><form className="workspace-inline-form workspace-settings-form" onSubmit={e=>{e.preventDefault();save('circulation',{defaultLoanDays:days,maxLoansPerMember:maxLoans,maxRenewals:renewals,holdPickupDays:pickup});}}><label>Loan days<input type="number" min="1" max="365" value={days} onChange={e=>setDays(Number(e.target.value))}/></label><label>Active loans per member<input type="number" min="1" max="100" value={maxLoans} onChange={e=>setMaxLoans(Number(e.target.value))}/></label><label>Renewals<input type="number" min="0" max="10" value={renewals} onChange={e=>setRenewals(Number(e.target.value))}/></label><label>Hold pickup days<input type="number" min="1" max="30" value={pickup} onChange={e=>setPickup(Number(e.target.value))}/></label><button className="workspace-action" disabled={busy}>Save circulation policy</button></form></section><section className="workspace-panel"><div className="workspace-panel-heading"><div><span>FEES</span><h2>Overdue charges</h2></div></div><form className="workspace-inline-form workspace-settings-form" onSubmit={e=>{e.preventDefault();save('fees',{currency:currency||null,overdueFeePerDay:daily,maxOverdueFee:maxFee,enabled:feesEnabled});}}><label>Currency code<input maxLength={3} value={currency} onChange={e=>setCurrency(e.target.value.toUpperCase())}/></label><label>Fee per overdue day<input type="number" min="0" step="0.01" value={daily} onChange={e=>setDaily(Number(e.target.value))}/></label><label>Maximum fee<input type="number" min="0" step="0.01" value={maxFee} onChange={e=>setMaxFee(Number(e.target.value))}/></label><label className="workspace-check"><input type="checkbox" checked={feesEnabled} onChange={e=>setFeesEnabled(e.target.checked)}/> Enable overdue fees</label><button className="workspace-action" disabled={busy}>Save fee policy</button></form></section></div>}
function StaffPanel({rows,busy,link,update,localDevelopment}:{rows:StaffRow[];busy:boolean;link:(body:unknown)=>void;update:(id:string,body:unknown)=>void;localDevelopment:boolean}){const[form,setForm]=useState({authUserId:'',email:'',displayName:''});return <section className="workspace-panel">{!localDevelopment&&<form className="workspace-inline-form workspace-staff-form" onSubmit={e=>{e.preventDefault();link(form);}}><label>Supabase Auth user UUID<input required value={form.authUserId} onChange={e=>setForm({...form,authUserId:e.target.value})}/></label><label>Email<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Display name<input required value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})}/></label><p className="workspace-muted">Staff accounts receive administrator access. Create the user in Supabase Auth first; LibTrack does not handle its password.</p><button className="workspace-action" disabled={busy||localDevelopment}>Add administrator</button></form>}{localDevelopment&&<p className="workspace-muted" role="note">Staff account setup requires Supabase Auth and is unavailable in local development mode. It will return when authentication is re-enabled.</p>}<div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>STAFF</th><th>EMAIL</th><th>ROLE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><td>{row.displayName}</td><td>{row.email}</td><td>ADMIN</td><td>{row.active?'Active':'Disabled'}</td><td><button className="workspace-table-action" disabled={busy} onClick={()=>update(row.id,{displayName:row.displayName,active:!row.active})}>{row.active?'Disable':'Enable'}</button></td></tr>)}</tbody></table></div></section>}
