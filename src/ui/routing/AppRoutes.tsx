import { useState, type FormEvent, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ArrowRight, LibraryBig, LoaderCircle } from 'lucide-react';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import HomePage from '../pages/HomePage';
import { Workspace } from '../workspace/Workspace';

function RoutePlaceholder({ title }: { title: string }) {
  return <main className="auth-shell"><section className="auth-card"><h1>{title}</h1></section></main>;
}

function SignInRoute() {
  const { loading, session, staff, error, configurationError, localDevelopment, signIn, signOut, refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await signIn(email, password);
      setPassword('');
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Sign-in failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <main className="auth-shell"><div className="auth-card auth-loading"><LoaderCircle className="spin" /><span>Checking your LibTrack session…</span></div></main>;
  if (staff && (session || localDevelopment)) return <Navigate to="/dashboard" replace />;

  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><span className="auth-brand-mark"><LibraryBig size={22} /></span><span>libtrack<span className="brand-dot">.</span></span></div>
    <p className="auth-kicker">STAFF ACCESS</p><h1>Sign in to your library</h1>
    <p className="auth-copy">Use the Supabase Auth account linked to your LibTrack staff profile.</p>
    {configurationError && <div className="auth-alert" role="alert"><strong>Sign-in is not configured.</strong><span>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for this environment.</span></div>}
    {error && <div className="auth-alert" role="alert"><strong>Staff access needs attention.</strong><span>{error}</span>{session && <><button type="button" onClick={() => void refresh()}>Check again</button><button type="button" onClick={() => void signOut()}>Sign out and use another account</button></>}</div>}
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="staff-email">Email address</label><input id="staff-email" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@school.edu" required />
      <label htmlFor="staff-password">Password</label><input id="staff-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required />
      {formError && <p className="auth-form-error" role="alert">{formError}</p>}
      <button className="auth-primary" type="submit" disabled={submitting || configurationError}>{submitting ? <><LoaderCircle size={17} className="spin" /> Signing in…</> : <>Continue <ArrowRight size={17} /></>}</button>
    </form>
    <p className="auth-footnote">Access is managed by your library administrator.</p>
  </section></main>;
}

function DashboardRoute() {
  const { loading, session, staff, error, localDevelopment, signOut, refresh } = useAuth();

  if (loading) return <main className="auth-shell"><div className="auth-card auth-loading"><LoaderCircle className="spin" /><span>Checking your LibTrack session…</span></div></main>;
  if (staff && (session || localDevelopment)) {
    return <Workspace staff={staff} token={session?.access_token} localDevelopment={localDevelopment} signOut={signOut} />;
  }
  if (!localDevelopment) return <Navigate to="/sign-in" replace />;

  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><span className="auth-brand-mark"><LibraryBig size={22} /></span><span>libtrack<span className="brand-dot">.</span></span></div>
    <p className="auth-kicker">LOCAL DEVELOPMENT</p><h1>Local workspace unavailable</h1>
    <p className="auth-copy" role="alert">{error ?? 'The API did not confirm local development mode.'}</p>
    <button className="auth-primary" type="button" onClick={() => void refresh()}>Try again <ArrowRight size={17} /></button>
  </section></main>;
}

function WithAuth({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export default function AppRoutes() {
  return <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/sign-in" element={<WithAuth><SignInRoute /></WithAuth>} />
    <Route path="/create-account" element={<RoutePlaceholder title="Create account" />} />
    <Route path="/forgot-password" element={<RoutePlaceholder title="Forgot password" />} />
    <Route path="/reset-password" element={<RoutePlaceholder title="Reset password" />} />
    <Route path="/dashboard" element={<WithAuth><DashboardRoute /></WithAuth>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
