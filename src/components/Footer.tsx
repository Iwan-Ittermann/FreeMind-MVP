import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="py-4 flex items-center justify-between px-4">
      <Link to="/legal" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        Impressum
      </Link>
      <div className="flex items-center gap-3">
        <Link to="/faq" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          FAQ
        </Link>
        <Link to="/bericht" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Bericht
        </Link>
      </div>
    </footer>
  );
}
