// Eastern Front, June 1941 to December 1942: a monthly model for the Halifax scenario.
// Each month the model carries forward a few state variables (men, tanks and aircraft on each side; the German railheads and
// supply reach on each axis; the Soviet production base) and moves the front on three axes by a handful of mechanisms:
// pace from the force ratio, a supply reach that caps it, season, pockets, attrition, production and mobilization.
// Decisions are levers (where the Germans attack and when, how the Soviets stand). The constants are calibrated so that the
// real settings reproduce the real monthly front and the real losses of 1941 and 1942; the uncertain mechanisms are
// multipliers around that calibration, drawn from ranges in a Monte Carlo. Men in thousands; equipment in units; km.
(function (root) {
'use strict';

const MONTHS = ['1941-06', '1941-07', '1941-08', '1941-09', '1941-10', '1941-11', '1941-12', '1942-01', '1942-02', '1942-03',
  '1942-04', '1942-05', '1942-06', '1942-07', '1942-08', '1942-09', '1942-10', '1942-11', '1942-12'];
const AXES = ['N', 'C', 'S'];
const MILES = {   // km from the frontier of June 1941 along each axis (the model's own scale)
  N: [['Daugavpils', 300], ['Pskov', 520], ['Luga', 720], ['Shlisselburg', 850], ['Tikhvin', 950]],
  C: [['Minsk', 330], ['Smolensk', 640], ['Vyazma', 870], ['Moscow', 1080]],
  S: [['Kiev', 450], ['Kharkov', 750], ['Rostov', 1000], ['Voronezh', 1150], ['Stalingrad', 1500], ['Astrakhan', 1750]],
};
const CAUC = [['Maikop', 300], ['Mozdok', 540], ['Grozny', 650], ['Baku', 1000]];   // the Caucasus branch, km beyond Rostov

// ------------------------------------------------------------------ calibrated constants (the real war)
const K = {
  paceK: { N: 1170, C: 1348, S: 424 },    // km a month the spearheads make in open season at even force with supply to spare
  railRate: 240, lorryRange: 310, overrun: 120,
  // German advance season: weather and the exhaustion that came with it (1 = summer)
  season: { '1941-10': 0.537, '1941-11': 0.127, '1941-12': 0.03, '1942-01': 0.03, '1942-02': 0.03, '1942-03': 0.03, '1942-04': 0.1, '1942-05': 0.60,
            '1942-10': 0.10, '1942-11': 0.2, '1942-12': 0.05 },
  pockets: 0.495,                          // prisoners (k) per thousand Soviet men, per 400 km of weighted advance, standing forward
  gCas: 142.6, sCas: 284.3,                   // casualties a month (k) per unit of the enemy's combat power at full intensity
  winterRegain: 15.0,                       // km a month the Soviet winter offensive regains on the Moscow axis at even strength
  sTank: { 1941: 0.226, 1942: 0.102 }, gTank: 0.148, sAir: { 1941: 0.200, 1942: 0.297 }, gAir: 0.124,
  stalX: 1.0, uranusX: 0.85,             // Stalingrad falls at 1.15 x the real pressure; Uranus breaks through at 0.85 x the real reserve ratio
  // share of pre-war production capacity lost with the territory in reality, by month (evacuation recovers part of it)
  lostReal: [0.05, 0.3, 0.42, 0.5, 0.55, 0.58, 0.6, 0.6, 0.6, 0.6, 0.58, 0.56, 0.55, 0.6, 0.65, 0.66, 0.66, 0.66, 0.64],
  lostW: 0.5,
  sEarly: 0.612, nLuga: 0.900,              // the south's slow start; the Luga Line in July and August
  seasonS: { '1941-10': 0.334, '1941-11': 0.662 },   // the south's mud came later and lighter
  capN: 950,                              // Leningrad is invested, not stormed: the northern axis ends at Tikhvin
  sCas42X: 2.600, gCas42X: 0.632,            // 1942: the Red Army attacked for much of the year, at its own cost
  caucShare: 0.75,                        // share of the southern supply reach that the Caucasus branch can use
  mosDef41: { '1941-08': 0.25, '1941-09': 0.250, '1941-10': 0.119, '1941-11': 0.566 },   // Aug-Sep: the Reserve Front on the Rzhev-Vyazma line and Timoshenko's counter-attacks (not calibrated: the real Centre did not attack then)   // the Moscow defence zone and the reserve armies forming before the capital, by calendar month
  offFront: 0.26, mozhaisk: 930, offFront41: 0.22,   // the Mozhaisk line, km; the pace beyond it relative to open country                         // a set-piece offensive against a continuous front moves at this share of the open pace
  railLag42: 0.881, railRate42X: 1.003,       // the railways of 1942: the Dnieper bridges rebuilt and the Donbas network in use
  lorryMud: 0.312,                          // lorry reach in mud and snow, relative to summer
  railLag: 0.800,                          // the railheads follow at most this share of the front's depth in the first year                             // production falls by this share of the difference from the real territorial loss
};
const PROD = { sTanks41: 1100, sTanks42: 2050, sAir41: 1300, sAir42: 2100, sMen41: 850, sMen42: 415,
               gTanksE41: 160, gTanksE42: 300, gAir41: 350, gAir42: 450, gRepl41: 80, gRepl42: 95 };
const START = { gMen: 3300, gTanks: 3600, gAir: 2800, sMen: 2900, sTanks: 22600, sAir: 20000 };

// ------------------------------------------------------------------ levers
const LEVERS_REAL = {
  label: 'Reality', start: '1941-06-22', gMen: 3300, gTanks: 3600, gAirX: 1.0, lorries: 1.0, fuel: 1.0, railX: 1.0,
  sMen: 2900, alert: 0, lendLease: true, farEastHeld: 0, gProdX: 1.0, gReplX: 1.0, sProdX: 1.0,
  kievDiversion: true, moscowKm: 1080, moscow42: false, moscowDef: 0.65, blueStart: '1942-07', supplyLimit: true,
  stavka41: 'south', stavka42: 'moscow',     // where the Stavka keeps its weight: 1941 the Kiev group of fronts (as in reality), 1942 before Moscow (as in reality)
  sovDepth: false, kievWithdraw: false, winterLimited: false, noKharkov: false,
};
const LEVERS_SCEN = Object.assign({}, LEVERS_REAL, {
  label: 'Scenario', start: '1941-06-01', gMen: 3900, gTanks: 3800, gAirX: 1.5, lorries: 1.1, fuel: 1.05, railX: 1.0,   // net of what the extra divisions and aircraft consume
  sMen: 3700, alert: 1, lendLease: false, farEastHeld: 0.5, gProdX: 1.3, gReplX: 1.25, sProdX: 0.96,
  kievDiversion: true, moscow42: true, moscowDef: 0.65, blueStart: 'after Moscow',
});

// ------------------------------------------------------------------ uncertain mechanisms, [low, high]: multipliers around the calibration
// each acts only on departures from the real war, so the real settings always return the calibrated real run
const PRIORS = {
  mudOct: [0.7, 1.3], mudNov: [0.7, 1.3], thaw: [0.7, 1.3],   // weather: how much of October and November 1941 and of the 1942 spring was lost to mud (1 = as it was)
  reserveE: [0.5, 1.0],       // how much a shift of Soviet weight between axes tells on the pace and on a set-piece attack there
  alpha: [0.1, 0.5],
  alphaSet: [0.5, 0.9],       // ... and in a set-piece attack on a held front (Moscow beyond the Mozhaisk line; the 1942 attack), around 0.7        // pace ~ (force ratio)^alpha, around the calibrated 0.3: in open country the spearheads move as supply allows
  mosRes: [0.6, 1.4],         // the Soviet reserve armies before Moscow respond to Soviet strength more or less than calibrated
  railE: [0.7, 1.3],          // railhead rate ~ (rail lever)^railE
  lorryE: [0.7, 1.3],         // lorry reach ~ (lorries and fuel against consumption)^lorryE
  pocketE: [0.5, 1.5],        // pockets ~ (German sealing, Soviet posture, the alert's leakage)^pocketE
  exchD: [-0.4, 0.4],         // Soviet losses respond to German power more or less than calibrated
  gExchD: [-0.4, 0.4],        // German losses respond to Soviet power more or less than calibrated
  alertPace: [0.6, 0.85], alertLeak: [1.15, 1.6], alertAir: [0.4, 0.7], alertSummer: [0.8, 1.0],
  railTime: [0.3, 0.7],       // share of the earlier start's extra weeks that the railhead conversion can use   // the alert: the first two months, and the depth behind them in August and September
  winterD: [-0.5, 0.6],       // winter regain responds to the strength ratio more or less than calibrated
  defX: [0.8, 1.2],         // strength of the Moscow defences, relative to the slider
  stalX: [0.85, 1.35],        // pressure needed at Stalingrad, relative to the real; below 1 the city would have fallen even in reality          // pressure needed at Stalingrad, relative to the real (which did not suffice)
  uranusX: [0.75, 1.3],      // reserve ratio needed for the November counter-offensive, relative to the real (which sufficed)
  culm: [1.0, 2.0],
  hub: [0.5, 0.8],            // Moscow as the railway hub: the share of the Stavka's capacity to move reserves between theatres that survives its fall (eleven trunk lines met there; the Volga bypass lines were fewer and slower); half the loss made good over a year
  tikhvin: [0.8, 1.0],        // Soviet strength ratio, relative to the real, needed to retake Tikhvin in December
  siege: [3, 5],              // months without the Ladoga route before Leningrad capitulates
  keep: [0.4, 1.0],           // share of an earlier Smolensk that an earlier Typhoon keeps (the Centre's recovery takes the rest)
  kievDelay: [2, 4],          // weeks the Kiev diversion delays Typhoon (the Centre needed the rest of the time to recover anyway)
  flankCost: [0.15, 0.35],    // without Kiev: share of the Centre's strength held back to cover the uncovered southern flank           // months of effort before an offensive on Moscow is spent
};
const mid = r => (r[0] + r[1]) / 2;
function sampleParams(rng) { const p = {}; for (const [k, v] of Object.entries(PRIORS)) p[k] = rng ? v[0] + (v[1] - v[0]) * rng() : mid(v); return p; }

// ------------------------------------------------------------------ helpers
const comp = (men, tanks, air, w) => Math.pow(men, w[0]) * Math.pow(tanks, w[1]) * Math.pow(air, w[2]);
const GWT = [0.5, 0.25, 0.25], SWT = [0.6, 0.2, 0.2];
const monthDays = m => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
const dateIn = (m, frac) => `${m}-${String(Math.max(1, Math.min(monthDays(m), Math.round(frac * monthDays(m))))).padStart(2, '0')}`;
let REF = null;   // the real run's monthly trajectory and end-state references, set once by setRef()
const dev = (v, ref, e) => (REF && ref > 0) ? Math.pow(v / ref, e) : 1;

// ------------------------------------------------------------------ the model
function run(L, p) {
  const o = { levers: L.label, months: [] };
  let G = { men: L.gMen, tanks: L.gTanks, air: START.gAir * L.gAirX };
  let S = { men: L.sMen, tanks: START.sTanks, air: START.sAir };
  const depth = { N: 0, C: 0, S: 0 }, rail = { N: 0, C: 0, S: 0 }, reach = { N: 0, C: 0, S: 0 };
  const ev = {};
  const tot = { 1941: { sCas: 0, sIrr: 0, pris: 0, sTl: 0, sAl: 0, gCas: 0, gTl: 0, gAl: 0 }, 1942: { sCas: 0, sIrr: 0, pris: 0, sTl: 0, sAl: 0, gCas: 0, gTl: 0, gAl: 0 } };
  // supply: lorries and fuel extend the reach; more divisions and aircraft eat into it
  const lorryIdx = Math.pow(Math.pow(L.lorries, 0.5) * Math.pow(L.fuel, 0.3) , p.lorryE);   // the reach is set by railheads and roads; a division brings its own transport, so more divisions do not shorten it
  const railIdx = Math.pow(L.railX, p.railE);
  const startFrac = L.start === '1941-06-01' ? 1.0 : 0.3;
  const hubAt = mm => { if (!ev.Moscow || ev.Moscow > mm + '-31') return 1; const since = (day(mm + '-15') - day(ev.Moscow)) / 30.4; return 1 - (1 - p.hub) * (1 - 0.5 * Math.min(1, Math.max(0, since) / 12)); };
  let typhoonDay = NaN, siegeMonths = 0, effort = 0, moscowOn = false, blueOn = false, stalPressure = 0, cauc = 0, winterOn = false;
  for (let t = 0; t < MONTHS.length; t++) {
    const m = MONTHS[t], yr = +m.slice(0, 4), Y = tot[yr];
    const frac = t === 0 ? startFrac : 1;
    const wx = m === '1941-10' ? p.mudOct : m === '1941-11' ? p.mudNov : m === '1942-04' ? p.thaw : 1;   // weather draw: more mud means a smaller season factor
    const season = K.season[m] != null ? Math.min(1, K.season[m] * (wx > 1 ? 1 / wx : (2 - wx))) : 1;
    const mStart = day(m + '-01'), mEnd = mStart + monthDays(m);
    const seasonOf = a => (a === 'S' && K.seasonS[m] != null) ? K.seasonS[m] : season;
    const sMen0 = S.men;
    const gP = comp(G.men / 3300, G.tanks / 3600, G.air / 2800, GWT);
    const sP = comp(S.men / 2900, Math.max(0.05, S.tanks / 22600), Math.max(0.05, S.air / 20000), SWT);
    const FR = gP / sP;
    // the Stavka's weight between the axes, relative to reality (1941: the south; 1942: Moscow); a lighter axis is easier to attack
    const real41 = { N: 0.2, C: 0.4, S: 0.4 }, real42 = { N: 0.15, C: 0.5, S: 0.35 };
    const alloc41 = { south: real41, centre: { N: 0.2, C: 0.5, S: 0.3 }, balanced: { N: 0.25, C: 0.4, S: 0.35 } }[L.stavka41] || real41;
    const alloc42 = { moscow: real42, south: { N: 0.15, C: 0.35, S: 0.5 }, balanced: { N: 0.15, C: 0.42, S: 0.43 } }[L.stavka42] || real42;
    const hubF = hubAt(m);   // Moscow's fall slows the movement of reserves to the other theatres
    const wgt = a => (yr === 1941 ? alloc41[a] / real41[a] : alloc42[a] / real42[a]) * (a !== 'C' ? hubF : 1);
    // ---- what each side is doing this month
    let on = { N: 0, C: 0, S: 0 }, intensity = 1, sovOff = false, prep = 1;
    if (yr === 1941) {
      on = { N: 0.9, C: 1.0, S: 0.85 };
      // after Smolensk the Centre recovers (Yelnya, replacements, stocks) and, if the Kiev diversion is on, sends its panzers
      // south; Typhoon opens at the real date, brought forward by the share of an earlier Smolensk that recovery allows
      if (m >= '1941-08' && m <= '1941-10') {
        const smol = ev.Smolensk ? day(ev.Smolensk) : mEnd;
        const ty = (REF ? REF.typhoon - (REF.smolensk - smol) * p.keep : day('1941-10-02')) + (L.kievDiversion ? 0 : -7 * p.kievDelay);
        on.C = Math.max(0, Math.min(1, (mEnd - ty) / (mEnd - mStart)));
        if (m === '1941-09') on.S = L.kievDiversion ? 1.25 : 0.9;                     // Kiev: the panzers of the Centre help in the south
        if (m === '1941-08' && on.C > 0.9) on.C = 0.9;
        typhoonDay = ty;
      }
      if (m >= '1941-10') on.N = m === '1941-10' ? 0.5 : 0.3;
      if (m === '1941-12') { on = { N: 0, C: 0, S: 0 }; }
    }
    if (m >= '1941-12' && m <= '1942-03') { winterOn = true; sovOff = !L.winterLimited || m <= '1942-01'; intensity = sovOff ? 1 : 0.5; }
    if (m === '1942-04') intensity = 0.35;
    if (m === '1942-05') { intensity = 0.8; sovOff = !L.noKharkov; }
    if (yr === 1942 && m >= '1942-05') {
      if (L.moscow42 && !moscowOn && !ev.Moscow && !ev.MoscowSpent && depth.C < L.moscowKm) moscowOn = true;
      if (moscowOn) { on.C = K.offFront * (m === '1942-05' ? 0.35 : 1); prep = Math.max(0.1, 1 - L.moscowDef * p.defX); intensity = 1; if (m !== '1942-05') sovOff = false; }   // from 20 May; a set-piece attack on a held front
      const blueGo = L.blueStart === 'after Moscow' ? (m >= '1942-06' && ((!!(ev.Moscow || ev.MoscowSpent) && !moscowOn) || m >= '1942-07')) : (m >= L.blueStart && !moscowOn);
      if (blueGo && m <= '1942-11') { blueOn = true; on.S = 1; intensity = 1; }
    }
    // ---- supply reach, then the advance on each axis
    const adv = { N: 0, C: 0, S: 0 };
    let advW = 0;
    for (const a of AXES) {
      const railFrac = t === 0 ? 0.3 + (frac - 0.3) * p.railTime : frac;
      rail[a] = Math.min(depth[a] * (yr === 1941 ? K.railLag : K.railLag42), rail[a] + K.railRate * (yr === 1941 ? 1 : K.railRate42X) * railIdx * (season < 0.5 ? 0.5 : 1) * railFrac);
      reach[a] = rail[a] + K.lorryRange * lorryIdx * (season < 0.3 ? K.lorryMud : 1);   // lorries manage far less in mud and snow
      const room = L.supplyLimit ? Math.max(0, reach[a] + K.overrun - depth[a]) : 1e9;
      const alertF = !L.alert ? 1 : t <= 1 ? 1 - L.alert * (1 - p.alertPace) : t <= 4 ? 1 - L.alert * (1 - p.alertSummer) : 1;
      // the Moscow defence zone and the reserve armies before the capital: by calendar, and stronger with more Soviet men in the field
      const prep41 = (a === 'C' && yr === 1941 && K.mosDef41[m] != null && depth.C > 700) ? Math.max(0.1, 1 - K.mosDef41[m] * dev(S.men, REF && REF.sMen[t], p.mosRes)) : 1;
      const flank = (a === 'C' && yr === 1941 && !L.kievDiversion && m <= '1941-10') ? 1 - p.flankCost : 1;   // Guderian covering the Southwestern Front
      // beyond the Mozhaisk line the drive on Moscow is a set-piece attack on a held front, as in 1942
      const setPiece = (a === 'C' && yr === 1941 && depth.C >= K.mozhaisk) ? K.offFront41 : 1;
      const isSet = prep < 1 || setPiece < 1;
      const local = Math.pow(wgt(a), -p.reserveE * (isSet ? 1 : 0.4));   // reserves tell most against a set-piece attack
      // in open country the spearheads move as supply allows (force ratio to a small power); against a held front force decides
      const fPow = isSet ? Math.pow(FR, 0.7) * dev(FR, REF && REF.FR[t], p.alphaSet - 0.7) : Math.pow(FR, 0.3) * dev(FR, REF && REF.FR[t], p.alpha - 0.3);
      let km = K.paceK[a] * on[a] * fPow * seasonOf(a) * alertF * frac * local * (a === 'C' ? prep * prep41 * flank * setPiece : 1);
      if (yr === 1941 && a === 'S' && t <= 3) km *= K.sEarly;                 // Brody-Dubno, Uman and the Dnieper
      if (a === 'N') km = Math.min(km, Math.max(0, (m >= '1941-10' ? K.capN : 850) - depth.N));   // Leningrad invested in September; Tikhvin in the autumn
      if (a === 'S' && blueOn) km = Math.min(km, Math.max(0, 1500 - depth.S));
      if (yr === 1941 && a === 'N' && t >= 1 && t <= 2) km *= K.nLuga;          // the Luga Line
      if (a === 'S' && blueOn && depth.S >= 1500) km = 0;                    // the Volga reached: the fight is for the city
      km = Math.max(0, Math.min(km, room));
      adv[a] = km; depth[a] += km; advW += km * ({ N: 0.25, C: 0.4, S: 0.35 })[a];
    }
    if (blueOn && depth.S > 1000) cauc = Math.max(cauc, Math.min(cauc + adv.S * 0.9 + (depth.S >= 1500 ? 0.5 * K.paceK.S * seasonOf('S') * Math.pow(FR, 0.3) * dev(FR, REF && REF.FR[t], p.alpha - 0.3) : 0), Math.max(0, (reach.S + K.overrun - 1000) * K.caucShare)));
    // ---- Soviet winter counter-offensive: ground regained on the Moscow axis
    let regain = 0;
    if (winterOn && m >= '1941-12' && depth.N > 850 && !ev.TikhvinRetaken && !ev.Leningrad) {   // Tikhvin: retaken if the Soviets are strong enough; else Leningrad starves
      if (sovOff && (sP / gP) >= (REF ? REF.R[t] : sP / gP) * p.tikhvin) { depth.N = 850; rail.N = Math.min(rail.N, 850); ev.TikhvinRetaken = m + '-09'; }
    }
    if (depth.N > 850 && !ev.Leningrad) { siegeMonths += 1; if (siegeMonths >= p.siege) { ev.Leningrad = m + '-15'; } }
    if (winterOn && sovOff && m <= '1942-03') { regain = K.winterRegain * Math.pow(sP / gP, 1.2) * dev(sP / gP, REF && REF.R[t], p.winterD) * (m === '1941-12' ? 1.4 : 1) * hubF /* the reserve armies formed around Moscow */; depth.C = Math.max(ev.Moscow ? L.moscowKm : 0, depth.C - regain); rail.C = Math.min(rail.C, depth.C); }
    // ---- pockets
    const forward = yr === 1941 ? 1 : 0.75;
    const leak = (L.alert && t <= 1) ? 1 + L.alert * (p.alertLeak - 1) : 1;
    const sealLever = Math.pow(L.gMen / 3300, 0.4) * Math.pow(L.gAirX, 0.15);                 // the premise's extra men and aircraft
    const sealWear = Math.pow((G.men / 3300) / (L.gMen / 3300), 0.4);                          // the attrition since, as in reality
    const advWw = AXES.reduce((acc, a) => acc + adv[a] * ({ N: 0.25, C: 0.4, S: 0.35 })[a] * wgt(a), 0);   // the men standing on each axis
    let pris = K.pockets * S.men * (advWw / 400) * forward * sealWear * Math.pow(sealLever * (L.sovDepth && t <= 2 ? 0.7 : 1) / leak, p.pocketE);
    if (m === '1941-09' && L.kievWithdraw) pris *= 0.45;
    if (m === '1941-09' && !L.kievDiversion) pris *= 0.6;                            // no northern pincer: the Kiev pocket is far smaller
    if (m === '1942-05' && sovOff) pris += 240 * Math.pow(G.men / 3300, 0.5);          // the Kharkov offensive cut off at Izyum
    // ---- attrition
    const act = Math.max(0.35, Math.max(...Object.values(on)), sovOff ? 1 : 0, moscowOn ? 1 : 0) * intensity * frac;
    const sKw = K.sCas * Math.pow(gP, 0.7) * dev(gP, REF && REF.gP[t], p.exchD) * act * (sovOff ? 1.6 : 1) * Math.pow(prep, 0.3) * (yr === 1942 && m >= '1942-06' ? K.sCas42X : 1);
    const gCas = K.gCas * Math.pow(sP, 0.5) * dev(sP, REF && REF.sP[t], p.gExchD) * act * (sovOff ? 1.3 : 1) * ((L.alert && t <= 1) ? 1.15 : 1) / Math.pow(L.gAirX, 0.1) * Math.pow(G.men / 3300, 0.4) * (yr === 1942 && m >= '1942-06' ? K.gCas42X : 1) / Math.pow(prep, 0.5);   // stronger defences cost the attacker
    const sTl = S.tanks * K.sTank[yr] * act + 0.5 * pris;
    const gTl = G.tanks * K.gTank * act * Math.pow(sP, 0.3);
    const groundAir = (t === 0 && L.alert) ? 1 - L.alert * (1 - p.alertAir) : 1;
    const sAl = S.air * K.sAir[yr] * act * (t === 0 ? 1.5 * groundAir : 1) * Math.pow(L.gAirX, 0.4);
    const gAl = G.air * K.gAir * act * Math.pow(sP, 0.3);
    // ---- events
    if (moscowOn) { effort += (m === '1942-05' ? 0.35 : 1); if (depth.C >= L.moscowKm) moscowOn = false; else if (effort >= p.culm) { ev.MoscowSpent = m + '-28'; moscowOn = false; } }
    if (blueOn && depth.S >= 1500 && !ev.StalingradFalls) {
      if (!ev.VolgaReached) ev.VolgaReached = dateIn(m, Math.min(1, (1500 - (depth.S - adv.S)) / Math.max(1, adv.S)));
      const vf = ev.VolgaReached && ev.VolgaReached.slice(0, 7) === m ? 1 - (+ev.VolgaReached.slice(8) / monthDays(m)) : 1;
      if (m <= '1942-11') stalPressure += FR * Math.pow(wgt('S'), -p.reserveE) * vf;   // wgt('S') already carries the loss of the Moscow hub
      if (REF && stalPressure >= REF.stal * K.stalX * p.stalX) ev.StalingradFalls = m + '-15';
    }
    for (const a of AXES) for (const [name, km0] of MILES[a]) { const km = name === 'Moscow' ? L.moscowKm : km0; if (!ev[name] && depth[a] >= km) ev[name] = dateIn(m, Math.min(1, (km - (depth[a] - adv[a])) / Math.max(1, adv[a]))); }
    for (const [name, km] of CAUC) if (!ev[name] && cauc >= km) ev[name] = m + '-20';
    // ---- Soviet production base: the real path, moved by the difference in territory lost (and Moscow's factories)
    const lost = 0.12 * Math.min(1, depth.N / 850) + 0.18 * Math.min(1, depth.C / 1000) + 0.3 * Math.min(1, depth.S / 1000) + 0.1 * Math.max(0, Math.min(1, (depth.S - 1000) / 500)) + (ev.Moscow ? 0.12 : 0) + (ev.StalingradFalls ? 0.05 : 0) + (ev.Leningrad ? 0.04 : 0);
    const ind = Math.max(0.2, 1 - K.lostW * (lost - K.lostReal[t]));
    // ---- stocks
    const prodT = (yr === 1941 ? PROD.sTanks41 : PROD.sTanks42) * ind * L.sProdX * frac + (L.lendLease ? (t >= 4 ? (yr === 1941 ? 170 : 230) : 0) : 0);
    const prodA = (yr === 1941 ? PROD.sAir41 : PROD.sAir42) * ind * L.sProdX * frac + (L.lendLease && t >= 4 ? (yr === 1941 ? 150 : 200) : 0);
    const mob = (yr === 1941 ? PROD.sMen41 : PROD.sMen42) * (0.75 + 0.25 * ind) * frac - (t >= 4 && t <= 7 ? 65 * L.farEastHeld : 0);
    const netLoss = pris + 0.35 * sKw + 0.2 * sKw;                            // dead, and the wounded away for months
    S = { men: Math.max(500, S.men - netLoss + mob), tanks: Math.max(300, S.tanks - sTl + prodT), air: Math.max(300, S.air - sAl + prodA) };
    const sick = ((m >= '1941-12' && m <= '1942-02') ? 60 : 15) * (G.men / 3300);
    G = { men: Math.max(500, G.men - gCas - sick + (yr === 1941 ? PROD.gRepl41 : PROD.gRepl42) * L.gReplX * frac * (m >= '1941-12' && m <= '1942-05' ? 1.5 : 1)),
          tanks: Math.max(200, G.tanks - gTl + (yr === 1941 ? PROD.gTanksE41 : PROD.gTanksE42) * L.gProdX * frac),
          air: Math.max(200, G.air - gAl + (yr === 1941 ? PROD.gAir41 : PROD.gAir42) * L.gAirX * frac) };
    Y.sCas += sKw + pris; Y.sIrr += pris + 0.35 * sKw; Y.pris += pris; Y.sTl += sTl; Y.sAl += sAl; Y.gCas += gCas; Y.gTl += gTl; Y.gAl += gAl;
    o.months.push({ m, depth: { ...depth }, reach: { ...reach }, cauc, gP, sP, sMen0, gMen: G.men, gTanks: G.tanks, gAir: G.air, sMen: S.men, sTanks: S.tanks, sAir: S.air, ind, FR, pris, sKw, gCas, regain, moscowOn, blueOn, stalPressure });
  }
  const nov = o.months[17];
  const resPower = comp(nov.sMen, Math.max(50, nov.sTanks), Math.max(50, nov.sAir), SWT) * hubAt('1942-11');   // the reserves that can be brought to the Don by November
  const flank = comp(nov.gMen, nov.gTanks, nov.gAir, GWT);
  const ratio = resPower / flank;
  o.uranus = { ratio, breakthrough: REF && ratio >= REF.uranus * K.uranusX * p.uranusX ? 1 : 0 };
  o.events = ev; ev.Typhoon = Number.isFinite(typhoonDay) ? iso(Math.round(typhoonDay)) : 'none'; o.y41 = tot[1941]; o.y42 = tot[1942];
  o.y41.ratio = o.y41.sCas / o.y41.gCas; o.y42.ratio = o.y42.sCas / o.y42.gCas;
  o.end41 = o.months[6]; o.mar42 = o.months[9]; o.may42 = o.months[11]; o.end42 = o.months[18];
  const mos41 = ev.Moscow && ev.Moscow < '1942' ? 1 : 0, mos42 = ev.Moscow && ev.Moscow >= '1942' ? 1 : 0;
  o.moscow = { falls: ev.Moscow ? 1 : 0, falls1941: mos41, falls1942: mos42, date: ev.Moscow || 'none', date1941: mos41 ? ev.Moscow : 'none', date1942: mos42 ? ev.Moscow : 'none', spent: ev.MoscowSpent || 'none' };
  o.stalingrad = { falls: ev.StalingradFalls ? 1 : 0, date: ev.StalingradFalls || 'none', volga: ev.VolgaReached || 'none', pressure: o.end42.stalPressure };
  o.leningrad = { falls: ev.Leningrad ? 1 : 0, date: ev.Leningrad || 'none', tikhvinRetaken: ev.TikhvinRetaken || 'none' };
  o.caucasus = { depth: o.end42.cauc, maikop: ev.Maikop || 'none', grozny: ev.Grozny || 'none', baku: ev.Baku || 'none' };
  return o;
}
function setRef() { REF = null; const r = run(LEVERS_REAL, sampleParams(null)); REF = { stal: r.end42.stalPressure, uranus: r.uranus.ratio, typhoon: day('1941-10-02'), smolensk: day(r.events.Smolensk), FR: r.months.map(x => x.FR), gP: r.months.map(x => x.gP), sP: r.months.map(x => x.sP), sMen: r.months.map(x => x.sMen0), R: r.months.map(x => x.sP / x.gP) }; return REF; }

// ------------------------------------------------------------------ Monte Carlo and tools
function rngFrom(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function flatten(o, pre = '', acc = {}) { for (const [k, v] of Object.entries(o)) { if (Array.isArray(v)) v.forEach((x, i) => flatten(x, pre + k + '.' + i + '.', acc)); else if (v && typeof v === 'object') flatten(v, pre + k + '.', acc); else acc[pre + k] = v; } return acc; }
const day = s => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) / 864e5;
const iso = d => new Date(d * 864e5).toISOString().slice(0, 10);
function monteCarlo(L, n = 800, seed = 1941, fix = null) {
  if (!REF) setRef();
  const rng = rngFrom(seed), runs = [];
  for (let i = 0; i < n; i++) runs.push(flatten(run(L, fix ? Object.assign(sampleParams(rng), fix) : sampleParams(rng))));   // fix: hold named mechanisms at a value while the rest are drawn
  const q = {}, pick = (a, f) => a[Math.min(a.length - 1, Math.floor(f * a.length))];
  for (const k of Object.keys(runs[0])) {
    const v = runs[0][k];
    if (typeof v === 'number' || typeof v === 'boolean') { const a = runs.map(r => +r[k]).filter(Number.isFinite).sort((x, y) => x - y); if (a.length) q[k] = [pick(a, 0.1), pick(a, 0.5), pick(a, 0.9), a.reduce((s, x) => s + x, 0) / a.length]; }
    else if (typeof v === 'string') { const a = runs.map(r => r[k]).filter(x => /^\d{4}-\d\d-\d\d$/.test(x)).map(day).sort((x, y) => x - y); q[k + '#share'] = [a.length / n]; if (a.length) q[k] = [iso(pick(a, 0.1)), iso(pick(a, 0.5)), iso(pick(a, 0.9))]; }
  }
  return q;
}
function sensitivity(L, metric) {
  if (!REF) setRef();
  const base = sampleParams(null), b = metric(run(L, base)), rows = [];
  for (const [k, v] of Object.entries(PRIORS)) rows.push({ k, lo: metric(run(L, Object.assign({}, base, { [k]: v[0] }))) - b, hi: metric(run(L, Object.assign({}, base, { [k]: v[1] }))) - b });
  rows.sort((x, y) => Math.max(Math.abs(y.lo), Math.abs(y.hi)) - Math.max(Math.abs(x.lo), Math.abs(x.hi)));
  return { base: b, rows };
}
const STEPS = [   // from reality to the scenario, one change at a time; the decision first, so that the later changes show what they add to its chances
  ['Reality', {}], ['Moscow first in 1942, then the south', { moscow42: true, blueStart: 'after Moscow' }],
  ['Invasion on 1 June', { start: '1941-06-01' }], ['Soviets alerted, 3.7m men in the west', { sMen: 3700, alert: 1 }],
  ['More German men and tanks', { gMen: 3900, gTanks: 3800 }], ['Larger Luftwaffe', { gAirX: 1.5 }], ['German output and replacements', { gProdX: 1.3, gReplX: 1.25 }],
  ['More lorries and fuel, net of the extra divisions', { lorries: 1.1, fuel: 1.05, railX: 1.0 }], ['No Lend-Lease', { lendLease: false, sProdX: 0.96 }], ['Far East forces held back', { farEastHeld: 0.5 }],
];
const M = { MONTHS, AXES, MILES, CAUC, K, PROD, START, LEVERS_REAL, LEVERS_SCEN, PRIORS, STEPS, sampleParams, run, setRef, monteCarlo, sensitivity, flatten, day, iso, getRef: () => REF };
if (typeof module !== 'undefined' && module.exports) module.exports = M; else root.EFModel = M;
})(typeof window !== 'undefined' ? window : globalThis);
