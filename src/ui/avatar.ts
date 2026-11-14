// Avatars met instrument (blok 3, stijl A · Neon Stage). Getekend als SVG in neonlijnen.
// Opbouw in lagen: haar achter → benen + lijf → hoofd → haar voor + gezicht + accessoires → instrument → armen.
// Elke figuur kan elk instrument bespelen: het instrument en de armen zijn een aparte laag.
// Puur tekst (geen DOM) in avatarMarkup(), zodat dezelfde tekeningen ook buiten de app gebruikt kunnen worden.

import type { InstrumentId } from '../app/settings';

const CYAN = '#3ff0ff';
const PINK = '#ff4fd8';
const YELLOW = '#ffe45c';
const GREEN = '#5dff9b';
const PURPLE = '#b46bff';
const BLUE = '#6f8bff';
const ORANGE = '#ffb04f';
const NIGHT = '#0b0518';
const SKIN = '#1a0d33';

export type CharacterId = 'nova' | 'kai' | 'luna' | 'rio' | 'zoe' | 'max' | 'jade' | 'kat' | 'bliep' | 'zib';

interface Character {
  id: CharacterId;
  name: string;
  /** Kleur van het lijf en de armen. */
  shirt: string;
  /** Haar of iets anders achter het hoofd. */
  back?: string;
  /** Vervangt het standaardhoofd (bv. robot). */
  head?: string;
  /** Haar voor, gezicht en accessoires. */
  front: string;
  /** Gezicht weglaten (als `front` of `head` er zelf een tekent). */
  ownFace?: boolean;
  /** Oogkleur. */
  eyes?: string;
}

const face = (eyes: string): string => `
  <ellipse cx="132" cy="104" rx="5" ry="7" fill="${eyes}"/>
  <ellipse cx="168" cy="104" rx="5" ry="7" fill="${eyes}"/>
  <path d="M136 124 Q150 134 164 124" fill="none" stroke="${eyes}" stroke-width="3"/>`;

