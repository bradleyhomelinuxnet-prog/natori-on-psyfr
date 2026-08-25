// Faithful re-implementation of the Ophis v12 DAYS-scope engine, per docs/reverse specs.
// Purpose: produce the golden parity dataset for test-bradley.oph.

const MILLIS_PER_DAY = 86400000;
const OPH_PI = 3.14, OPH_PHI = 1.618, OPH_CRV = 5.08, OPH_HEP = 7.01;
const MAX_ROT = 36500;

const NORMAL = [
12, 21, 24, 36, 40, 42, 48, 49, 51, 52, 54, 56, 59, 60, 63, 66, 70, 71, 72, 74, 76, 77, 80, 88,
90, 96, 98, 104, 105, 108, 110, 114, 116, 119, 120, 129, 133, 135, 138, 140, 144, 147, 154, 162,
168, 180, 182, 196, 204, 207, 218, 222, 223, 226, 231, 234, 238, 253, 255, 259, 260, 264, 276,
279, 280, 286, 288, 294, 297, 301, 308, 312, 315, 324, 330, 336, 343, 351, 354, 363, 364, 365,
372, 385, 390, 394, 396, 405, 414, 433, 434, 441, 444, 447, 453, 459, 460, 463, 468, 476, 480,
490, 493, 495, 509, 520, 525, 526, 531, 534, 539, 544, 552, 555, 558, 563, 565, 572, 573, 576,
582, 588, 591, 594, 600, 618, 621, 640, 657, 660, 666, 670, 672, 674, 675, 679, 681, 686, 690,
691, 701, 702, 708, 720, 726, 728, 730, 732, 735, 744, 765, 770, 774, 777, 789, 791, 792, 800,
801, 807, 810, 816, 819, 828, 831, 846, 855, 861, 866, 868, 888, 918, 920, 930, 936, 952, 954,
960, 966, 972, 980, 990, 1000, 1019, 1035, 1040, 1042, 1050, 1052, 1056, 1062, 1071, 1074, 1083,
1089, 1092, 1096, 1104, 1110, 1111, 1116, 1130, 1147, 1152, 1155, 1176, 1177, 1184, 1188, 1190,
1200, 1242, 1253, 1279, 1292, 1300, 1302, 1315, 1318, 1320, 1332, 1335, 1350, 1359, 1372, 1380,
1401, 1416, 1441, 1446, 1449, 1461, 1470, 1485, 1486, 1488, 1513, 1518, 1530, 1534, 1554, 1557,
1559, 1560, 1577, 1585, 1620, 1641, 1574, 1680, 1683, 1701, 1715, 1736, 1738, 1764, 1770, 1776,
1785, 1786, 1794, 1826, 1829, 1836, 1854, 1855, 1860, 1872, 1899, 1904, 1905, 1920, 1932, 1944,
1960, 1972, 1998, 2046, 2047, 2080, 2100, 2103, 2112, 2124, 2133, 2142, 2151, 2170, 2178, 2184,
2191, 2205, 2208, 2232, 2235, 2244, 2269, 2277, 2288, 2292, 2293, 2294, 2295, 2304, 2310, 2322,
2333, 2346, 2352, 2376, 2380, 2388, 2400, 2401, 2415, 2418, 2430, 2447, 2478, 2483, 2484, 2506,
2556, 2558, 2559 ];

const IMPORTANT = [
84, 126, 132, 153, 176, 186, 189, 210, 216, 252, 270, 306, 360, 378, 420, 432, 504, 540, 567, 612, 630,
648, 669, 693, 756, 780, 840, 864, 882, 945, 1008, 1080, 1134, 1224, 1260, 1296, 1344, 1404, 1428, 1440,
1512, 1584, 1656, 1728, 1800, 1890, 1980, 2016, 2070, 2160, 2268, 2448, 2520 ];

const VORTEX = [21.7, 32.6, 43.5, 65.3, 76.2, 87.1, 217.8, 326.7, 435.6, 653.4, 762.3, 871.2];

console.log("SET SIZES: NORMAL="+NORMAL.length+" IMPORTANT="+IMPORTANT.length+" VORTEX="+VORTEX.length+
  " FINAL="+(NORMAL.length+IMPORTANT.length+VORTEX.length));

function rnp(v, p){ const f = Math.pow(10,p); return Math.round((v + Number.EPSILON)*f)/f; }
const r1 = v => rnp(v,1), r2 = v => rnp(v,2);

function oph_round(v){ return Math.round(v); }
function oph_flip(v){
  let s = v + ""; const dot = s.indexOf("."); s = s.replace(".","");
  const rev = s.split("").reverse();
  if (dot > 0) rev.splice(dot, 0, ".");
  return new Number(rev.join("")).valueOf();
}

