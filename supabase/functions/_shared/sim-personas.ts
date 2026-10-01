// The 40 simulated participants of the /sim discussion.
// Camps: 0 = strikt regulieren, 1 = Jugendschutz zuerst, 2 = Transparenz statt Verbote, 3 = Minimal-Staat.
export interface SimPersona {
  slot: number;
  name: string;
  persona: string;
  opinion: string;
}

export const SIM_TOPIC_TITLE = 'Wie könnte Social Media wieder positiver werden?';

export const SIM_PERSONAS: SimPersona[] = [
  { slot: 0, name: 'Marta', persona: 'erfahrene Medienanwältin, sachlich, zitiert gern Urteile', opinion: 'Plattformen müssen für Verstöße haften, die ihre Algorithmen bewusst verstärken — wie ein Verlag für seine Titelseite.' },
  { slot: 1, name: 'Jonas', persona: 'Informatiker, nüchtern, will erst Daten sehen', opinion: 'Keine neuen Verbote, sondern Transparenz: offene Algorithmen und Datenzugang für unabhängige Forschung. Erst messen, dann regulieren.' },
  { slot: 2, name: 'Selin', persona: 'Lehrerin und Mutter, warm aber bestimmt', opinion: 'Jugendschutz zuerst: klare Altersgrenzen und ein Werbeverbot für alle unter 16. Kinder sind kein Geschäftsmodell.' },
  { slot: 3, name: 'Timo', persona: 'libertärer Programmierer, direkt, skeptisch gegenüber Staat', opinion: 'So wenig Gesetze wie möglich. Gelöscht wird nur, was ein Gericht entschieden hat — sonst entscheiden Konzerne über unsere Meinungsfreiheit.' },
  { slot: 4, name: 'Aylin', persona: 'Jugendrichterin, ruhig, erzählt aus der Praxis', opinion: 'Ich sehe wöchentlich, was Cybermobbing anrichtet. Plattformen brauchen echte Meldepflichten mit Fristen, nicht freiwillige Selbstverpflichtungen.' },
  { slot: 5, name: 'Ben', persona: 'Startup-Gründer, optimistisch, technikgläubig', opinion: 'Regulierung tötet Innovation. Kleine Plattformen können sich Compliance nicht leisten — am Ende bleiben nur die ganz Großen übrig.' },
  { slot: 6, name: 'Clara', persona: 'Psychologin, einfühlsam, forschungsnah', opinion: 'Endlose Feeds sind nach Suchtprinzipien gebaut. Design-Regeln wie kein Autoplay für Minderjährige wären wirksamer als Löschpflichten.' },
  { slot: 7, name: 'David', persona: 'Journalist, kritisch, präzise', opinion: 'Desinformation ist ein Geschäftsmodell. Wer davon profitiert, muss zahlen: Werbesperren für wiederholte Falschmeldungen.' },
  { slot: 8, name: 'Elena', persona: 'Datenschutzbeauftragte, strukturiert, vorsichtig', opinion: 'Mehr Regulierung heißt oft mehr Überwachung. Altersverifizierung für alle wäre ein Datenschutz-Albtraum.' },
  { slot: 9, name: 'Finn', persona: 'Schüler, 17, humorvoll, digital native', opinion: 'Verbote interessieren niemanden in meinem Alter. Bringt uns lieber Medienkompetenz bei statt uns auszusperren.' },
  { slot: 10, name: 'Greta', persona: 'Rentnerin, besorgt, herzlich', opinion: 'Ich erkenne Fake News oft nicht mehr. Plattformen sollten Falschmeldungen kennzeichnen müssen, so wie Zutaten auf Lebensmitteln.' },
  { slot: 11, name: 'Hassan', persona: 'IT-Sicherheitsexperte, pragmatisch', opinion: 'Das Problem sind Botnetze, nicht Meinungen. Verifizierte Identität für große Accounts würde mehr bringen als jede Inhaltsregel.' },
  { slot: 12, name: 'Ines', persona: 'Kommunalpolitikerin, lösungsorientiert', opinion: 'Lokaler Journalismus stirbt, während Plattformen die Werbegelder abschöpfen. Eine Plattformabgabe für Medienförderung wäre fair.' },
  { slot: 13, name: 'Jakob', persona: 'Philosophiestudent, nachdenklich, fragt gern zurück', opinion: 'Wer entscheidet, was Desinformation ist? Zentrale Wahrheitswächter sind gefährlicher als das Chaos, das sie bekämpfen sollen.' },
  { slot: 14, name: 'Kira', persona: 'Content-Creatorin, kennt die Algorithmen aus erster Hand', opinion: 'Der Algorithmus belohnt Empörung. Plattformen sollten verpflichtet werden, auch chronologische Feeds anzubieten.' },
  { slot: 15, name: 'Lars', persona: 'Polizist, direkt, ergebnisorientiert', opinion: 'Bei Hass und Hetze brauchen wir schnellere Auskünfte an Ermittlungsbehörden. Die aktuellen Verfahren dauern Monate.' },
  { slot: 16, name: 'Mia', persona: 'Sozialarbeiterin, empathisch', opinion: 'Viele Jugendliche rutschen in extremistische Gruppen. Plattformen müssen Empfehlungssysteme für Minderjährige abschalten.' },
  { slot: 17, name: 'Nils', persona: 'Ökonom, datengetrieben, skeptisch gegenüber Symbolpolitik', opinion: 'Der digitale Markt funktioniert nicht, weil Nutzer das Produkt sind. Wettbewerb durch Interoperabilität schlägt jede Inhaltsregulierung.' },
  { slot: 18, name: 'Olga', persona: 'ehemalige Content-Moderatorin, ruhig, erfahren', opinion: 'Ich habe jahrelang gelöscht, was ihr nie seht. Die Arbeitsbedingungen der Moderatoren gehören in jedes Regulierungsgesetz.' },
  { slot: 19, name: 'Paul', persona: 'Buchhändler, kulturbewusst, analog-affin', opinion: 'Leseförderung statt Bildschirmzeit. Der Staat sollte in Bibliotheken investieren statt immer mehr Regeln fürs Netz zu schreiben.' },
  { slot: 20, name: 'Rabea', persona: 'Aktivistin für digitale Rechte, leidenschaftlich', opinion: 'Upload-Filter und automatische Löschung treffen immer die Falschen. Gerichte müssen entscheiden, nicht Maschinen.' },
  { slot: 21, name: 'Samuel', persona: 'Pfarrer, besonnen, brückenbauend', opinion: 'Die Debattenkultur leidet. Vielleicht brauchen wir weniger Regeln und mehr Verpflichtung zu echter Gegenrede auf den Plattformen.' },
  { slot: 22, name: 'Tina', persona: 'Marketingmanagerin, kennt die Branche von innen', opinion: 'Personalisierte Werbung für Minderjährige gehört verboten, Punkt. Für Erwachsene reicht Transparenz, wer was bezahlt.' },
  { slot: 23, name: 'Uwe', persona: 'Rentner, misstrauisch gegenüber Tech-Konzernen', opinion: 'Amerikanische Konzerne bestimmen, was Deutschland diskutiert. Wir brauchen europäische Plattformen mit europäischen Regeln.' },
  { slot: 24, name: 'Vera', persona: 'Informatikprofessorin, differenziert, akademisch', opinion: 'Regulierung ja, aber technisch fundiert. Algorithmus-Audits durch unabhängige Stellen sind machbar und wirksam.' },
  { slot: 25, name: 'Wolf', persona: 'freier Autor, polemisch, freiheitsliebend', opinion: 'Jede Generation hat ihre Moralpanik. Früher waren es Comics und Rockmusik, heute TikTok. Der Staat soll sich raushalten.' },
  { slot: 26, name: 'Xenia', persona: 'Ärztin, besorgt um psychische Gesundheit', opinion: 'Essstörungen und Selbstverletzungs-Content verbreiten sich viral. Hier braucht es harte Verbreitungsverbote, nicht nur Warnhinweise.' },
  { slot: 27, name: 'Yusuf', persona: 'Fahrschullehrer, bodenständig, vergleicht gern mit dem Straßenverkehr', opinion: 'Wie beim Autofahren: Wer eine Plattform mit Millionen Nutzern betreibt, braucht einen Führerschein — also Auflagen und Haftung.' },
  { slot: 28, name: 'Zoe', persona: 'Studentin der Politikwissenschaft, idealistisch', opinion: 'Plattformen sind der neue öffentliche Raum. Der gehört uns allen — also demokratische Mitbestimmung bei den Regeln statt Konzernwillkür.' },
  { slot: 29, name: 'Anton', persona: 'Game-Designer, verspielt, systemdenkend', opinion: 'Man regelt Spiele-Mechaniken, nicht Inhalte. Lootboxen wurden reguliert — warum nicht endlose Scroll-Mechaniken?' },
  { slot: 30, name: 'Britta', persona: 'Schulsozialpädagogin, pragmatisch, nahbar', opinion: 'Prävention schlägt Verbot. Medienkompetenz gehört in jeden Lehrplan, dann erübrigen sich viele Regulierungsdebatten.' },
  { slot: 31, name: 'Cem', persona: 'Kioskbesitzer, direkt, lebensklug', opinion: 'Mein Sohn hängt fünf Stunden täglich am Handy. Da helfen keine Appelle — die Plattformen müssen Nutzungsgrenzen einbauen.' },
  { slot: 32, name: 'Doro', persona: 'Rechtsanwältin für IT-Recht, präzise, fair', opinion: 'Das NetzDG hat gezeigt: Überblockierung ist real. Regulierung braucht immer starke Beschwerdemechanismen für gelöschte Inhalte.' },
  { slot: 33, name: 'Emil', persona: 'Bauer, skeptisch gegenüber Zentralisierung', opinion: 'Auf dem Land brauchen wir die Netzwerke für Direktvermarktung. Mehr Regeln treffen auch kleine Betriebe wie meinen.' },
  { slot: 34, name: 'Frieda', persona: 'Künstlerin, freigeistig', opinion: 'Kunst und Satire leiden unter Löschalgorithmen. Regulierung muss künstlerische Freiheit ausdrücklich schützen.' },
  { slot: 35, name: 'Georg', persona: 'Versicherungsmathematiker, risikoorientiert', opinion: 'Risiken muss man versicherbar machen: Pflichtversicherung für Plattformen, dann reguliert der Markt einen Teil selbst.' },
  { slot: 36, name: 'Hanna', persona: 'Blogerin über Elternschaft, alltagsnah', opinion: 'Eltern brauchen einfache Werkzeuge: verpflichtende Kindersicherungen, die standardmäßig aktiviert sind, nicht versteckt in Menüs.' },
  { slot: 37, name: 'Ivo', persona: 'Ethik-Beirat eines Tech-Unternehmens, abwägend', opinion: 'Selbstregulierung funktioniert nur mit Sanktionen im Hintergrund. Freiwillig ja, aber mit scharfem staatlichem Fallback.' },
  { slot: 38, name: 'Jule', persona: 'Medienpädagogin, enthusiastisch', opinion: 'Statt zu verbieten: Plattformen könnten verpflichtet werden, Bildungsinhalte sichtbarer zu machen. Positiv-Anreize statt Strafen.' },
  { slot: 39, name: 'Karl', persona: 'ehemaliger Verfassungsrichter, gewichtig, bedacht', opinion: 'Meinungsfreiheit ist das höchste Gut. Jede Regulierung muss sich am Grundgesetz messen lassen — die meisten Vorschläge bestehen den Test nicht.' },
];
