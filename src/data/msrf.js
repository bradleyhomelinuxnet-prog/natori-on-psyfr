// MSRF resonance number set.
// Extracted verbatim from the reference PSYFR1 build by tools/extract-data.mjs.
// Ophis NORMAL+IMPORTANT key members, plus 19. A projected date scores an MSRF hit when either the interval Y or the day-offset appears here.
// This file is DATA. Edit it freely — nothing else needs to change.

export const MSRF_NUMBERS = [19,12,21,24,36,40,42,48,49,54,56,60,63,66,72,76,84,90,96,108,114,119,120,126,132,
 133,135,138,140,144,147,153,162,168,180,189,207,216,222,234,252,270,276,288,297,306,315,324,330,360,
 378,414,432,441,459,468,504,540,552,567,576,594,600,612,648,666,693,720,756,792,810,828,831,864,882,
 918,936,954,972,990,1080,1134,1138,1260,1296,1380,1656];

export const MSRF = new Set(MSRF_NUMBERS);