function getMsrfMatch(x){
  const v = r1(x);
  for (const n of VORTEX) if (Math.abs(n - v) <= 0.1) return {tier:"VORTEX", n, points:2, mult:2.0};
  if ((v + "").endsWith(".5")) return null;
  const rounded = oph_round(v);
  for (const n of IMPORTANT) if (n == rounded) return {tier:"IMPORTANT", n, points:2, mult:2.0};
  for (const n of NORMAL)    if (n == rounded) return {tier:"NORMAL",    n, points:1, mult:1.5};
  return null;
}

// --- operations (compiled as pure JS closures over Y) ---
const OPS = [
 ["X2+oph_round(Y)",            1,   Y => oph_round(Y)],
 ["X2+oph_flip(oph_round(Y))",  1,   Y => oph_flip(oph_round(Y))],
 ["X2+Y/OPH_CRV",               0.5, Y => Y/OPH_CRV],
 ["X1+(Y/2.0)xOPH_PI",          0.5, Y => (Y/2.0)*OPH_PI],
 ["X2+Y/OPH_PHI",               1,   Y => Y/OPH_PHI],
 ["X2+(Y/2.0)xOPH_PHI",         1,   Y => (Y/2.0)*OPH_PHI],
 ["X1+(Y/2.0)xOPH_CRV",         0.5, Y => (Y/2.0)*OPH_CRV],
 ["X2+(Y/2.0)xOPH_PI",          0.5, Y => (Y/2.0)*OPH_PI],
 ["X2+YxOPH_PHI",               1,   Y => Y*OPH_PHI],
 ["X1+YxOPH_PI",                1,   Y => Y*OPH_PI],
 ["X2+(Y/2.0)xOPH_CRV",         0.5, Y => (Y/2.0)*OPH_CRV],
 ["X2+YxOPH_PI",                0.5, Y => Y*OPH_PI],
 ["X1+YxOPH_CRV",               0.5, Y => Y*OPH_CRV],
 ["X2+YxOPH_CRV",               0.5, Y => Y*OPH_CRV],
 ["X1+YxOPH_HEP",               1,   Y => Y*OPH_HEP],
 ["X2+YxOPH_HEP",               1,   Y => Y*OPH_HEP],
];

const X_DATES = ["07/04/2026","08/20/2026","03/09/2027","03/16/2027","07/17/2027"];
function toUtc(mdy){ const [m,d,y] = mdy.split("/").map(Number); return Date.UTC(y, m-1, d); }
function fmt(ms){ const dt = new Date(ms); const p=n=>n<10?"0"+n:""+n;
  return p(dt.getUTCMonth()+1)+"/"+p(dt.getUTCDate())+"/"+dt.getUTCFullYear(); }

const xms = X_DATES.map(toUtc);

console.log("\n--- X-DATE EPOCH MILLIS (UTC midnight) ---");
X_DATES.forEach((d,i)=>console.log(`X${i+1} ${d} = ${xms[i]}`));

// --- pairs & Y ---
const yStructs = [];
for (let i=1;i<xms.length;i++) for (let k=0;k<xms.length;k++) if (k<i){
  const Y = r1((xms[i]-xms[k])/MILLIS_PER_DAY);
  yStructs.push({y_ordinal:yStructs.length, x1:k, x2:i, Y});
}
console.log("\n--- Y-STRUCTS (pair order) ---");
yStructs.forEach(y=>console.log(`y${y.y_ordinal}: X${y.x1+1}(${X_DATES[y.x1]}) -> X${y.x2+1}(${X_DATES[y.x2]})  Y=${y.Y}`));

// --- run operations ---
const zStructs = {};
for (const ys of yStructs){
  for (let oi=0; oi<OPS.length; oi++){
    const [eq, weight, fn] = OPS[oi];
    let zRaw = fn(ys.Y);
    if (zRaw > MAX_ROT) zRaw = MAX_ROT;
    const zMillisRaw = zRaw * MILLIS_PER_DAY;      // BEFORE rounding
    const zValue = r2(zRaw);                        // 2 dp
    const startX1 = eq.startsWith("X1+");
    const baseMs = startX1 ? xms[ys.x1] : xms[ys.x2];
    const zDateMs = baseMs + zMillisRaw;
    const zStart = Math.floor(zDateMs / MILLIS_PER_DAY) * MILLIS_PER_DAY;  // GMT-midnight round-trip
    const rotZ = r1(zValue);                        // 1 dp of the 2-dp value
    const key = String(zStart);
    if (!zStructs[key]) zStructs[key] = {key, zStart, readable:fmt(zStart), ops:[], msrf:[]};
    zStructs[key].ops.push({oi, eq, weight, ys, zValue, rotZ});
    const m = getMsrfMatch(rotZ);
    if (m) zStructs[key].msrf.push({...m, oi, ys, rotZ});
  }
}

