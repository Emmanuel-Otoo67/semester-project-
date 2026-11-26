import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  CircleHelp,
  Home,
  Info,
  LibraryBig,
  LogIn,
  Mail,
  Menu,
  BookOpen as BooksIcon,
  RefreshCw,
  UsersRound,
  X,
} from 'lucide-react';

const featureAreas = [
  { title: 'Books and copies', detail: 'Add titles, record copy barcodes, edit catalogue details, and check availability.', icon: BookOpen },
  { title: 'Student accounts', detail: 'Students sign up with their details; LibTrack creates the member profile used by staff.', icon: UsersRound },
  { title: 'Entrance attendance', detail: 'At the kiosk, scan a student QR code or enter their index number to record arrival and departure.', icon: Check },
  { title: 'Loans and returns', detail: 'Staff check out a copy to a student, renew a loan, and record its return and due date.', icon: RefreshCw },
];

const navigation = [
  ['Home', '#home', Home],
  ['Features', '#features', BooksIcon],
  ['About', '#about', Info],
  ['FAQ', '#faq', CircleHelp],
  ['Contact', '#contact', Mail],
] as const;

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [featureCount, setFeatureCount] = useState(0);
  const countRef = useRef<HTMLSpanElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (reducedMotion || !('IntersectionObserver' in window)) {
      revealItems.forEach(item => item.classList.add('is-visible'));
      setFeatureCount(featureAreas.length);
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealItems.forEach(item => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = countRef.current;
    if (!element) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      setFeatureCount(featureAreas.length);
      return;
    }

    let interval: number | undefined;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      let current = 0;
      interval = window.setInterval(() => {
        current += 1;
        setFeatureCount(current);
        if (current >= featureAreas.length) {
          window.clearInterval(interval);
          observer.disconnect();
        }
      }, 90);
    }, { threshold: 0.6 });
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const updateParallax = () => {
      if (parallaxRef.current) {
        parallaxRef.current.style.setProperty('--scroll-shift', `${Math.min(window.scrollY, 500) * 0.08}px`);
      }
    };
    window.addEventListener('scroll', updateParallax, { passive: true });
    return () => window.removeEventListener('scroll', updateParallax);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  return <div className="site-shell">
    <header className="site-header">
      <Link className="site-brand" to="/" aria-label="LibTrack home" onClick={closeMenu}>
        <BrandLogo className="brand-logo-site" />
      </Link>
      <button className="site-menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="site-navigation" onClick={() => setMenuOpen(value => !value)}>
        {menuOpen ? <X size={21} /> : <Menu size={21} />}
      </button>
      <nav id="site-navigation" className={`site-navigation${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation" onKeyDown={event => { if (event.key === 'Escape') closeMenu(); }}>
        {navigation.map(([label, href, Icon]) => <a key={label} className="site-nav-link" href={href} onClick={closeMenu}><Icon size={14} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span></a>)}
        <Link className="site-sign-in" to="/sign-in" onClick={closeMenu}><LogIn size={14} aria-hidden="true" /><span>Sign in</span></Link>
      </nav>
    </header>
    <section className="site-hero" id="home">
      <div className="hero-glow hero-glow-one" aria-hidden="true" />
      <div className="hero-glow hero-glow-two" aria-hidden="true" />
      <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
      <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
      <div className="hero-parallax" ref={parallaxRef} aria-hidden="true" />
      <div className="hero-content">
        <div className="hero-copy" data-reveal>
          <h1>From the library door to the <span>loan desk.</span></h1>
          <p className="hero-description">LibTrack connects student accounts, entrance attendance, book checkouts, renewals, and returns in one library system.</p>
          <div className="hero-actions">
            <Link className="button button-gold" to="/create-account">Create student account <ArrowRight size={17} /></Link>
            <a className="button button-outline" href="#features">Explore features <ArrowDown size={16} /></a>
          </div>
          <div className="hero-proof"><span><Check size={14} /> Students create accounts and track their books</span><span className="proof-divider" /><span>Staff manage the collection, visits, and loans</span></div>
        </div>

        <div className="hero-visual" data-reveal>
          <div className="preview-halo" aria-hidden="true" />
          <DashboardPreview />
          <div className="floating-tag tag-catalog"><span className="floating-icon"><BookOpen size={15} /></span><span>Catalog<small>Collection records</small></span></div>
          <div className="floating-tag tag-circulation"><span className="floating-icon"><RefreshCw size={15} /></span><span>Circulation<small>Daily activity</small></span></div>
          <div className="preview-spark" aria-hidden="true"><span /><span /><span /></div>
        </div>
      </div>

      <div className="hero-bottom-row">
        <div className="hero-count"><strong aria-label="Core LibTrack workflows" ref={countRef}>{featureCount}</strong><span>core library workflows</span></div>
        <span className="bottom-rule" />
        <p>Students · books · attendance · loans</p>
        <a className="scroll-cue" href="#features" aria-label="Scroll to features"><span>Scroll to explore</span><span className="scroll-cue-icon"><ArrowDown size={14} /></span></a>
      </div>
    </section>

    <main>
      <section id="features" className="section section-features">
        <div className="section-heading" data-reveal>
          <p className="section-overline">LIBRARY TOOLS</p>
          <h2>One system for the <span>daily workflow.</span></h2>
          <p>Follow a student from account creation and library visits through book checkout and return.</p>
        </div>
        <div className="feature-grid">
          {featureAreas.map(({ title, detail, icon: Icon }, index) => <article className="feature-card" data-reveal key={title} style={{ '--reveal-order': index } as CSSProperties}>
            <div className="feature-icon"><Icon size={19} strokeWidth={1.8} /></div>
            <span className="feature-index">0{index + 1}</span>
            <h3>{title}</h3>
            <p>{detail}</p>
            <span className="feature-arrow" aria-hidden="true"><ArrowUpRight size={16} /></span>
          </article>)}
        </div>
      </section>

      <section id="how-it-works" className="section section-workflow">
        <div className="workflow-heading" data-reveal>
          <p className="section-overline">DAILY LIBRARY FLOW</p>
          <h2>One student record. <span>Every step recorded.</span></h2>
          <p>Here is how students and library staff use LibTrack from sign-up to return.</p>
        </div>
        <div className="workflow-steps">
          <article className="workflow-step" data-reveal><span className="step-number">01</span><div className="step-connector"><span /></div><h3>Students create accounts</h3><p>A student enters their index number, name, programme, level, email, and password. LibTrack creates their member profile with the account.</p></article>
          <article className="workflow-step" data-reveal><span className="step-number">02</span><div className="step-connector"><span /></div><h3>Staff prepare books</h3><p>Staff add titles and copies, assign a barcode to each copy, and check which copies are available.</p></article>
          <article className="workflow-step" data-reveal><span className="step-number">03</span><div className="step-connector"><span /></div><h3>Students record library visits</h3><p>At the entrance kiosk, a student scans their QR code or enters their index number to check in. Scanning again records checkout.</p></article>
          <article className="workflow-step" data-reveal><span className="step-number">04</span><div className="step-connector"><span /></div><h3>Staff lend and receive books</h3><p>Staff select the student and book copy, then record checkout, renewal, or return. Students can review due dates and borrowing history in their portal.</p></article>
        </div>
      </section>

      <section id="about" className="section section-about">
        <div className="about-mark" data-reveal><span className="about-orbit" /><span className="about-icon"><LibraryBig size={36} /></span><span className="about-dot" /></div>
        <div className="about-copy" data-reveal>
          <p className="section-overline">ABOUT LIBTRACK</p>
          <h2>One library. Shared, up-to-date records.</h2>
          <p>LibTrack gives students a place to find books, check their loans, and view library visits. Staff manage student records, the catalogue, entrance attendance, loans, returns, holds, and reports from the staff workspace.</p>
          <a href="#features" className="text-link">Explore the workspace <ArrowRight size={16} /></a>
        </div>
      </section>

      <section id="faq" className="section section-faq">
        <div className="faq-intro" data-reveal><p className="section-overline">HELP AND ACCESS</p><h2>Using LibTrack.</h2><p>How students, staff, and the entrance kiosk fit into the library workflow.</p></div>
        <div className="faq-list" data-reveal>
          <details><summary>What can I manage in LibTrack?<ChevronDown size={17} /></summary><p>The current workspace includes the catalogue, members, loans, holds, audit log, settings, and staff areas.</p></details>
          <details><summary>How do students and staff access LibTrack?<ChevronDown size={17} /></summary><p>Students can create an account from the student sign-up page. Staff sign in with accounts created by library management.</p></details>
          <details><summary>How is a library visit recorded?<ChevronDown size={17} /></summary><p>At the entrance kiosk, students scan their personal QR code or enter their index number. A second scan records their departure.</p></details>
        </div>
      </section>

      <section className="final-cta" data-reveal>
        <div className="cta-glow" aria-hidden="true" />
        <p className="section-overline">STUDENT ACCESS</p>
        <h2>Keep your library activity close.</h2>
        <p>Create a student account to browse the catalogue, check due dates, review your loans, and see recorded library visits.</p>
        <Link className="button button-gold" to="/create-account">Create student account <ArrowRight size={17} /></Link>
      </section>
    </main>

    <footer id="contact" className="site-footer">
      <div className="footer-main">
        <div className="footer-brand-block"><Link className="site-brand footer-brand" to="/" aria-label="LibTrack home"><BrandLogo className="brand-logo-footer" /></Link><p>A considered workspace for library operations.</p></div>
        <div className="footer-links"><span>Explore</span><a href="#features">Features</a><a href="#about">About</a><a href="#faq">FAQ</a></div>
        <div className="footer-links"><span>Account</span><Link to="/sign-in">Sign in</Link><Link to="/create-account">Create account</Link></div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} LibTrack</span><span>Library workspace</span></div>
    </footer>
  </div>;
}

function DashboardPreview() {
  return <div className="dashboard-preview" role="img" aria-label="LibTrack dashboard preview">
    <div className="preview-sidebar">
      <div className="preview-brand"><BrandLogo className="brand-logo-preview" /></div>
      <small>LIBRARY</small>
      <div className="preview-nav-item selected"><span className="preview-nav-dot" />Overview</div>
      <div className="preview-nav-item"><BookOpen size={13} />Catalog</div>
      <div className="preview-nav-item"><UsersRound size={13} />Members</div>
      <div className="preview-nav-item"><RefreshCw size={13} />Loan desk</div>
      <div className="preview-nav-item"><Bookmark size={13} />Hold queue</div>
      <div className="preview-profile"><span>LD</span><i>Library staff</i></div>
    </div>
    <div className="preview-main">
      <div className="preview-topbar"><span>LIBRARY WORKSPACE</span><span className="preview-avatar">L</span></div>
      <div className="preview-content">
        <div className="preview-heading"><div><small>OVERVIEW</small><h3>Library overview</h3></div><span className="preview-date"><i /> Workspace</span></div>
        <div className="preview-cards">
          <div><span>Catalogue</span><b><i /><i /><i /></b></div>
          <div><span>Members</span><b><i /><i /><i /></b></div>
          <div><span>Circulation</span><b><i /><i /><i /></b></div>
        </div>
        <div className="preview-panel">
          <div className="preview-panel-head"><span>LIBRARY ACTIVITY</span><span>Recent</span></div>
          <div className="preview-activity"><i /><span><b /><small /></span><em /></div>
          <div className="preview-activity"><i /><span><b /><small /></span><em /></div>
          <div className="preview-activity"><i /><span><b /><small /></span><em /></div>
        </div>
      </div>
    </div>
  </div>;
}
