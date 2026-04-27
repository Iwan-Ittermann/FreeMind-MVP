import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Legal() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/tt"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Link>

        <h1 className="text-3xl font-bold mb-8">Impressum</h1>

        <div className="space-y-6 text-foreground/90">
          <div className="space-y-1">
            <p>Digital Peace Talks gUG (haftungsbeschränkt)</p>
            <p>Kurt-Schumacher-Straße 76</p>
            <p>c/o flexdienst – #20159</p>
            <p>67663 Kaiserslautern</p>
          </div>

          <div className="space-y-1">
            <p></p>
            <p></p>
          </div>

          <div className="space-y-1">
            <p>Vertreten durch: Iwan Ittermann</p>
            <p>
              E-Mail:{" "}
              <a href="mailto:impressum@freemind.city" className="text-primary hover:underline">
                impressum@freemind.city
              </a>
            </p>
          </div>

          <div className="pt-6 border-t border-border">
            <h2 className="text-xl font-semibold mb-3">Verbraucherstreitbeilegung/Universalschlichtungsstelle</h2>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
