// Rough device tier (§10): adjusts quality, never content.
export function detectQuality() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4; // Chromium only
  const low = cores <= 4 || memory <= 4;
  const tier = low ? 'low' : coarse ? 'mid' : 'high';
  return {
    tier,
    mobile: coarse,
    maxDpr: tier === 'low' ? 1.5 : 2,
    antialias: tier !== 'low',
    shadows: !coarse,
    segments: coarse ? 0.5 : 1, // multiplier for geometry detail
  };
}
