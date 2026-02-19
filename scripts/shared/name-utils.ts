/**
 * Shared utilities for extracting honoree names from highway names.
 */

const RANK_PREFIXES = [
  'Command Sergeant Major ', 'Chief Special Warfare Operator ',
  'Chief Warrant Officer ', 'Chief Petty Officer ',
  'Master Sergeant ', 'First Sergeant ', 'Sergeant Major ',
  'Staff Sergeant ', 'Technical Sergeant ', 'Senior Airman ',
  'Lance Corporal ', 'Marine Lance Corporal ',
  'Warrant Officer ', 'Petty Officer ',
  'Staff Sgt. ', 'Tech Sgt. ', 'Master Sgt. ',
  'Specialist 5 ', 'Specialist ',
  'Auxiliary Lieutenant ',
  'Sergeant ', 'Corporal ', 'Captain ', 'Lieutenant ', 'Colonel ',
  'Major ', 'Private ', 'Detective ', 'Trooper ', 'Officer ',
  'Sheriff ', 'Deputy ', 'Firefighter ', 'Chief ',
  'SPC ', 'PFC ', 'Sgt. ', 'Sgt ', 'Cpl. ', 'Cpl ',
  'Lt. ', 'Col. ', 'Pvt ', 'Dr. ',
  'Marine ', 'Army ', 'Navy ', 'Air Force ', 'Airman ',
  'Corpsman ', 'SEAL ',
];

const HIGHWAY_SUFFIXES = /\s+(Memorial\s+)?(Highway|Bridge|Freeway|Parkway|Drive|Boulevard|Road|Way|Trail|Overpass|Interchange|Bypass|Causeway|Expressway|Turnpike|Avenue|Street|Lane|Route|Corridor|Section|Segment|Stretch|Portion).*$/i;

export function extractHonoreeName(highwayName: string): string {
  let name = highwayName
    .replace(HIGHWAY_SUFFIXES, '')
    .replace(/\s+Memorial$/i, '')
    .trim();

  for (const prefix of RANK_PREFIXES) {
    if (name.startsWith(prefix)) {
      name = name.substring(prefix.length);
      break;
    }
  }

  name = name.replace(/,\s*WWII.*$/i, '');
  name = name.replace(/\s+Jr\.?$/i, ' Jr.');
  name = name.replace(/\s+USAF$/i, '');
  name = name.replace(/\s+USMC$/i, '');
  name = name.replace(/\s+USN$/i, '');

  return name.trim();
}

/**
 * Detect involvement categories from name and biography text.
 */
export function detectInvolvement(name: string, bio: string): {
  involvedInMilitary: boolean;
  involvedInPolitics: boolean;
  involvedInLawEnforcement: boolean;
  involvedInFireService: boolean;
  involvedInSports: boolean;
  involvedInMusic: boolean;
} {
  const text = `${name} ${bio}`.toLowerCase();

  return {
    involvedInMilitary: /\b(army|navy|marine|air force|military|soldier|veteran|sergeant|corporal|private first class|captain|lieutenant|colonel|general|enlisted|deployed|regiment|battalion|division|infantry|cavalry|seal|special forces|airborne|war|combat|medal of honor|purple heart|bronze star|killed in action|kia|afghanistan|iraq|vietnam|wwii|ww2|national guard|coast guard)\b/.test(text),
    involvedInPolitics: /\b(governor|senator|representative|congressman|congresswoman|legislator|state house|state senate|politician|elected|legislative|speaker|commissioner|secretary of state|mayor|council|president|assemblyman|assemblywoman|alderman)\b/.test(text),
    involvedInLawEnforcement: /\b(police|sheriff|deputy|trooper|officer|state police|corrections|law enforcement|patrol|marshal|constable|detective|highway patrol|chp)\b/.test(text),
    involvedInFireService: /\b(firefighter|fire chief|fire department|fire rescue|fireman|fire station)\b/.test(text),
    involvedInSports: /\b(athlete|football|baseball|basketball|soccer|hockey|olympic|sports|nfl|nba|mlb|nhl|coach|championship|varsity)\b/.test(text),
    involvedInMusic: /\b(musician|singer|songwriter|band|orchestra|music|composer|concert)\b/.test(text),
  };
}

export function parseBooleanField(value: string | undefined): boolean {
  if (!value) return false;
  const lower = value.toLowerCase().trim();
  return lower === 'yes' || lower === 'true' || lower === '1';
}