// --- score (GTE_V8) ---
for (const k of Object.keys(zStructs)){
  const z = zStructs[k];
  z.ops.sort((a,b)=>{ if(a.weight>b.weight)return -1; if(a.weight<b.weight)return 1;
    if(a.oi===b.oi){ if(a.ys.x1===b.ys.x1){ return a.ys.x2>b.ys.x2?1:(a.ys.x2===b.ys.x2?1:-1);} return a.ys.x1>b.ys.x1?1:-1; }
    return a.oi>b.oi?1:-1; });
  z.msrf.sort((a,b)=>{ if(a.mult>b.mult)return -1; if(a.mult<b.mult)return 1; return a.rotZ>=b.rotZ?-1:1; });
  const opScore = z.ops.reduce((s,o)=>s+o.weight,0);
  const M = z.msrf.reduce((mx,m)=>Math.max(mx,m.mult),1.0);
  let msrfSub = 0, spent = false;
  for (const m of z.msrf){ if (!spent && m.mult === M) { spent = true; } else msrfSub += m.points; }
  const base = opScore + msrfSub;
  z.operation_score = opScore;
  z.operation_hit_count = z.ops.length;
  z.base_score_pre_multiply = base;
  z.score = r2(base * M);
  z.hit_count = z.ops.length + z.msrf.length;
  z.multiplier = M;
}

const allKeys = Object.keys(zStructs);
console.log(`\n--- TOTAL DISTINCT Z-DATES BEFORE FILTERING: ${allKeys.length} (from ${yStructs.length} pairs x 16 ops = ${yStructs.length*16} operation results) ---`);

// --- filter ---
const lastX = xms[xms.length-1];
const NOW = Date.UTC(2026,7,25);              // pinned "now" = 2026-08-25T00:00:00Z
const cutoff = Math.floor(NOW/MILLIS_PER_DAY)*MILLIS_PER_DAY;
const MAXDAYS = 2559;
const kept = allKeys.filter(k=>{
  const z = zStructs[k];
  if (z.zStart < lastX) return false;                                    // before_last_x_date  (ON)
  if (z.zStart === lastX) return false;                                  // on_last_x_date      (ON)
  if (z.zStart < cutoff) return false;                                   // before_current_date (ON)
  // on_current_date OFF
  if (Math.round((z.zStart - lastX)/MILLIS_PER_DAY) > MAXDAYS) return false;  // beyond_max_days (ON, 2559)
  return true;
});
console.log(`--- SURVIVING AFTER FILTERS: ${kept.length} ---`);

// date sort → z_ordinal
const byDate = [...kept].sort((a,b)=> Number(a)-Number(b));
byDate.forEach((k,i)=> zStructs[k].z_ordinal = i);

console.log("\n=== FULL SCORED LIST, SORTED BY DATE (z_ordinal order) ===");
console.log("Z#  | key(ms)       | date       | hits | score | opScore | mult | base | MSRF matches");
for (const k of byDate){
  const z = zStructs[k];
  const ms = z.msrf.map(m=>`${m.rotZ}->${m.n}(${m.tier[0]})`).join(" ");
  console.log(
    `Z${String(z.z_ordinal+1).padStart(2)} | ${String(z.key).padStart(13)} | ${z.readable} | ${String(z.hit_count).padStart(4)} | ${String(z.score).padStart(5)} | ${String(z.operation_score).padStart(7)} | ${String(z.multiplier).padStart(4)} | ${String(z.base_score_pre_multiply).padStart(4)} | ${ms}`);
}

