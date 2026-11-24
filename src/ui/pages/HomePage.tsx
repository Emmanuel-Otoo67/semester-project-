import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  LibraryBig,
  Menu,
  RefreshCw,
  UsersRound,
  X,
} from 'lucide-react';

const featureAreas = [
  { title: 'Catalog', detail: 'Keep titles, copies, and collection details together.', icon: BookOpen },
  { title: 'Members', detail: 'Find and maintain the records your library uses every day.', icon: UsersRound },
  { title: 'Circulation', detail: 'Handle checkouts, renewals, and returns in one place.', icon: RefreshCw },
  { title: 'Holds', detail: 'Follow requests as they move through the hold queue.', icon: Bookmark },
];

const navigation = [
  ['Home', '#home'],
  ['Features', '#features'],
  ['About', '#about'],
  ['FAQ', '#faq'],
  ['Contact', '#contact'],
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
    <section className="site-hero" id="home">
      <div className="hero-glow hero-glow-one" aria-hidden="true" />
      <div className="hero-glow hero-glow-two" aria-hidden="true" />
      <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
      <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
      <div className="hero-parallax" ref={parallaxRef} aria-hidden="true" />
      <header className="site-header">
        <Link className="site-brand" to="/" aria-label="LibTrack home" onClick={closeMenu}>
          <span className="site-brand-mark"><LibraryBig size={19} strokeWidth={2.2} /></span>
          <span>LibTrack</span>
        </Link>
        <button className="site-menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="site-navigation" onClick={() => setMenuOpen(value => !value)}>
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav id="site-navigation" className={`site-navigation${menuOpen ? ' is-open' : ''}`} aria-label="Main navigation" onKeyDown={event => { if (event.key === 'Escape') closeMenu(); }}>
          {navigation.map(([label, href]) => <a key={label} className="site-nav-link" href={href} onClick={closeMenu}>{label}</a>)}
          <Link className="site-sign-in" to="/sign-in" onClick={closeMenu}>Sign in</Link>
        </nav>
      </header>

      <div className="hero-content">
        <div className="hero-copy" data-reveal>
          <p className="hero-eyebrow"><span className="eyebrow-line" /> Track <i>•</i> Manage <i>•</i> Stay Ahead</p>
          <h1>Welcome to <span>LibTrack</span></h1>
          <p className="hero-description">A clear, considered workspace for your library’s collection, members, and everyday circulation.</p>
          <div className="hero-actions">
            <Link className="button button-gold" to="/create-account">Get started <ArrowRight size={17} /></Link>
            <a className="button button-outline" href="#how-it-works"><span className="play-mark">▶</span> Watch demo</a>
          </div>
          <div className="hero-proof"><span><Check size={14} /> A focused library workspace</span><span className="proof-divider" /><span>Built around your daily work</span></div>
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
        <div className="hero-count"><strong aria-label="Current LibTrack feature areas" ref={countRef}>{featureCount}</strong><span>connected work areas</span></div>
        <span className="bottom-rule" />
        <p>Clear records. Steadier library workflows.</p>
        <a className="scroll-cue" href="#features" aria-label="Scroll to features"><span>Scroll to explore</span><span className="scroll-cue-icon"><ArrowDown size={14} /></span></a>
      </div>
    </section>

    <main>
      <section id="features" className="section section-features">
        <div className="section-heading" data-reveal>
          <p className="section-overline">A place for the work</p>
          <h2>Library operations, <span>made clearer.</span></h2>
          <p>Bring the core parts of a library workspace into one calm, easy-to-follow interface.</p>
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
          <p className="section-overline">How it works</p>
          <h2>From records to <span>ready action.</span></h2>
          <p>A simple path through the areas staff already work with.</p>
        </div>
        <div className="workflow-steps">
          <article className="workflow-step" data-reveal><span className="step-number">01</span><div className="step-connector"><span /></div><h3>Keep the collection in view</h3><p>Organize titles and copies, then keep member records close at hand.</p></article>
          <article className="workflow-step" data-reveal><span className="step-number">02</span><div className="step-connector"><span /></div><h3>Move daily work forward</h3><p>Record checkouts, renewals, returns, and hold requests from the workspace.</p></article>
          <article className="workflow-step" data-reveal><span className="step-number">03</span><div className="step-connector"><span /></div><h3>Review what changed</h3><p>Use the existing activity and policy areas to keep operations understandable.</p></article>
        </div>
      </section>

      <section id="about" className="section section-about">
        <div className="about-mark" data-reveal><span className="about-orbit" /><span className="about-icon"><LibraryBig size={36} /></span><span className="about-dot" /></div>
        <div className="about-copy" data-reveal>
          <p className="section-overline">About LibTrack</p>
          <h2>Made for the people keeping a library moving.</h2>
          <p>LibTrack brings catalogue, member, and circulation records into a single staff workspace. Its interface is designed to make the next step easier to find and the current work easier to follow.</p>
          <a href="#features" className="text-link">Explore the workspace <ArrowRight size={16} /></a>
        </div>
      </section>

      <section id="faq" className="section section-faq">
        <div className="faq-intro" data-reveal><p className="section-overline">FAQ</p><h2>A few useful details.</h2><p>More product and contact information can be added as it is finalized.</p></div>
        <div className="faq-list" data-reveal>
          <details><summary>What can I manage in LibTrack?<ChevronDown size={17} /></summary><p>The current workspace includes the catalogue, members, loans, holds, audit log, settings, and staff areas.</p></details>
          <details><summary>Does this demo create a real account?<ChevronDown size={17} /></summary><p>No. The local sign-in and account screens demonstrate the interface. They do not save credentials or create accounts.</p></details>
          <details><summary>Where can I find contact information?<ChevronDown size={17} /></summary><p>LibTrack contact details will be added here when they are ready.</p></details>
        </div>
      </section>

      <section className="final-cta" data-reveal>
        <div className="cta-glow" aria-hidden="true" />
        <p className="section-overline">Your library workspace</p>
        <h2>Bring the day’s work into focus.</h2>
        <p>Explore the LibTrack interface and see how its current workspace is organized.</p>
        <Link className="button button-gold" to="/create-account">Get started <ArrowRight size={17} /></Link>
      </section>
    </main>

    <footer id="contact" className="site-footer">
      <div className="footer-main">
        <div className="footer-brand-block"><Link className="site-brand footer-brand" to="/"><span className="site-brand-mark"><LibraryBig size={18} /></span><span>LibTrack</span></Link><p>A considered workspace for library operations.</p></div>
        <div className="footer-links"><span>Explore</span><a href="#features">Features</a><a href="#about">About</a><a href="#faq">FAQ</a></div>
        <div className="footer-links"><span>Account</span><Link to="/sign-in">Sign in</Link><Link to="/create-account">Create account</Link><span className="footer-placeholder">Contact details coming soon</span></div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} LibTrack</span><span>Library workspace</span></div>
    </footer>
  </div>;
}

function DashboardPreview() {
  return <div className="dashboard-preview" role="img" aria-label="LibTrack dashboard preview">
    <div className="preview-sidebar">
      <div className="preview-brand"><span><LibraryBig size={14} /></span><b>LibTrack</b></div>
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
