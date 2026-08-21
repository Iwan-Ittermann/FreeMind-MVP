import { useEffect } from "react";
import graphShot from "@/assets/sogehts-graph.png.asset.json";
import diffShot from "@/assets/sogehts-scale-diff.png.asset.json";
import undShot from "@/assets/sogehts-scale-understanding.png.asset.json";

const panelClass =
  "snap-start min-h-screen w-full flex items-center justify-center px-5 sm:px-8 md:px-12 py-16 sm:py-20 md:py-24 border-b border-foreground/15";
const panelInner = "w-full max-w-5xl";
const eyebrowClass =
  "text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-alert";
const displayClass = "font-display font-black uppercase tracking-tighter leading-[0.9]";
const bodyProseClass = "text-lg sm:text-xl md:text-2xl leading-snug space-y-5 max-w-3xl";

function Shot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="w-full">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full max-w-2xl border border-foreground bg-background"
      />
      {caption && (
        <figcaption className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export default function Sogehts() {
  useEffect(() => {
    document.title = "So funktioniert freemind";
    const meta = document.querySelector('meta[name="description"]');
    if (meta)
      meta.setAttribute(
        "content",
        "Bei freemind beginnt alles mit einem Kreis. So sammelst du Punkte, indem du Menschen verstehst, die anders denken.",
      );
  }, []);

  return (
    <main
      lang="de"
      className="landing-theme h-screen overflow-y-auto snap-y snap-proximity bg-background text-foreground font-sans"
    >
      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col items-start gap-8`}>
          <p className={eyebrowClass}>Eine Woche · Eine Frage</p>
          <h1 className={`${displayClass} text-left`} style={{ fontSize: "clamp(2.25rem, 6.5vw, 5rem)" }}>
            SO FUNKTIONIERT FREEMIND
          </h1>
          <div className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight space-y-2">
            <p>Bei freemind beginnt alles mit einem Kreis.</p>
            <p>
              Auf diesem Kreis stehen <span className="text-alert">alle Meinungen, die mitmachen.</span>
            </p>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <p className={eyebrowClass}>Der Kreis</p>
          <Shot src={graphShot.url} alt="Der freemind Kreis mit allen Meinungen" caption="Der Kreis" />
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <p className={eyebrowClass}>Schritt 1</p>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5.5vw, 4rem)" }}>
            KLICKE EINE MEINUNG AN UND BEWERTE, WIE GROSS EURE MEINUNGSVERSCHIEDENHEIT IST.
          </h2>
          <Shot src={diffShot.url} alt="Skala für den Meinungsunterschied" caption="Meinungsunterschied" />
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <div className={bodyProseClass}>
            <p>
              Je unterschiedlicher zwei Meinungen sind, desto weiter stehen sie sich im Kreis gegenüber.
            </p>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <p className={eyebrowClass}>Schritt 2</p>
          <div className={bodyProseClass}>
            <p>
              Du bekommst Punkte, wenn du mit Menschen chattest, die anders denken als du – und dein
              Gegenüber das Gespräch <span className="text-alert font-bold">gut bewertet.</span>
            </p>
          </div>
          <Shot src={undShot.url} alt="Skala: Wie gut versteht der/die andere dich?" caption="Verständnis" />
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <p className={eyebrowClass}>Ein Beispiel</p>
          <div className="font-hand text-2xl sm:text-3xl md:text-4xl leading-relaxed space-y-3">
            <p>Meinungsunterschied: 10</p>
            <p>Erhaltene Chat-Bewertung: 5</p>
            <p className="pt-2 border-t-2 border-foreground/70 inline-block">
              Deine Punkte: 10 × 5 = <span className="text-alert">50</span>
            </p>
          </div>
        </div>
      </section>

      <section className={panelClass}>
        <div className={`${panelInner} flex flex-col gap-8`}>
          <p className={eyebrowClass}>Am Ende</p>
          <h2 className={displayClass} style={{ fontSize: "clamp(1.75rem, 5vw, 3.5rem)" }}>
            DIE FÜNF MENSCHEN MIT DEN MEISTEN PUNKTEN ERHALTEN EIN LOSUNGSWORT.
          </h2>
          <div className={bodyProseClass}>
            <p>Damit können sie mir ihre PayPal-Adresse oder Kontoverbindung schicken.</p>
            <p>
              Auf freemind können sie anschließend öffentlich bestätigen, dass sie ihr Preisgeld
              erhalten haben.
            </p>
          </div>
          <a
            href="/"
            className="inline-block self-start border-b-2 border-foreground pb-1 text-sm font-bold uppercase tracking-wider hover:text-alert hover:border-alert transition-colors"
          >
            ZURÜCK
          </a>
        </div>
      </section>

      <footer className="snap-start min-h-[40vh] w-full flex items-center px-5 sm:px-8 md:px-12 py-10">
        <div className={panelInner}>
          <div className="flex flex-wrap gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-widest items-center">
            <span>freemind</span>
            <span className="text-muted-foreground">/</span>
            <a href="/legal" className="hover:text-alert">Impressum</a>
            <span className="text-muted-foreground">/</span>
            <a href="mailto:iwan@freemind.chat" className="hover:text-alert">Kontakt</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