// MSRF sort (the file's z_date_sort_type)
function msrfSub(z){ const M=z.multiplier; let s=0,sp=false; for(const m of z.msrf){ if(!sp&&m.mult===M){sp=true;} else s+=m.points;} return s; }
function msrfNumSum(z){ return z.msrf.reduce((s,m)=>s+m.n,0); }
const bySort = [...kept].sort((a,b)=>{
  const za=zStructs[a], zb=zStructs[b];
  const sa=msrfSub(za), sb=msrfSub(zb), na=msrfNumSum(za), nb=msrfNumSum(zb);
  let type="MSRF", order="DESC";
  if (sa===sb && na===nb) { type="DATE"; }
  let A,B;
  if (type==="DATE"){ A=za.zStart; B=zb.zStart; order="ASC"; }
  else { if (sa===sb){A=na;B=nb;} else {A=sa;B=sb;} }
  const t = (A>B ? -1 : 1);
  return t * (order==="DESC"?1:-1);
});
console.log("\n=== processed_z_dates, SORT_TYPE__MSRF (the file's saved sort) ===");
bySort.forEach((k,i)=>{ const z=zStructs[k];
  console.log(`${String(i+1).padStart(2)}. Z${z.z_ordinal+1} ${z.readable} score=${z.score} hits=${z.hit_count} msrfSub=${msrfSub(z)} msrfNumSum=${msrfNumSum(z)}`); });

// Score sort for reference
const byScore = [...kept].sort((a,b)=>{ const za=zStructs[a],zb=zStructs[b];
  if (za.score!==zb.score) return zb.score-za.score;
  if (za.hit_count!==zb.hit_count) return zb.hit_count-za.hit_count;
  return za.zStart-zb.zStart; });
console.log("\n=== top by SCORE (reference) ===");
byScore.slice(0,10).forEach((k,i)=>{const z=zStructs[k];console.log(`${i+1}. ${z.readable} score=${z.score} hits=${z.hit_count}`);});

// --- per-operation Z table for the single pair y0 (X1->X2) ---
console.log("\n=== PER-OPERATION Z VALUES FOR Y=47 (pair X1 07/04/2026 -> X2 08/20/2026) ===");
console.log("op# | equation                    | w   | zRaw(full)        | z_value(2dp) | rot_z(1dp) | msrf      | Z-Date");
for (let oi=0; oi<OPS.length; oi++){
  const [eq,w,fn]=OPS[oi]; const Y=47;
  const zRaw=fn(Y); const zValue=r2(zRaw); const rotZ=r1(zValue);
  const base = eq.startsWith("X1+")?xms[0]:xms[1];
  const zStart=Math.floor((base+zRaw*MILLIS_PER_DAY)/MILLIS_PER_DAY)*MILLIS_PER_DAY;
  const m=getMsrfMatch(rotZ);
  console.log(`${String(oi).padStart(3)} | ${eq.padEnd(27)} | ${String(w).padEnd(3)} | ${String(zRaw).padEnd(17)} | ${String(zValue).padEnd(12)} | ${String(rotZ).padEnd(10)} | ${(m?m.tier+" "+m.n:"none").padEnd(9)} | ${fmt(zStart)}`);
}

// --- oph_flip table ---
console.log("\n=== oph_flip PARITY TABLE ===");
[123,7,0,100,1000,120,12.5,120.5,10.25,0.5,0.1,3.14,46,10,-12,-0.5,1e21,47,-35].forEach(v=>
  console.log(`oph_flip(${v}) = ${oph_flip(v)}`));

// --- getMsrfMatch spot checks ---
console.log("\n=== getMsrfMatch PARITY TABLE ===");
[12.5,12.4,21.6,21.7,21.8,21.4,21.0,76.1,76.2,76.3,76.4,43.5,32.5,32.6,217.9,84,83.6,83.5,36500,0,2559,1574,19,235].forEach(v=>{
  const m=getMsrfMatch(v); console.log(`getMsrfMatch(${v}) = ${m?m.tier+" "+m.n+" pts="+m.points+" mult="+m.mult:"null"}`);});

// --- self check: every set member matches its own tier ---
let bad=[];
for (const n of NORMAL){const m=getMsrfMatch(n); if(!m||m.tier!=="NORMAL") bad.push(["NORMAL",n,m&&m.tier]);}
for (const n of IMPORTANT){const m=getMsrfMatch(n); if(!m||m.tier!=="IMPORTANT") bad.push(["IMPORTANT",n,m&&m.tier]);}
for (const n of VORTEX){const m=getMsrfMatch(n); if(!m||m.tier!=="VORTEX") bad.push(["VORTEX",n,m&&m.tier]);}
console.log("\n=== SELF-CHECK (every filter number matches its own tier) ===");
console.log(bad.length===0 ? "PASS — all 390 numbers round-trip to their own tier" : "FAIL: "+JSON.stringify(bad));

// vortex window asymmetry
console.log("\n=== VORTEX ±0.1 WINDOW (exhaustive over 1-dp probes) ===");
for (const v of VORTEX){
  const hits=[];
  for (let d=-3; d<=3; d++){ const probe=r1(v + d/10); if (Math.abs(v-probe)<=0.1) hits.push(probe); }
  console.log(`${v}: matches ${hits.join(", ")}`);
}
