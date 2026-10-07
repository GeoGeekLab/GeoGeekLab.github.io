import {
  WATER_MODEL_META,
  WATER_WAVELENGTHS_NM,
  PURE_WATER_A_M1,
  PURE_WATER_BB_M1,
  BRICAUD_APHI_A,
  BRICAUD_APHI_E,
  WATER_REFERENCE_STATES
} from './water-data.js';

export { WATER_MODEL_META, WATER_WAVELENGTHS_NM, WATER_REFERENCE_STATES };

export const WATER_STATE_BOUNDS = Object.freeze({
  chl: Object.freeze([0.02, 25]),
  ag440: Object.freeze([0, 2]),
  aNap443: Object.freeze([0, 1]),
  bbp443: Object.freeze([0.0001, 0.03]),
  eta: Object.freeze([0, 2])
});

export const WATER_DEFAULT_STATE = Object.freeze({
  chl: 1,
  ag440: 0.05,
  aNap443: 0.02,
  bbp443: 0.002,
  eta: 1
});

function requireFinite(name, value) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
}

export function validateWaterState(input = {}) {
  const state = { ...WATER_DEFAULT_STATE, ...input };
  for (const [name, [min,max]] of Object.entries(WATER_STATE_BOUNDS)) {
    requireFinite(name, state[name]);
    if (state[name] < min || state[name] > max) {
      throw new RangeError(`${name} must be between ${min} and ${max}`);
    }
  }
  return Object.freeze(state);
}

export function phytoplanktonAbsorption(chl) {
  requireFinite('chl', chl);
  if (chl <= 0) throw new RangeError('chl must be greater than zero');
  return BRICAUD_APHI_A.map((A,index) => A * Math.pow(chl, BRICAUD_APHI_E[index]));
}

export function cdomAbsorption(ag440) {
  requireFinite('ag440', ag440);
  if (ag440 < 0) throw new RangeError('ag440 must be non-negative');
  const S = WATER_MODEL_META.cdomSlopeNm1;
  return WATER_WAVELENGTHS_NM.map(wl => ag440 * Math.exp(-S * (wl - WATER_MODEL_META.cdomReferenceNm)));
}

export function napAbsorption(aNap443) {
  requireFinite('aNap443', aNap443);
  if (aNap443 < 0) throw new RangeError('aNap443 must be non-negative');
  const S = WATER_MODEL_META.napSlopeNm1;
  return WATER_WAVELENGTHS_NM.map(wl => aNap443 * Math.exp(-S * (wl - WATER_MODEL_META.napReferenceNm)));
}

export function particleBackscatter(bbp443, eta = 1) {
  requireFinite('bbp443', bbp443);
  requireFinite('eta', eta);
  if (bbp443 < 0) throw new RangeError('bbp443 must be non-negative');
  return WATER_WAVELENGTHS_NM.map(wl => bbp443 * Math.pow(WATER_MODEL_META.particleBackscatterReferenceNm / wl, eta));
}

export function subsurfaceToAboveWater(rrs) {
  requireFinite('rrs', rrs);
  if (rrs < 0) throw new RangeError('rrs must be non-negative');
  const denominator = 1 - 1.7 * rrs;
  if (!(denominator > 0)) throw new RangeError('rrs is outside the Lee et al. (2002) interface approximation domain');
  return 0.52 * rrs / denominator;
}

export function aboveWaterToSubsurface(Rrs) {
  requireFinite('Rrs', Rrs);
  if (Rrs < 0) throw new RangeError('Rrs must be non-negative');
  return Rrs / (0.52 + 1.7 * Rrs);
}

export function computeWaterOptics(input = {}) {
  const state = validateWaterState(input);
  const aph = phytoplanktonAbsorption(state.chl);
  const ag = cdomAbsorption(state.ag440);
  const aNap = napAbsorption(state.aNap443);
  const bbp = particleBackscatter(state.bbp443, state.eta);
  const a=[],bb=[],u=[],rrs=[],Rrs=[];

  for (let i=0; i<WATER_WAVELENGTHS_NM.length; i++) {
    a[i] = PURE_WATER_A_M1[i] + aph[i] + ag[i] + aNap[i];
    bb[i] = PURE_WATER_BB_M1[i] + bbp[i];
    u[i] = bb[i] / (a[i] + bb[i]);
    rrs[i] = WATER_MODEL_META.g0 * u[i] + WATER_MODEL_META.g1 * u[i] * u[i];
    Rrs[i] = subsurfaceToAboveWater(rrs[i]);
  }

  return Object.freeze({
    state,
    wavelengthNm: WATER_WAVELENGTHS_NM,
    absorption: Object.freeze({
      water: PURE_WATER_A_M1,
      phytoplankton: Object.freeze(aph),
      cdom: Object.freeze(ag),
      nap: Object.freeze(aNap),
      total: Object.freeze(a)
    }),
    backscattering: Object.freeze({
      water: PURE_WATER_BB_M1,
      particles: Object.freeze(bbp),
      total: Object.freeze(bb)
    }),
    u: Object.freeze(u),
    rrs: Object.freeze(rrs),
    Rrs: Object.freeze(Rrs)
  });
}
