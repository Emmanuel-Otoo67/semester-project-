import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LibraryBig } from 'lucide-react';

export type AccountMode = 'sign-in' | 'create-account' | 'forgot-password' | 'reset-password';

type AccountPageProps = {
  mode: AccountMode;
  localDemo: boolean;
  onSignIn?: (email: string, password: string) => Promise<void>;
  authError?: string | null;
  signInDisabled?: boolean;
  sessionPresent?: boolean;
  onRetry?: () => Promise<void>;
  onSignOut?: () => Promise<void>;
  hasSession?: boolean;
  onCreateStudent?: (indexNumber: string, email: string, password: string) => Promise<'confirmation' | 'ready'>;
  onCompleteStudent?: (indexNumber: string) => Promise<void>;
};

const titleByMode: Record<AccountMode, string> = {
  'sign-in': 'Sign in to your library',
  'create-account': 'Create your account',
  'forgot-password': 'Forgot password',
  'reset-password': 'Reset password',
};

export default function AccountPage({ mode, localDemo, onSignIn, authError, signInDisabled, sessionPresent, onRetry, onSignOut, hasSession, onCreateStudent, onCompleteStudent }: AccountPageProps) {
  const navigate = useNavigate();
  const [indexNumber, setIndexNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ kind: 'error' | 'success'; text: string } | null>(null);
  const title = titleByMode[mode];
  const asksEmail = mode !== 'reset-password';
  const asksPassword = mode === 'sign-in' || mode === 'create-account' || mode === 'reset-password';
  const asksConfirmation = mode === 'create-account' || mode === 'reset-password';
  const isNewPassword = mode === 'create-account' || mode === 'reset-password';

  function validate() {
    const next: Record<string, string> = {};
    if (mode === 'create-account' && !indexNumber.trim()) next.indexNumber = 'Enter your student index number.';
    if (asksEmail && !(mode === 'create-account' && hasSession)) {
      if (!email.trim()) next.email = 'Enter your email address.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    }
    if (asksPassword && !(mode === 'create-account' && hasSession)) {
      if (!password) next.password = 'Enter your password.';
      else if (isNewPassword && password.length < 8) next.password = 'Use at least 8 characters.';
    }
    if (asksConfirmation && !(mode === 'create-account' && hasSession)) {
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
        await onSignIn(email.trim(), password);
        setPassword('');
        navigate('/dashboard');
      } catch (cause) {
        setFeedback({ kind: 'error', text: cause instanceof Error ? cause.message : 'Sign-in failed. Try again.' });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'create-account') {
      if (localDemo) navigate('/dashboard');
      else if (hasSession) {
        if (!onCompleteStudent) { setFeedback({ kind: 'error', text: 'Student account linking is unavailable. Try again later.' }); return; }
        setSubmitting(true);
        try { await onCompleteStudent(indexNumber.trim()); setFeedback({ kind: 'success', text: 'Student account linked. You can now open the student portal.' }); }
        catch (cause) { setFeedback({ kind: 'error', text: cause instanceof Error ? cause.message : 'Could not link this student account.' }); }
        finally { setSubmitting(false); }
      } else {
        if (!onCreateStudent) { setFeedback({ kind: 'error', text: 'Student account creation is not configured. Try again later.' }); return; }
        setSubmitting(true);
        try {
          const result = await onCreateStudent(indexNumber.trim(), email.trim(), password);
          setPassword(''); setConfirmation('');
          setFeedback({ kind: 'success', text: result === 'confirmation'
            ? 'Account created. Check your email, confirm the address, then sign in here to finish linking your student record.'
            : 'Student account is ready. Sign in to open your student portal.' });
        } catch (cause) { setFeedback({ kind: 'error', text: cause instanceof Error ? cause.message : 'Could not create the student account.' }); }
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
      <Link className="account-brand" to="/" aria-label="LibTrack home"><span><LibraryBig size={19} /></span>LibTrack</Link>
      <div className="account-aside-copy"><span className="account-aside-line" /><p>Track <i>•</i> Manage <i>•</i> Stay Ahead</p><h2>A clearer way to keep your library moving.</h2><span className="account-aside-note">Your library workspace, thoughtfully arranged.</span></div>
      <div className="account-aside-orbit account-aside-orbit-one" aria-hidden="true" /><div className="account-aside-orbit account-aside-orbit-two" aria-hidden="true" />
      <span className="account-aside-footer">LIBTRACK · LIBRARY WORKSPACE</span>
    </aside>
    <main className="account-main">
      <div className="account-topline"><Link to="/" className="account-home-link"><ArrowLeft size={15} /> Back to home</Link><span>LIBTRACK ACCOUNT</span></div>
      <section className="account-card">
        <div className="account-mobile-brand"><span><LibraryBig size={17} /></span>LibTrack</div>
        <p className="account-kicker">{mode === 'sign-in' ? 'WELCOME BACK' : mode === 'create-account' ? 'GET STARTED' : 'ACCOUNT HELP'}</p>
        <h1>{title}</h1>
        <p className="account-intro">{mode === 'sign-in'
          ? 'Sign in to continue to your library workspace.'
          : mode === 'create-account'
            ? hasSession ? 'Finish linking your sign-in to your student record.' : 'Use the student index number and email on your registered student record.'
            : mode === 'forgot-password'
              ? 'Enter your email to preview the password recovery step.'
              : 'Choose a new password to preview the reset step.'}</p>

        {localDemo && <div className="account-demo-note" role="note"><span className="demo-note-dot" /><span><strong>Local demo</strong> · Your details are not saved and no account is created.</span></div>}
        {!localDemo && mode === 'create-account' && !hasSession && <div className="account-demo-note" role="note"><span className="demo-note-dot" /><span><strong>Student accounts only</strong> · Staff accounts are created by LibTrack administrators.</span></div>}
        {!localDemo && (mode === 'forgot-password' || mode === 'reset-password') && <div className="account-demo-note" role="note"><span className="demo-note-dot" /><span><strong>Preview only</strong> · This account action is not connected.</span></div>}
        {authError && <div className="account-feedback error" role="alert"><span>{authError}</span>{sessionPresent && <div className="account-auth-actions"><button type="button" onClick={() => void onRetry?.()}>Check again</button><button type="button" onClick={() => void onSignOut?.()}>Sign out and use another account</button></div>}</div>}

        <form className="account-form" aria-label={title} onSubmit={submit} noValidate>
          {mode === 'create-account' && <Field id="account-index-number" label="Student index number" error={errors.indexNumber}>
            <input id="account-index-number" name="indexNumber" autoComplete="off" value={indexNumber} onChange={event => setIndexNumber(event.target.value)} placeholder="Enter your student index number" aria-invalid={Boolean(errors.indexNumber)} aria-describedby={errors.indexNumber ? 'account-index-number-error' : undefined} required />
          </Field>}

          {asksEmail && !(mode === 'create-account' && hasSession) && <Field id="account-email" label="Email address" error={errors.email}>
            <input id="account-email" name="email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@library.org" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'account-email-error' : undefined} required />
          </Field>}

          {asksPassword && !(mode === 'create-account' && hasSession) && <Field id="account-password" label="Password" error={errors.password}>
            <span className="account-password-wrap"><input id="account-password" name="password" type={passwordType} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} value={password} onChange={event => setPassword(event.target.value)} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'account-password-error' : undefined} required />
              <button type="button" className="password-visibility" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </span>
          </Field>}

          {asksConfirmation && !(mode === 'create-account' && hasSession) && <Field id="account-confirmation" label="Confirm password" error={errors.confirmation}>
            <input id="account-confirmation" name="confirmation" type={passwordType} autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} aria-invalid={Boolean(errors.confirmation)} aria-describedby={errors.confirmation ? 'account-confirmation-error' : undefined} required />
          </Field>}

          {mode === 'sign-in' && <Link className="account-forgot-link" to="/forgot-password">Forgot password?</Link>}
          {feedback && <p className={`account-feedback ${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.text}</p>}

          <button className="account-submit" type="submit" disabled={submitting || (mode === 'sign-in' && signInDisabled)}>
            {submitting ? (mode === 'sign-in' ? 'Signing in…' : 'Please wait…') : mode === 'sign-in' ? 'Continue' : mode === 'create-account' ? hasSession ? 'Link student record' : 'Create student account' : mode === 'forgot-password' ? 'Preview reset step' : 'Preview password reset'}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>

        {mode === 'sign-in' && <p className="account-switch">New to LibTrack? <Link to="/create-account">Create an account</Link></p>}
        {mode === 'create-account' && <p className="account-switch">Already have an account? <Link to="/sign-in">Sign in</Link></p>}
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
