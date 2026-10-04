import DataSupply from './data-supply.js?v=20261004a';

const RELEASE = '20261004b';
const LEGACY_NATURAL_EARTH = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/110m/cultural/ne_110m_admin_0_countries.json';
const PINNED_NATURAL_EARTH = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/0b9a6ceb0a7032713abd9460ac1e995a9c60cd1e/110m/cultural/ne_110m_admin_0_countries.json';
const LEGACY_AURORA_PAGE = 'https://www.swpc.noaa.gov/products/aurora-30-minute-forecast';
const CANONICAL_AURORA_PAGE = 'https://www.spaceweather.gov/products/aurora-30-minute-forecast';

function inputUrl(input) {
  try {
    if (typeof input === 'string') return new URL(input, document.baseURI).href;
    if (input instanceof URL) return input.href;
    return input?.url ? new URL(input.url, document.baseURI).href : '';
  } catch {
    return '';
  }
}

function rewriteFetchInput(input) {
  const href = inputUrl(input);
  if (href !== LEGACY_NATURAL_EARTH) return input;
  if (typeof input === 'string') return PINNED_NATURAL_EARTH;
  if (input instanceof URL) return new URL(PINNED_NATURAL_EARTH);
  return input;
}

function canonicalizeAnchor(anchor) {
  if (anchor?.href === LEGACY_AURORA_PAGE) anchor.href = CANONICAL_AURORA_PAGE;
}

function canonicalizeProviderLinks(root = document) {
  if (root instanceof HTMLAnchorElement) canonicalizeAnchor(root);
  root.querySelectorAll?.('a[href]').forEach(canonicalizeAnchor);
}

if (!window.GeoProviderStability?.installed || window.GeoProviderStability.release !== RELEASE) {
  const previous = window.GeoProviderStability;
  previous?.disconnect?.();

  const dataSupplyFetch = window.fetch.bind(window);
  window.fetch = (input, init) => dataSupplyFetch(rewriteFetchInput(input), init);

  canonicalizeProviderLinks();
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes' && record.target instanceof HTMLAnchorElement) {
        canonicalizeAnchor(record.target);
        continue;
      }
      for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) canonicalizeProviderLinks(node);
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['href']
  });
  const disconnect = () => observer.disconnect();
  window.addEventListener('pagehide', disconnect, { once: true });

  window.GeoProviderStability = Object.freeze({
    installed: true,
    release: RELEASE,
    dataSupply: DataSupply,
    naturalEarthRevision: '0b9a6ceb0a7032713abd9460ac1e995a9c60cd1e',
    canonicalAuroraPage: CANONICAL_AURORA_PAGE,
    canonicalizeProviderLinks,
    disconnect
  });
}

export { DataSupply, PINNED_NATURAL_EARTH, CANONICAL_AURORA_PAGE };
export default window.GeoProviderStability;
