import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="py-4 text-center">
      <Link 
        to="/legal" 
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Legal Disclaimer / Impressum
      </Link>
    </footer>
  );
}
