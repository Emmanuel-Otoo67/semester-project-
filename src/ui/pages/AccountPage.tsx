import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import type { StudentSignupDetails } from '../auth/StudentSignupDetails';

export type AccountMode = 'sign-in' | 'create-account' | 'forgot-password' | 'reset-password';

type AccountPageProps = {
  mode: AccountMode;
  localDemo: boolean;
  onSignIn?: (email: string, password: string, audience: 'STUDENT' | 'STAFF') => Promise<void>;
  signInAudience?: 'STUDENT' | 'STAFF';
  authError?: string | null;
  signInDisabled?: boolean;
  sessionPresent?: boolean;
  onRetry?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  onCreateStudent?: (details: StudentSignupDetails, email: string, password: string) => Promise<'confirmation' | 'ready'>;
};

const titleByMode: Record<AccountMode, string> = {
  'sign-in': 'Sign in to your library',
  'create-account': 'Create your account',
  'forgot-password': 'Forgot password',
  'reset-password': 'Reset password',
};

export default function AccountPage({ mode, localDemo, onSignIn, signInAudience = 'STUDENT', authError, signInDisabled, sessionPresent, onRetry, onSignOut, onCreateStudent }: AccountPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [indexNumber, setIndexNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [programme, setProgramme] = useState('');
  const [level, setLevel] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const title = mode === 'sign-in' ? `${signInAudience === 'STAFF' ? 'Staff' : 'Student'} sign in` : titleByMode[mode];
  const asksEmail = mode !== 'reset-password';
  const asksPassword = mode === 'sign-in' || mode === 'create-account' || mode === 'reset-password';
  const asksConfirmation = mode === 'create-account' || mode === 'reset-password';
  const isNewPassword = mode === 'create-account' || mode === 'reset-password';

  function validate() {
    const next: Record<string, string> = {};
    if (mode === 'create-account' && !indexNumber.trim()) next.indexNumber = 'Enter your student index number.';
    if (mode === 'create-account' && !firstName.trim()) next.firstName = 'Enter your first name.';
    if (mode === 'create-account' && !lastName.trim()) next.lastName = 'Enter your last name.';
    if (mode === 'create-account' && !programme.trim()) next.programme = 'Enter your programme or department.';
    if (mode === 'create-account' && !level.trim()) next.level = 'Enter your level or year.';
    if (mode === 'create-account' && phone.trim() && phone.replace(/\D/g, '').length < 7) next.phone = 'Enter a valid telephone number.';
    if (asksEmail) {
      if (!email.trim()) next.email = 'Enter your email address.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    }
    if (asksPassword) {
      if (!password) next.password = 'Enter your password.';
      else if (isNewPassword && password.length < 8) next.password = 'Use at least 8 characters.';
    }
    if (asksConfirmation) {
      if (!confirmation) next.confirmation = 'Confirm your password.';
      else if (password !== confirmation) next.confirmation = 'Passwords do not match.';
    }
    return next;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (mode === 'sign-in') {
      if (localDemo) {
        setPassword('');
        navigate('/dashboard');
        return;
      }
      if (!onSignIn) {
        setFeedback({ kind: 'error', text: 'Sign-in is not available in this environment.' });
        return;
      }
      setSubmitting(true);
      try {
        await onSignIn(email.trim(), password, signInAudience);
        setPassword('');
        const returnTo = (location.state as { returnTo?: unknown } | null)?.returnTo;
        const safeReturnTo = typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : null;
        navigate(safeReturnTo ?? (signInAudience === 'STAFF' ? '/dashboard' : '/student'));
      } catch (cause) {
        setFeedback({ kind: 'error', text: cause instanceof Error ? cause.message : 'Sign-in failed. Try again.' });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'create-account') {
      if (localDemo) navigate('/dashboard');
      else {
        if (!onCreateStudent) { setFeedback({ kind: 'error', text: 'Student account creation is not configured. Try again later.' }); return; }
        setSubmitting(true);
        try {
          const result = await onCreateStudent({ indexNumber: indexNumber.trim(), firstName: firstName.trim(), lastName: lastName.trim(), programme: programme.trim(), level: level.trim(), ...(phone.trim() ? { phone: phone.trim() } : {}) }, email.trim(), password);
          setPassword(''); setConfirmation('');
          if (result === 'ready') navigate('/student');
          else setFeedback({ kind: 'success', text: 'Your account was created. Check your email, then sign in to continue.' });
        } catch (cause) { setFeedback({ kind: 'error', text: cause instanceof Error ? cause.message : 'Could not create your student account. Check your details and try again.' }); }
        finally { setSubmitting(false); }
      }
      return;
    }

    if (mode === 'forgot-password') {
      setFeedback({ kind: 'success', text: localDemo
        ? 'This is a demo. No reset email was sent.'
        : 'Password recovery is not connected here. No email was sent.' });
      return;
    }

    setPassword('');
    setConfirmation('');
    setFeedback({ kind: 'success', text: localDemo
      ? 'Demo only: your password was not changed.'
      : 'Password reset is not connected here. Your password was not changed.' });
  }

  const passwordType = showPassword ? 'text' : 'password';

  return <div className="account-shell">
    <aside className="account-aside">
      <Link className="account-brand" to="/" aria-label="LibTrack home"><BrandLogo className="brand-logo-account" /></Link>
      <div className="account-aside-copy"><span className="account-aside-line" /><h2>Library visits and book loans, in one place.</h2><span className="account-aside-note">Students manage accounts and borrowing history. Staff manage books, attendance, checkouts, and returns.</span></div>
      <div className="account-aside-orbit account-aside-orbit-one" aria-hidden="true" /><div className="account-aside-orbit account-aside-orbit-two" aria-hidden="true" />
    </aside>
    <main className="account-main">
      <div className="account-topline"><Link to="/" className="account-home-link"><ArrowLeft size={15} /> Back to home</Link></div>
      <section className="account-card">
        <div className="account-mobile-brand"><BrandLogo className="brand-logo-mobile" /></div>
        <h1>{title}</h1>
        <p className="account-intro">{mode === 'sign-in'
          ? 'Sign in to continue to your library workspace.'
          : mode === 'create-account'
            ? 'Enter your student details and create a password. LibTrack creates your account and student profile together, then opens your dashboard.'
            : mode === 'forgot-password'
              ? 'Enter your email to preview the password recovery step.'
              : 'Choose a new password to preview the reset step.'}</p>

        {localDemo && <div className="account-demo-note" role="note"><span className="demo-note-dot" /><span><strong>Local demo</strong> · Your details are not saved and no account is created.</span></div>}
        {!localDemo && mode === 'create-account' && <div className="account-demo-note" role="note"><span className="demo-note-dot" /><span><strong>One signup, one step</strong> · Your student profile is saved to the library members list automatically.</span></div>}
        {!localDemo && (mode === 'forgot-password' || mode === 'reset-password') && <div className="account-demo-note" role="note"><span className="demo-note-dot" /><span><strong>Preview only</strong> · This account action is not connected.</span></div>}
        {authError && <div className="account-feedback error" role="alert"><span>{authError}</span>{sessionPresent && <div className="account-auth-actions">{/(not linked|profile not found|profile yet)/i.test(authError) && <Link to="/create-account">Complete student signup</Link>}<button type="button" onClick={() => void onRetry?.()}>Check again</button><button type="button" onClick={() => void onSignOut?.()}>Sign out and use another account</button></div>}</div>}

        <form className="account-form" aria-label={title} onSubmit={submit} noValidate>
          {mode === 'create-account' && <Field id="account-index-number" label="Student index number" error={errors.indexNumber}>
            <input id="account-index-number" name="indexNumber" autoComplete="off" value={indexNumber} onChange={event => setIndexNumber(event.target.value)} placeholder="Enter your student index number" aria-invalid={Boolean(errors.indexNumber)} aria-describedby={errors.indexNumber ? 'account-index-number-error' : undefined} required />
          </Field>}

          {mode === 'create-account' && <Field id="account-first-name" label="First name" error={errors.firstName}>
            <input id="account-first-name" name="firstName" autoComplete="given-name" value={firstName} onChange={event => setFirstName(event.target.value)} required />
          </Field>}

          {mode === 'create-account' && <Field id="account-last-name" label="Last name" error={errors.lastName}>
            <input id="account-last-name" name="lastName" autoComplete="family-name" value={lastName} onChange={event => setLastName(event.target.value)} required />
          </Field>}

          {mode === 'create-account' && <Field id="account-programme" label="Programme / department" error={errors.programme}>
            <input id="account-programme" name="programme" value={programme} onChange={event => setProgramme(event.target.value)} required />
          </Field>}

          {mode === 'create-account' && <Field id="account-level" label="Level / year" error={errors.level}>
            <input id="account-level" name="level" value={level} onChange={event => setLevel(event.target.value)} required />
          </Field>}

          {mode === 'create-account' && <Field id="account-phone" label="Telephone number (optional)" error={errors.phone}>
            <input id="account-phone" name="phone" type="tel" autoComplete="tel" maxLength={40} value={phone} onChange={event => setPhone(event.target.value)} placeholder="e.g. +233 24 123 4567" aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'account-phone-error' : undefined} />
          </Field>}

          {asksEmail && <Field id="account-email" label="Email address" error={errors.email}>
            <input id="account-email" name="email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@library.org" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'account-email-error' : undefined} required />
          </Field>}

          {asksPassword && <Field id="account-password" label="Password" error={errors.password}>
            <span className="account-password-wrap"><input id="account-password" name="password" type={passwordType} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'account-password-error' : undefined} required />
              <button type="button" className="password-visibility" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </span>
          </Field>}

          {asksConfirmation && <Field id="account-confirmation" label="Confirm password" error={errors.confirmation}>
            <input id="account-confirmation" name="confirmation" type={passwordType} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} aria-invalid={Boolean(errors.confirmation)} aria-describedby={errors.confirmation ? 'account-confirmation-error' : undefined} required />
          </Field>}

          {mode === 'sign-in' && <Link className="account-forgot-link" to="/forgot-password">Forgot password?</Link>}
          {feedback && <p className={`account-feedback ${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}

          <button className="account-submit" type="submit" disabled={submitting || (mode === 'sign-in' && signInDisabled)}>
            {submitting ? (mode === 'sign-in' ? 'Signing in…' : 'Please wait…') : mode === 'sign-in' ? 'Continue' : mode === 'create-account' ? 'Create account and open dashboard' : mode === 'forgot-password' ? 'Preview reset step' : 'Preview password reset'}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>

        {mode === 'sign-in' && signInAudience === 'STUDENT' && <p className="account-switch">New to LibTrack? <Link to="/create-account">Create a student account</Link></p>}
        {mode === 'sign-in' && signInAudience === 'STAFF' && <p className="account-switch">Students can <Link to="/student/sign-in">sign in here</Link>. Staff accounts are created by library management.</p>}
        {mode === 'create-account' && <p className="account-switch">Already have an account? <Link to="/student/sign-in">Student sign in</Link></p>}
        {mode === 'forgot-password' && <p className="account-switch"><Link to="/sign-in">Back to sign in</Link></p>}
        {mode === 'reset-password' && <p className="account-switch"><Link to="/sign-in">Back to sign in</Link><span> · </span><Link to="/forgot-password">Forgot password?</Link></p>}
      </section>
      <p className="account-legal">By continuing, you agree to use LibTrack in accordance with your library’s policies.</p>
    </main>
  </div>;
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return <div className="account-field"><label htmlFor={id}>{label}</label>{children}{error && <span className="account-field-error" id={`${id}-error`}>{error}</span>}</div>;
}
