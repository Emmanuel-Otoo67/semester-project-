import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, Check, LogOut, ScanLine } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { apiFetch } from '../api/http';

type ScanResult = { action: 'CHECKED_IN' | 'CHECKED_OUT'; message: string };

export function KioskPage({ token, staffName, signOut }: { token?: string; staffName: string; signOut: () => Promise<void> }) {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<{ stop: () => void } | null>(null);
  const busy = useRef(false);
  const blockedIdentifier = useRef<string | null>(null);
  const lastCodeAt = useRef(0);
  const [scanning, setScanning] = useState(true);
  const [manual, setManual] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');

  const processScan = useCallback(async (identifier: string, fromCamera = false) => {
    if (busy.current || !identifier.trim()) return;
    busy.current = true;
    if (fromCamera) blockedIdentifier.current = identifier.trim();
    else setScanning(false);
    setError(''); setResult(null);
    try {
      const scan = await apiFetch<ScanResult>('/api/v1/attendance/kiosk/scan', {
        method: 'POST', body: JSON.stringify({ scanId: crypto.randomUUID(), identifier: identifier.trim() }),
      }, token);
      setResult(scan);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'This scan could not be processed.');
    } finally {
      busy.current = false;
      window.setTimeout(() => { setResult(null); setError(''); if (!fromCamera) setScanning(true); }, 3500);
    }
  }, [token]);

  useEffect(() => {
    if (!scanning || !video.current) return;
    let alive = true;
    setCameraError('');
    const reader = new BrowserMultiFormatReader();
    reader.decodeFromVideoDevice(undefined, video.current, (decoded, scanError, activeControls) => {
      if (activeControls) controls.current = activeControls;
      if (decoded && alive) {
        const code = decoded.getText().trim();
        lastCodeAt.current = Date.now();
        if (code !== blockedIdentifier.current && !busy.current) void processScan(code, true);
      }
      else if (scanError && scanError.constructor.name !== 'NotFoundException' && alive) {
        setCameraError('Camera access is unavailable. Use the student library number field below.');
      } else if (alive && blockedIdentifier.current && Date.now() - lastCodeAt.current > 1200) {
        blockedIdentifier.current = null;
      }
    }).catch(() => { if (alive) setCameraError('Camera access is unavailable. Use the student library number field below.'); });
    return () => { alive = false; controls.current?.stop(); controls.current = null; };
  }, [scanning, processScan]);

  return <main className="kiosk-shell">
    <header className="kiosk-header"><div className="kiosk-brand"><BrandLogo className="brand-logo-kiosk" /></div><div><small>LIBRARY ENTRANCE</small><span className="kiosk-staff">{staffName}</span><button aria-label="Sign out" onClick={() => void signOut()}><LogOut size={17}/></button></div></header>
    <section className="kiosk-content">
      <div className="kiosk-intro"><span>STUDENT ATTENDANCE</span><h1>Welcome to the library</h1><p>Scan your personal LibTrack QR code when you arrive and again when you leave.</p></div>
      {result ? <section className={`kiosk-result ${result.action === 'CHECKED_IN' ? 'arrival' : 'departure'}`} role="status"><span><Check size={31}/></span><h2>{result.message}</h2><p>Your library attendance has been recorded.</p><small>Returning to scan mode…</small></section> : error ? <section className="kiosk-result kiosk-failure" role="alert"><h2>Unable to record this visit</h2><p>{error}</p><button onClick={() => { setError(''); setScanning(true); }}>Try again</button></section> : <>
        <section className="kiosk-scan-card"><div className="kiosk-scan-heading"><span><ScanLine size={19}/></span><div><strong>Scan your student QR code</strong><small>Position the code inside the frame</small></div><i className={scanning ? 'live' : ''}/></div><div className="kiosk-camera-frame"><video ref={video} muted playsInline aria-label="QR scanner camera"/><div className="kiosk-scan-frame"><i/><i/><i/><i/></div>{!scanning&&<div className="kiosk-camera-overlay"><span>Processing scan…</span></div>}</div><p className="kiosk-camera-note"><Camera size={14}/>{cameraError || 'Keep your QR code visible for a moment.'}</p></section>
        <div className="kiosk-or"><span>OR ENTER YOUR LIBRARY NUMBER</span></div>
        <form className="kiosk-manual" onSubmit={event => { event.preventDefault(); const value = manual; setManual(''); void processScan(value); }}><input aria-label="Student library number" autoComplete="off" value={manual} onChange={event => setManual(event.target.value)} placeholder="e.g. STU-2025-001"/><button disabled={!manual.trim()}>Record visit</button></form>
      </>}
      <p className="kiosk-privacy">This kiosk only confirms attendance. Your student information is not displayed.</p>
    </section>
  </main>;
}
