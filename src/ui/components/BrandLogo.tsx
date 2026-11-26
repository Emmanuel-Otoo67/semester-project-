import logo from '../assets/libtrack-logo.png';

export function BrandLogo({ className = '' }: { className?: string }) {
  return <img className={`brand-logo ${className}`.trim()} src={logo} alt="LibTrack" />;
}
