/**
 * Prism asset resolver
 * Builds candidate URLs for loading assets from the Prism foundation package
 * while supporting both local development (node_modules) and built bundles (vendor directory).
 */
const DEFAULT_BASES = Object.freeze([
  'vendor/prism-foundation',
  '../vendor/prism-foundation',
  './vendor/prism-foundation',
  '/vendor/prism-foundation',
  'node_modules/@mylighthouse/prism-foundation/dist',
  './node_modules/@mylighthouse/prism-foundation/dist',
  '../node_modules/@mylighthouse/prism-foundation/dist',
  '/node_modules/@mylighthouse/prism-foundation/dist'
]);

function getConfiguredBases() {
  const bases = [];

  if (typeof window !== 'undefined') {
    const attrBase = document.documentElement?.dataset?.prismAssetBase;
    if (attrBase) bases.push(attrBase);

    const globalBase = window.PRISM_ASSET_BASE;
    if (typeof globalBase === 'string') {
      bases.push(globalBase);
    } else if (Array.isArray(globalBase)) {
      bases.push(...globalBase);
    }
  }

  return bases;
}

function normalizePath(value) {
  return value.replace(/\\/g, '/');
}

function expandRelativeBase(base) {
  const normalized = normalizePath(base).replace(/\/$/, '');
  if (normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('/')) {
    return [normalized];
  }

  const variants = new Set([normalized, `./${normalized.replace(/^\.\//, '')}`]);

  if (typeof window !== 'undefined') {
    const pathname = window.location?.pathname ?? '/';
    const segments = pathname.split('/').filter(Boolean);
    let prefix = '..';
    for (let i = 0; i < Math.max(segments.length - 1, 0); i += 1) {
      variants.add(`${'../'.repeat(i + 1)}${normalized}`);
    }
    // Ensure direct parent directory variant
    variants.add(`../${normalized}`);
    variants.add(`${prefix}/${normalized}`);
  }

  return Array.from(variants);
}

export function createPrismAssetResolver() {
  const baseCandidates = [...getConfiguredBases(), ...DEFAULT_BASES].filter(Boolean);
  const uniqueBases = Array.from(new Set(baseCandidates));

  function buildCandidates(relativePath) {
    const normalizedRelative = normalizePath(relativePath).replace(/^\/+/, '');
    const candidates = new Set();

    uniqueBases.forEach((base) => {
      expandRelativeBase(base).forEach((variant) => {
        const cleanedBase = variant.replace(/\/$/, '');
        const candidate = `${cleanedBase}/${normalizedRelative}`.replace(/\/+/g, '/');
        candidates.add(candidate);
      });
    });

    return Array.from(candidates);
  }

  function resolveBest(relativePath) {
    const [primary] = buildCandidates(relativePath);
    return primary ?? null;
  }

  return {
    buildCandidates,
    resolveBest
  };
}

export const prismAssetResolver = createPrismAssetResolver();
