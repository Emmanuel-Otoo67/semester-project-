import { type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ArrowRight, LibraryBig, LoaderCircle } from 'lucide-react';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import AccountPage from '../pages/AccountPage';
import HomePage from '../pages/HomePage';
import { Workspace } from '../workspace/Workspace';

const localDemoMode = import.meta.env.VITE_LIBTRACK_LOCAL_DEV === 'true';

function SignInRoute() {
  const { loading, session, staff, error, configurationError, signIn, refresh, signOut } = useAuth();
  if (loading) return <main className="auth-shell"><div className="auth-card auth-loading"><LoaderCircle className="spin" /><span>Checking your LibTrack session…</span></div></main>;
  if (staff && session) return <Navigate to="/dashboard" replace />;
  const authError = configurationError
    ? 'Sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for this environment.'
    : error;
  return <AccountPage mode="sign-in" localDemo={false} onSignIn={signIn} authError={authError} signInDisabled={configurationError} sessionPresent={Boolean(session)} onRetry={refresh} onSignOut={signOut} />;
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
  const signInPage = localDemoMode
    ? <AccountPage mode="sign-in" localDemo />
    : <WithAuth><SignInRoute /></WithAuth>;

  return <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/sign-in" element={signInPage} />
    <Route path="/create-account" element={<AccountPage mode="create-account" localDemo={localDemoMode} />} />
    <Route path="/forgot-password" element={<AccountPage mode="forgot-password" localDemo={localDemoMode} />} />
    <Route path="/reset-password" element={<AccountPage mode="reset-password" localDemo={localDemoMode} />} />
    <Route path="/dashboard" element={<WithAuth><DashboardRoute /></WithAuth>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