export const CHARACTERS: Character[] = [
  {
    id: 'nova',
    name: 'Nova',
    shirt: PINK,
    back: `<path d="M188 70 C 226 80, 232 130, 214 168" fill="none" stroke="${PINK}" stroke-width="10"/>`,
    front: `<path d="M100 92 Q104 40 150 42 Q198 40 202 92 Q178 70 150 74 Q124 70 100 92 Z" fill="${PINK}" stroke="${PINK}" stroke-width="2"/>`,
  },
  {
    id: 'kai',
    name: 'Kai',
    shirt: GREEN,
    front: `<path d="M102 88 L106 56 L122 68 L132 40 L148 62 L162 38 L172 64 L190 48 L194 72 L200 90 Q176 72 150 74 Q124 72 102 88 Z" fill="${CYAN}" stroke="${CYAN}" stroke-width="2"/>`,
  },
  {
    id: 'luna',
    name: 'Luna',
    shirt: PURPLE,
    back: `<path d="M96 90 Q96 40 150 40 Q204 40 204 90 L212 196 Q150 208 88 196 Z" fill="${PURPLE}" stroke="${PURPLE}" stroke-width="2"/>`,
    front: `<path d="M100 96 Q100 44 150 44 Q200 44 200 96 L194 78 Q150 66 106 78 Z" fill="${PURPLE}" stroke="${PURPLE}" stroke-width="2"/>
      <path d="M186 56 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 z" fill="${YELLOW}" stroke="${YELLOW}" stroke-width="1"/>`,
  },
  {
    id: 'rio',
    name: 'Rio',
    shirt: CYAN,
    back: `<g fill="${YELLOW}" stroke="${YELLOW}" stroke-width="2">
      <circle cx="108" cy="62" r="26"/><circle cx="150" cy="44" r="30"/><circle cx="192" cy="62" r="26"/>
      <circle cx="96" cy="98" r="22"/><circle cx="204" cy="98" r="22"/></g>`,
    front: `<g fill="${YELLOW}" stroke="${NIGHT}" stroke-width="2">
      <circle cx="126" cy="58" r="14"/><circle cx="150" cy="52" r="15"/><circle cx="174" cy="58" r="14"/></g>`,
  },
  {
    id: 'zoe',
    name: 'Zoë',
    shirt: YELLOW,
    back: `<circle cx="102" cy="48" r="22" fill="${GREEN}" stroke="${GREEN}" stroke-width="2"/>
      <circle cx="198" cy="48" r="22" fill="${GREEN}" stroke="${GREEN}" stroke-width="2"/>`,
    front: `<path d="M100 90 Q102 42 150 42 Q198 42 200 90 Q186 68 160 70 L150 82 L140 70 Q114 68 100 90 Z" fill="${GREEN}" stroke="${GREEN}" stroke-width="2"/>`,
  },
  {
    id: 'max',
    name: 'Max',
    shirt: ORANGE,
    front: `<path d="M100 94 Q98 46 150 44 Q198 44 202 82 Q170 60 122 78 Q108 84 100 94 Z" fill="${BLUE}" stroke="${BLUE}" stroke-width="2"/>
      <circle cx="132" cy="104" r="13" fill="none" stroke="${YELLOW}" stroke-width="3"/>
      <circle cx="168" cy="104" r="13" fill="none" stroke="${YELLOW}" stroke-width="3"/>
      <path d="M145 104h10" stroke="${YELLOW}" stroke-width="3"/>`,
  },
  {
    id: 'jade',
    name: 'Jade',
    shirt: BLUE,
    back: `<path d="M94 96 Q92 40 150 40 Q208 40 206 96 L206 138 Q196 148 186 138 L114 138 Q104 148 94 138 Z" fill="${ORANGE}" stroke="${ORANGE}" stroke-width="2"/>`,
    front: `<path d="M100 90 Q104 46 150 46 Q196 46 200 90 L200 80 Q150 64 100 80 Z" fill="${ORANGE}" stroke="${ORANGE}" stroke-width="2"/>
      <path d="M96 96 Q96 30 150 30 Q204 30 204 96" fill="none" stroke="${PINK}" stroke-width="8"/>
      <rect x="84" y="82" width="20" height="34" rx="8" fill="${NIGHT}" stroke="${PINK}" stroke-width="3"/>
      <rect x="196" y="82" width="20" height="34" rx="8" fill="${NIGHT}" stroke="${PINK}" stroke-width="3"/>`,
  },
  {
    id: 'kat',
    name: 'Kat',
    shirt: PURPLE,
    back: `<path d="M92 70 L100 22 L132 50 Z" fill="${PURPLE}" stroke="${PURPLE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M208 70 L200 22 L168 50 Z" fill="${PURPLE}" stroke="${PURPLE}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M102 58 L106 36 L120 50 Z M198 58 L194 36 L180 50 Z" fill="${PINK}"/>
      <circle cx="150" cy="96" r="62" fill="${PURPLE}"/>`,
    front: `<path d="M144 116 h12 l-6 7 z" fill="${PINK}"/>
      <path d="M118 118 h-24 M118 124 l-22 6 M182 118 h24 M182 124 l22 6" stroke="${CYAN}" stroke-width="2"/>`,
  },
  {
    id: 'bliep',
    name: 'Bliep',
    shirt: CYAN,
    ownFace: true,
    head: `<path d="M150 46 V24" stroke="${CYAN}" stroke-width="3"/><circle cx="150" cy="20" r="7" fill="${YELLOW}"/>
      <rect x="100" y="46" width="100" height="94" rx="20" fill="${SKIN}" stroke="${CYAN}" stroke-width="3"/>
      <rect x="88" y="80" width="12" height="26" rx="4" fill="${NIGHT}" stroke="${PINK}" stroke-width="3"/>
      <rect x="200" y="80" width="12" height="26" rx="4" fill="${NIGHT}" stroke="${PINK}" stroke-width="3"/>
      <rect x="122" y="84" width="18" height="14" rx="4" fill="${GREEN}"/>
      <rect x="160" y="84" width="18" height="14" rx="4" fill="${GREEN}"/>
      <path d="M128 118 h44" stroke="${GREEN}" stroke-width="3"/>
      <path d="M136 114 v8 M150 114 v8 M164 114 v8" stroke="${GREEN}" stroke-width="2"/>`,
    front: '',
  },
  {
    id: 'zib',
    name: 'Zib',
    shirt: GREEN,
    ownFace: true,
    back: `<path d="M124 56 L106 18 M176 56 L194 18" stroke="${GREEN}" stroke-width="4"/>
      <circle cx="106" cy="16" r="8" fill="${PINK}"/><circle cx="194" cy="16" r="8" fill="${PINK}"/>`,
    head: `<path d="M150 44 C 204 44, 206 108, 182 136 Q150 156 118 136 C 94 108, 96 44, 150 44 Z" fill="${SKIN}" stroke="${GREEN}" stroke-width="3"/>`,
    front: `<ellipse cx="128" cy="96" rx="13" ry="17" fill="${GREEN}"/>
      <ellipse cx="172" cy="96" rx="13" ry="17" fill="${GREEN}"/>
      <circle cx="131" cy="92" r="4" fill="${NIGHT}"/><circle cx="175" cy="92" r="4" fill="${NIGHT}"/>
      <path d="M140 126 Q150 132 160 126" fill="none" stroke="${GREEN}" stroke-width="3"/>`,
  },
];

