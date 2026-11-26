import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CircleAlert, LoaderCircle, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/http';
import { BrandLogo } from '../components/BrandLogo';

type EntranceResult = { action: 'CHECKED_IN' | 'CHECKED_OUT'; message: string };

export function EntranceAttendancePage({ token, studentName }: { token: string; studentName: string }) {
  const started = useRef(false);
  const scanId = useRef(crypto.randomUUID());
  const [result, setResult] = useState<EntranceResult | null>(null);
  const [error, setError] = useState('');
  const [recentScan, setRecentScan] = useState(false);

  async function recordVisit() {
    setError('');
    try {
      const response = await apiFetch<EntranceResult>('/api/v1/student/attendance/entrance', {
        method: 'POST',
        body: JSON.stringify({ scanId: scanId.current }),
      }, token);
      setResult(response);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The visit could not be recorded. Ask library staff to check you in.');
    }
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const key = 'libtrack-entrance-last-scan';
    const previous = Number(sessionStorage.getItem(key) ?? 0);
    if (previous && Date.now() - previous < 5000) {
      setRecentScan(true);
      return;
    }
    sessionStorage.setItem(key, String(Date.now()));
    void recordVisit();
  }, [token]);

  const title = result?.action === 'CHECKED_IN' ? 'You are checked in' : result?.action === 'CHECKED_OUT' ? 'You are checked out' : '';

  return <main className="entrance-attendance-shell">
    <header className="entrance-attendance-header"><Link to="/student" aria-label="Back to student portal"><BrandLogo className="brand-logo-kiosk"/></Link><span><MapPin size={15}/> LIBRARY ENTRANCE</span></header>
    <section className="entrance-attendance-card" aria-live="polite">
      {result ? <><span className="entrance-attendance-icon success"><Check size={28}/></span><p className="entrance-attendance-kicker">ATTENDANCE RECORDED</p><h1>{title}</h1><p>{result.message}</p><small>Welcome, {studentName}. Scan the entrance code again when you leave.</small><Link className="entrance-attendance-link" to="/student"><ArrowLeft size={16}/>Student home</Link></>
        : recentScan ? <><span className="entrance-attendance-icon"><CircleAlert size={25}/></span><p className="entrance-attendance-kicker">SCAN ALREADY RECEIVED</p><h1>Give it a moment</h1><p>This code was just used in this browser. Wait a few seconds before scanning again.</p><Link className="entrance-attendance-link" to="/student"><ArrowLeft size={16}/>Student home</Link></>
        : error ? <><span className="entrance-attendance-icon error"><CircleAlert size={25}/></span><p className="entrance-attendance-kicker">ATTENDANCE NOT RECORDED</p><h1>Ask a librarian for help</h1><p role="alert">{error}</p><button className="entrance-attendance-link" onClick={() => void recordVisit()}>Try this scan again</button></>
        : <><span className="entrance-attendance-icon loading"><LoaderCircle size={25}/></span><p className="entrance-attendance-kicker">LIBRARY ATTENDANCE</p><h1>Recording your visit</h1><p>Checking your student account and updating your arrival or departure.</p></>}
    </section>
  </main>;
}
