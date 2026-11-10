import { useEffect, useState } from "react";

const FIELDS: { suffix: string; label: string }[] = [
  { suffix: "question_de", label: "Frage (DE)" },
  { suffix: "question_en", label: "Frage (EN)" },
  { suffix: "date_de", label: "Datum (DE), z. B. 12.–15. November 2026" },
  { suffix: "date_en", label: "Datum (EN), z. B. 12–15 November 2026" },
];

/** Edits one context's question/date tokens; shown in /admin and /wedium/admin. */
export function EventTextsEditor({
  scope,
  hint,
  load,
  save,
}: {
  scope: "main" | "wedium";
  hint: string;
  load: () => Promise<Record<string, string>>;
  save: (values: Record<string, string>) => Promise<boolean>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    load().then(setValues).catch(() => setStatus("Laden fehlgeschlagen"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ background: "#fff", border: "1px solid #cfd8e3", borderRadius: 8, padding: 16, display: "grid", gap: 10, marginBottom: 24, color: "#0f1b3d" }}>
      <strong>Diskussionsfrage & Datum</strong>
      <p style={{ margin: 0, fontSize: 13, color: "#5b6b7f" }}>{hint}</p>
      {FIELDS.map((f) => {
        const k = `${scope}_${f.suffix}`;
        return (
          <label key={k} style={{ display: "grid", gap: 4, fontSize: 13 }}>
            {f.label}
            <input
              value={values[k] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
              style={{ padding: 9, border: "1px solid #cfd8e3", borderRadius: 6, fontSize: 14 }}
            />
          </label>
        );
      })}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          onClick={async () => setStatus((await save(values)) ? "Gespeichert ✓" : "Speichern fehlgeschlagen")}
          style={{ padding: "9px 14px", borderRadius: 6, border: 0, background: "#0f1b3d", color: "#fff", fontWeight: 700, cursor: "pointer" }}
        >
          Speichern
        </button>
        {status && <span style={{ fontSize: 13 }}>{status}</span>}
      </div>
    </div>
  );
}