const arm = (d: string, color: string): string => `<path d="${d}" fill="none" stroke="${color}" stroke-width="10"/>`;

/** Instrument + armen in de juiste houding. `c` = kleur van de armen. */
const INSTRUMENT_LAYERS: Record<InstrumentId, (c: string) => string> = {
  keyboard: (c) => `
    <g transform="rotate(-10 150 228)">
      <rect x="40" y="206" width="220" height="50" rx="10" fill="${NIGHT}" stroke="${CYAN}" stroke-width="3"/>
      <path d="M66 216v30M88 216v30M110 216v30M132 216v30M154 216v30M176 216v30M198 216v30M220 216v30M242 216v30" stroke="${CYAN}" stroke-width="2"/>
      <rect x="74" y="216" width="8" height="18" rx="2" fill="${PINK}"/>
      <rect x="96" y="216" width="8" height="18" rx="2" fill="${PINK}"/>
      <rect x="140" y="216" width="8" height="18" rx="2" fill="${PINK}"/>
      <rect x="162" y="216" width="8" height="18" rx="2" fill="${PINK}"/>
      <rect x="184" y="216" width="8" height="18" rx="2" fill="${PINK}"/>
    </g>
    ${arm('M108 170 Q86 200 112 222', c)}
    ${arm('M192 170 Q214 196 190 214', c)}`,
  gitaar: (c) => `
    <g transform="rotate(-24 150 236)">
      <rect x="150" y="226" width="118" height="14" rx="4" fill="${NIGHT}" stroke="${CYAN}" stroke-width="3"/>
      <path d="M170 226v14M190 226v14M210 226v14M230 226v14M250 226v14" stroke="${CYAN}" stroke-width="1.5"/>
      <rect x="264" y="220" width="22" height="26" rx="5" fill="${NIGHT}" stroke="${PINK}" stroke-width="3"/>
      <path d="M62 210 Q90 198 114 216 Q146 206 160 226 Q166 238 160 250 Q146 270 114 260 Q90 278 62 266 Q44 238 62 210 Z" fill="${NIGHT}" stroke="${PINK}" stroke-width="3"/>
      <circle cx="104" cy="238" r="8" fill="none" stroke="${CYAN}" stroke-width="3"/>
      <path d="M100 232h70M100 238h70M100 244h70" stroke="${CYAN}" stroke-width="1" opacity="0.7"/>
    </g>
    ${arm('M106 170 Q88 214 124 236', c)}
    ${arm('M194 170 Q232 176 236 196', c)}`,
  bas: (c) => `
    <g transform="rotate(-30 150 240)">
      <rect x="148" y="230" width="128" height="14" rx="4" fill="${NIGHT}" stroke="${YELLOW}" stroke-width="3"/>
      <path d="M170 230v14M192 230v14M214 230v14M236 230v14M256 230v14" stroke="${YELLOW}" stroke-width="1.5"/>
      <rect x="272" y="222" width="22" height="30" rx="5" fill="${NIGHT}" stroke="${CYAN}" stroke-width="3"/>
      <path d="M52 208 Q84 194 112 216 Q148 204 160 230 Q166 244 158 256 Q144 278 112 266 Q84 286 52 270 Q32 240 52 208 Z" fill="${NIGHT}" stroke="${YELLOW}" stroke-width="3"/>
      <rect x="92" y="232" width="20" height="14" rx="3" fill="none" stroke="${CYAN}" stroke-width="2"/>
      <path d="M100 233h70M100 238h70M100 243h70" stroke="${YELLOW}" stroke-width="1.2" opacity="0.8"/>
    </g>
    ${arm('M106 170 Q86 216 120 240', c)}
    ${arm('M194 170 Q238 172 246 186', c)}`,
  drum: (c) => `
    <ellipse cx="150" cy="292" rx="78" ry="16" fill="${NIGHT}" stroke="${CYAN}" stroke-width="3"/>
    <path d="M72 292 v36 Q150 352 228 328 v-36" fill="${NIGHT}" stroke="${CYAN}" stroke-width="3"/>
    <path d="M86 300 l18 30 M126 306 l14 30 M174 306 l-14 30 M214 300 l-18 30" stroke="${PINK}" stroke-width="2"/>
    <ellipse cx="150" cy="292" rx="78" ry="16" fill="none" stroke="${CYAN}" stroke-width="3"/>
    ${arm('M106 170 Q78 196 92 226', c)}
    ${arm('M194 170 Q222 196 208 226', c)}
    <path d="M92 226 L130 280" stroke="${YELLOW}" stroke-width="6" stroke-linecap="round"/>
    <path d="M208 226 L172 280" stroke="${YELLOW}" stroke-width="6" stroke-linecap="round"/>`,
  zang: (c) => `
    ${arm('M108 172 Q94 214 116 250', c)}
    ${arm('M194 170 Q214 150 186 130', c)}
    <rect x="178" y="128" width="12" height="40" rx="5" fill="${NIGHT}" stroke="${CYAN}" stroke-width="3" transform="rotate(28 184 148)"/>
    <circle cx="176" cy="124" r="12" fill="${NIGHT}" stroke="${GREEN}" stroke-width="3"/>
    <path d="M168 120h16M168 127h16" stroke="${GREEN}" stroke-width="1.5"/>`,
};

