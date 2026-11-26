import { LogOut, Printer, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { BrandLogo } from '../components/BrandLogo';

export function KioskPage({ staffName, signOut }: { staffName: string; signOut: () => Promise<void> }) {
  const entranceUrl = new URL('/entrance', window.location.origin).toString();

  return <main className="kiosk-shell kiosk-poster-shell">
    <header className="kiosk-header"><div className="kiosk-brand"><BrandLogo className="brand-logo-kiosk" /></div><div className="kiosk-staff-actions"><small>ENTRANCE QR SETUP</small><span className="kiosk-staff">{staffName}</span><button aria-label="Sign out" onClick={() => void signOut()}><LogOut size={17}/></button></div></header>
    <section className="kiosk-content kiosk-poster-content">
      <div className="kiosk-intro"><span>ONE CODE FOR THE LIBRARY</span><h1>Student entrance QR</h1><p>Print this code and place it at the library entrance. Students scan it with their phone to record arrival or departure.</p></div>
      <section className="kiosk-poster-card">
        <div className="kiosk-poster-code" aria-label={`Entrance QR code for ${entranceUrl}`}><QRCodeSVG value={entranceUrl} size={260} level="H" includeMargin/></div>
        <div className="kiosk-poster-details"><span className="kiosk-poster-icon"><QrCode size={19}/></span><h2>How students use it</h2>
          <ol><li>Scan the code with their phone camera.</li><li>Sign in to LibTrack if prompted.</li><li>The first scan records arrival; the next scan records departure.</li></ol>
          <p className="kiosk-poster-url">{entranceUrl}</p>
          <button className="kiosk-print-button" onClick={() => window.print()}><Printer size={17}/>Print entrance code</button>
          <small>Print this code while using the deployed LibTrack site so it opens the live system.</small>
        </div>
      </section>
      <p className="kiosk-privacy">Students without a phone can ask library staff to check them in or out from the Attendance page.</p>
    </section>
  </main>;
}
