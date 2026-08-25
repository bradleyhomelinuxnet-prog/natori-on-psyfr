// The Breshears cycle lattice + calendar epochs.
// Extracted verbatim from the reference PSYFR1 build by tools/extract-data.mjs.
// This file is DATA. Edit it freely — nothing else needs to change.

/** Annus Mundi year = astronomical year + AM_OFFSET. */
export const AM_OFFSET = 3894;
/** Long-Count year = astronomical year + LC_OFFSET. */
export const LC_OFFSET = 3112;
/** Years from the Nemesis Cataclysm to astro year 0. */
export const CAT_OFFSET = 5238;

/** Phoenix / Sky Dragon cycle, years. A node lands where mod(year,138) === PHOENIX_PHASE. */
export const PHOENIX_PERIOD = 138;
export const PHOENIX_PHASE = 108;

/** Nemesis X: 792-yr orbit with a 60-yr inner arc, phased from astro year 462. */
export const NEMESIS_PERIOD = 792;
export const NEMESIS_INNER = 60;
export const NEMESIS_PHASE = 462;

/** Anunnaki NER: 600-yr period phased from astro year 162. */
export const NER_PERIOD = 600;
export const NER_PHASE = 162;

/** Metonic cycle, years. */
export const METONIC = 19;

/** Mean synodic month, days, and a reference new moon JD. */
export const SYNODIC = 29.530588853;
export const NEWMOON_J2000 = 2451550.1;
/** Lunation-number epoch (Brown lunation 1). */
export const LUNATION_EPOCH_JD = 2423436.40347;

/** Mayan baktun boundaries, astronomical years. */
export const MAY_NODES = [-3112,-2712,-2312,-1912,-1512,-1112,-712,-318,76,470,864,1258,1652,2046];