const LABELS: Record<InstrumentId, string> = {
  keyboard: 'keyboard',
  gitaar: 'gitaar',
  bas: 'basgitaar',
  drum: 'drum',
  zang: 'microfoon',
};

export function characterById(id: string): Character {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

/** De tekening als SVG-tekst. `uid` maakt de naam van het gloei-filter uniek als er meerdere op één pagina staan. */
export function avatarMarkup(
  characterId: CharacterId,
  instrument: InstrumentId,
  opts: { stage?: boolean; glow?: boolean; uid?: string } = {},
): string {
  const ch = characterById(characterId);
  const id = `glow-${opts.uid ?? `${characterId}-${instrument}`}`;
  const filter = opts.glow === false ? '' : ` filter="url(#${id})"`;
  const head = ch.head ?? `<circle cx="150" cy="96" r="50" fill="${SKIN}" stroke="${CYAN}" stroke-width="3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 370" role="img" aria-label="${ch.name} met ${LABELS[instrument]}" class="avatar" data-character="${ch.id}" data-instrument="${instrument}">
  <defs><filter id="${id}" x="-30%" y="-30%" width="160%" height="160%">
    <feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter></defs>
  ${opts.stage ? `<ellipse cx="150" cy="350" rx="140" ry="16" fill="#24123f" stroke="${PINK}" stroke-width="2"${filter}/>` : ''}
  <g${filter} stroke-linecap="round" stroke-linejoin="round">
    ${ch.back ?? ''}
    <rect x="118" y="262" width="26" height="80" rx="12" fill="#160a2e" stroke="${CYAN}" stroke-width="3"/>
    <rect x="158" y="262" width="26" height="80" rx="12" fill="#160a2e" stroke="${CYAN}" stroke-width="3"/>
    <path d="M104 156 Q150 140 196 156 L206 270 Q150 284 94 270 Z" fill="#2a1150" stroke="${ch.shirt}" stroke-width="3"/>
    ${head}
    ${ch.ownFace ? '' : face(ch.eyes ?? CYAN)}
    ${ch.front}
    ${INSTRUMENT_LAYERS[instrument](ch.shirt)}
  </g>
</svg>`;
}

let counter = 0;

/** Avatar als element voor in de app. */
export function avatarSvg(
  instrument: InstrumentId,
  opts: { stage?: boolean; glow?: boolean; character?: CharacterId } = {},
): SVGSVGElement {
  const holder = document.createElement('div');
  holder.innerHTML = avatarMarkup(opts.character ?? 'nova', instrument, { ...opts, uid: `a${++counter}` });
  const svg = holder.querySelector('svg');
  if (!svg) throw new Error('avatar kon niet getekend worden');
  return svg;
}
