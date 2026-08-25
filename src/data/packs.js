// Operation packs — the primary mod surface.
// Extracted verbatim from the reference PSYFR1 build by tools/extract-data.mjs.
// Add a pack by adding a key here. Nothing else in the app needs to change.
// This file is DATA. Edit it freely — nothing else needs to change.

export const DEFAULT_OPS = [
 "X2+oph_round(Y)","X2+oph_flip(oph_round(Y))","X1+oph_flip(oph_round(Y))",
 "X2+Y/OPH_PHI","X1+Y*OPH_PHI","X1+(Y/2)*OPH_PI","X2+Y/OPH_CRV",
 "X2+Y*138/100","X1+Y*19/10","X2+oph_round(Y/138)*138","X1+oph_round(Y/19)*19",
 "X2+Y+138","X1+Y+19","X2+oph_flip(Y)+19","X1+Y*360/365.2422",
 "X2+Y*792/600","X1+oph_round(Y*OPH_PHI/OPH_PI)","X2+oph_round(Y/OPH_PHI/OPH_PHI)",
 "X1+oph_flip(oph_round(Y/OPH_PHI))"
];

export const PACKS = {
  "Default 19":DEFAULT_OPS,
  "138 Pack":[
    "X2+oph_round(Y/138)*138","X1+oph_round(Y/138)*138","X2+Y+138","X1+Y-138",
    "X2+Y*138/100","X1+Y*100/138","X2+oph_flip(oph_round(Y))","X1+138*oph_round(Y/138)",
    "X2+Y+138*2","X1+Y+138*3","X2+oph_round(Y/414)*414","X1+oph_round(Y/552)*552"],
  "19 Metonic Pack":[
    "X1+oph_round(Y/19)*19","X2+oph_round(Y/19)*19","X2+Y+19","X1+Y-19",
    "X2+Y*19/10","X1+Y*235/19","X2+oph_flip(Y)+19","X1+19*oph_round(Y/19)",
    "X2+Y+19*19","X1+oph_round(Y/235)*235","X2+oph_flip(oph_round(Y/19))"],
  "Phoenix Lattice Pack":[
    "X1+oph_round(Y/138)*138","X2+oph_round(Y/792)*792","X1+oph_round(Y/600)*600",
    "X2+oph_round(Y/360)*360","X1+Y*360/365.2422","X2+Y+138","X1+Y+792","X2+Y+600",
    "X1+oph_round(Y/216)*216","X2+oph_round(Y/144)*144"],
  "Golden Pack":[
    "X2+Y/OPH_PHI","X1+Y*OPH_PHI","X1+(Y/2)*OPH_PI","X2+Y/OPH_CRV","X1+(Y/2)*OPH_CRV",
    "X2+oph_round(Y*OPH_PHI/OPH_PI)","X1+oph_round(Y/OPH_PHI/OPH_PHI)",
    "X2+oph_flip(oph_round(Y/OPH_PHI))","X1+Y*OPH_PI/OPH_PHI","X2+oph_round(Y*OPH_PHI)"]
};

export const DEFAULT_PACK_NAME = 'Default 19';
