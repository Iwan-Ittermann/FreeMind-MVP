// StGB Paragraphs for content reporting
export type StGBParagraph = 
  | '§185'
  | '§186'
  | '§187'
  | '§201'
  | '§202a'
  | '§202b'
  | '§202c'
  | '§202d'
  | '§203'
  | '§184'
  | '§238'
  | '§130';

export interface StGBParagraphInfo {
  id: StGBParagraph;
  offense: string;
  text: string;
}

export const STGB_PARAGRAPHS: StGBParagraphInfo[] = [
  {
    id: '§185',
    offense: 'Beleidigung',
    text: 'Die Beleidigung wird mit Freiheitsstrafe bis zu einem Jahr oder mit Geldstrafe bestraft...',
  },
  {
    id: '§186',
    offense: 'Üble Nachrede',
    text: 'Üble Nachrede: Wer in Beziehung auf einen anderen eine Tatsache behauptet...',
  },
  {
    id: '§187',
    offense: 'Verleumdung',
    text: 'Verleumdung: Wer wider besseres Wissen in Beziehung auf einen anderen eine unwahre Tatsache behauptet...',
  },
  {
    id: '§201',
    offense: 'Verletzung der Vertraulichkeit des Wortes',
    text: 'Verletzung der Vertraulichkeit des Wortes: Wer unbefugt das nichtöffentlich gesprochene Wort...',
  },
  {
    id: '§202a',
    offense: 'Ausspähen von Daten',
    text: 'Ausspähen von Daten: Wer unbefugt sich oder einem anderen Zugang zu nicht bestimmten Daten verschafft...',
  },
  {
    id: '§202b',
    offense: 'Abfangen von Daten',
    text: 'Abfangen von Daten: Wer unbefugt Daten abfängt...',
  },
  {
    id: '§202c',
    offense: 'Vorbereitung von Ausspähen und Abfangen',
    text: 'Vorbereitung von Ausspähen und Abfangen: Wer Passwörter oder Programme verschafft...',
  },
  {
    id: '§202d',
    offense: 'Computerbetrug / Datenfälschung',
    text: 'Computerbetrug / Datenfälschung: Wer Daten unbefugt manipuliert...',
  },
  {
    id: '§203',
    offense: 'Verletzung von Privatgeheimnissen',
    text: 'Verletzung von Privatgeheimnissen: Wer unbefugt ein fremdes Geheimnis offenbart...',
  },
  {
    id: '§184',
    offense: 'Kinderpornographie',
    text: 'Kinderpornographie: Wer pornographische Inhalte einer Person unter 18 Jahren...',
  },
  {
    id: '§238',
    offense: 'Nachstellung / Stalking',
    text: 'Nachstellung / Stalking: Wer einer Person nachstellt, die Lebensgestaltung erheblich beeinträchtigt...',
  },
  {
    id: '§130',
    offense: 'Volksverhetzung',
    text: 'Volksverhetzung: Wer zu Hass gegen Teile der Bevölkerung aufstachelt...',
  },
];

export const MIN_JUSTIFICATION_LENGTH = 100;

export function getParagraphInfo(id: StGBParagraph): StGBParagraphInfo | undefined {
  return STGB_PARAGRAPHS.find((p) => p.id === id);
}
