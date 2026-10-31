import frau1 from '@/assets/wedium-people/person_frau_farbe-1.svg.asset.json';
import frau2 from '@/assets/wedium-people/person_frau_farbe-2.svg.asset.json';
import junge1 from '@/assets/wedium-people/person_junge_farbe-1.svg.asset.json';
import junge2 from '@/assets/wedium-people/person_junge_farbe-2.svg.asset.json';
import maedchen1 from '@/assets/wedium-people/person_maedchen_farbe-1.svg.asset.json';
import maedchen2 from '@/assets/wedium-people/person_maedchen_farbe-2.svg.asset.json';
import mann1 from '@/assets/wedium-people/person_mann_farbe-1.svg.asset.json';
import mann2 from '@/assets/wedium-people/person_mann_farbe-2.svg.asset.json';
import senior1 from '@/assets/wedium-people/person_senior_farbe-1.svg.asset.json';
import senior2 from '@/assets/wedium-people/person_senior_farbe-2.svg.asset.json';
import seniorin1 from '@/assets/wedium-people/person_seniorin_farbe-1.svg.asset.json';
import seniorin2 from '@/assets/wedium-people/person_seniorin_farbe-2.svg.asset.json';

/** The twelve wedium person icons, interleaved so neighbouring indices differ in person and colour. */
export const WEDIUM_PEOPLE = [
  frau1, mann2, junge1, seniorin2, maedchen1, senior2,
  frau2, mann1, junge2, seniorin1, maedchen2, senior1,
].map((asset) => asset.url);

/** Deterministic icon index for a node id, so a participant keeps the same face everywhere. */
export function wediumPersonIndex(id: string): number {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % WEDIUM_PEOPLE.length;
}

export function wediumPersonUrl(id: string): string {
  return WEDIUM_PEOPLE[wediumPersonIndex(id)];
}
