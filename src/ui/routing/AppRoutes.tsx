import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ArrowRight, LibraryBig, LoaderCircle } from 'lucide-react';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { StudentSignupProvider, useStudentSignup } from '../auth/StudentSignupProvider';
import AccountPage from '../pages/AccountPage';
import HomePage from '../pages/HomePage';
import { Workspace, WorkspaceLoading } from '../workspace/Workspace';
const StudentPortal = lazy(() => import('../portal/StudentPortal').then(module => ({ default: module.StudentPortal })));
const KioskPage = lazy(() => import('../portal/KioskPage').then(module => ({ default: module.KioskPage })));

const localDemoMode = import.meta.env.VITE_LIBTRACK_LOCAL_DEV === 'true';

function SignInRoute() {
  const { loading, session, staff, student, error, configurationError, signIn, refresh, signOut } = useAuth();
  if (loading) return <main className="auth-shell"><div className="auth-card auth-loading"><LoaderCircle className="spin" /><span>Checking your LibTrack session…</span></div></main>;
  if (student && session) return <Navigate to="/student" replace />;
  if (staff && session) return <Navigate to="/dashboard" replace />;
  const authError = configurationError
    ? 'Sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for this environment.'
    : error;
  return <AccountPage mode="sign-in" localDemo={false} onSignIn={signIn} authError={authError} signInDisabled={configurationError} sessionPresent={Boolean(session)} onRetry={refresh} onSignOut={signOut} />;
}

function StudentRegistrationRoute() {
  const { createStudentAccount } = useStudentSignup();
  return <AccountPage mode="create-account" localDemo={false} onCreateStudent={createStudentAccount} />;
}

function DashboardRoute() {
  const { loading, session, staff, student, error, localDevelopment, signOut, refresh } = useAuth();

  if (loading) return <WorkspaceLoading/>;
  if (staff && (session || localDevelopment)) {
    return <Workspace staff={staff} token={session?.access_token} localDevelopment={localDevelopment} signOut={signOut} />;
  }
  if (student && session) return <Navigate to="/student" replace />;
  if (!localDevelopment) return <Navigate to="/sign-in" replace />;

  return <main className="auth-shell"><section className="auth-card">
    <div className="auth-brand"><span className="auth-brand-mark"><LibraryBig size={22} /></span><span>libtrack<span className="brand-dot">.</span></span></div>
    <p className="auth-kicker">LOCAL DEVELOPMENT</p><h1>Local workspace unavailable</h1>
    <p className="auth-copy" role="alert">{error ?? 'The API did not confirm local development mode.'}</p>
    <button className="auth-primary" type="button" onClick={() => void refresh()}>Try again <ArrowRight size={17} /></button>
  </section></main>;
}

function StudentRoute() {
  const { loading, session, student, staff, signOut } = useAuth();
  if (loading) return <WorkspaceLoading />;
  if (staff && session) return <Navigate to="/dashboard" replace />;
  if (!student || !session) return <Navigate to="/sign-in" replace />;
  return <Suspense fallback={<WorkspaceLoading />}><StudentPortal student={student} token={session.access_token} signOut={signOut} /></Suspense>;
}

function KioskRoute() {
  const { loading, session, staff, student, localDevelopment, signOut } = useAuth();
  if (loading) return <WorkspaceLoading />;
  if (student && session) return <Navigate to="/student" replace />;
  if (!staff || (!session && !localDevelopment)) return <Navigate to="/sign-in" replace />;
  return <Suspense fallback={<WorkspaceLoading />}><KioskPage token={session?.access_token} staffName={staff.displayName} signOut={signOut} /></Suspense>;
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
    <Route path="/create-account" element={localDemoMode
      ? <AccountPage mode="create-account" localDemo />
      : <StudentSignupProvider><StudentRegistrationRoute /></StudentSignupProvider>} />
    <Route path="/forgot-password" element={<AccountPage mode="forgot-password" localDemo={localDemoMode} />} />
    <Route path="/reset-password" element={<AccountPage mode="reset-password" localDemo={localDemoMode} />} />
    <Route path="/dashboard" element={<WithAuth><DashboardRoute /></WithAuth>} />
    <Route path="/student" element={<WithAuth><StudentRoute /></WithAuth>} />
    <Route path="/kiosk" element={<WithAuth><KioskRoute /></WithAuth>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
