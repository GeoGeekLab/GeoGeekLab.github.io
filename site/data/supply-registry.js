export const DATA_SUPPLY_SCHEMA_VERSION = 1;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const DATASETS = Object.freeze([
  {
    id: 'orbit-active',
    instrument: 'orbit',
    adapter: 'orbit',
    provider: 'CelesTrak',
    label: 'Active satellite catalog',
    mode: 'snapshot',
    upstream: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON',
    snapshot: 'orbital/data/active.json',
    metadata: 'orbital/data/active.meta.json',
    metadataDataset: 'celestrak-active-gp',
    refreshEveryMs: 2 * HOUR,
    staleAfterMs: 8 * HOUR,
    fallback: 'last-known-good',
    timeSemantics: 'Snapshot fetch time; each OMM record carries its own orbital-element epoch.',
    resolution: 'Object / orbital element set',
    limit: 'Predicted position quality degrades as orbital elements age; this is not authoritative space-surveillance data.'
  },
  {
    id: 'noaa-aurora',
    instrument: 'earth',
    adapter: 'aurora',
    provider: 'NOAA SWPC',
    label: 'OVATION auroral probability',
    mode: 'snapshot',
    upstream: 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',
    snapshot: 'data/snapshots/noaa-aurora.json',
    metadata: 'data/snapshots/noaa-aurora.meta.json',
    refreshEveryMs: HOUR,
    staleAfterMs: 3 * HOUR,
    fallback: 'upstream',
    timeSemantics: 'Provider-latest model forecast; independent of the Earth Observatory view date.',
    resolution: 'OVATION model grid',
    limit: 'Auroral probability is a model estimate, not direct optical observation.'
  },
  {
    id: 'smithsonian-volcanoes',
    instrument: 'earth',
    adapter: 'volcanoes',
    provider: 'Smithsonian Global Volcanism Program',
    label: 'Holocene volcano reference',
    mode: 'snapshot',
    upstream: 'https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=GVP-VOTW%3ASmithsonian_VOTW_Holocene_Volcanoes&outputFormat=application%2Fjson&maxFeatures=2000',
    snapshot: 'data/snapshots/smithsonian-volcanoes.geojson',
    metadata: 'data/snapshots/smithsonian-volcanoes.meta.json',
    refreshEveryMs: DAY,
    staleAfterMs: 30 * DAY,
    fallback: 'upstream',
    timeSemantics: 'Reference database snapshot; not a real-time eruption feed.',
    resolution: 'Volcano point / database record',
    limit: 'Database locations and catalog inclusion do not describe current eruption footprints.'
  },
  {
    id: 'emsc-events',
    instrument: 'earth',
    adapter: 'emsc',
    provider: 'EMSC / SeismicPortal',
    label: 'Current UTC-day earthquakes',
    mode: 'hybrid',
    upstream: 'https://www.seismicportal.eu/fdsnws/event/1/query',
    snapshot: 'data/snapshots/emsc-current-day.geojson',
    metadata: 'data/snapshots/emsc-current-day.meta.json',
    refreshEveryMs: HOUR,
    staleAfterMs: 2 * HOUR,
    fallback: 'upstream',
    timeSemantics: 'Current UTC day uses a GeoGeek snapshot; historical view dates query EMSC directly.',
    resolution: 'Event solution',
    limit: 'Early hypocenter and magnitude solutions can be revised.'
  },
  {
    id: 'nasa-gibs', instrument: 'earth', adapter: 'gibs', provider: 'NASA EOSDIS GIBS', label: 'Daily satellite imagery', mode: 'tile',
    upstream: 'https://gibs.earthdata.nasa.gov/', fallback: 'upstream', timeSemantics: 'View-date controlled raster tiles.', resolution: 'Product-dependent raster tile',
    limit: 'Cloud, atmosphere, overpass time and composite processing condition what is visible.'
  },
  {
    id: 'openrailwaymap', instrument: 'earth', adapter: 'railway', provider: 'OpenRailwayMap / OpenStreetMap', label: 'Railway reference tiles', mode: 'tile',
    upstream: 'https://tiles.openrailwaymap.org/', fallback: 'upstream', timeSemantics: 'Reference layer; independent of view date.', resolution: 'OpenStreetMap feature scale',
    limit: 'Completeness and currency vary with OpenStreetMap contributions.'
  },
  {
    id: 'inaturalist', instrument: 'earth', adapter: 'inaturalist', provider: 'iNaturalist', label: 'Recent biodiversity observations', mode: 'query',
    upstream: 'https://api.inaturalist.org/v1/observations', fallback: 'upstream', timeSemantics: 'Viewport-current query; independent of view date.', resolution: 'Observation point',
    limit: 'Presence-only observations reflect observer effort and geoprivacy.'
  },
  {
    id: 'gbif', instrument: 'earth', adapter: 'gbif', provider: 'GBIF', label: 'Occurrence records', mode: 'query',
    upstream: 'https://api.gbif.org/v1/occurrence/search', fallback: 'upstream', timeSemantics: 'Viewport query; independent of view date.', resolution: 'Occurrence point',
    limit: 'Aggregates heterogeneous datasets with variable coordinate uncertainty and sampling effort.'
  },
  {
    id: 'usgs-water', instrument: 'earth', adapter: 'usgsWater', provider: 'USGS Water Data', label: 'Latest continuous water observations', mode: 'query',
    upstream: 'https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items', fallback: 'upstream', timeSemantics: 'Viewport-current station query; independent of view date.', resolution: 'Monitoring station',
    limit: 'Coverage is station-based and primarily United States; parameters differ by site.'
  }
]);

export const DATASET_BY_ID = new Map(DATASETS.map(dataset => [dataset.id, dataset]));
export const DATASET_BY_ADAPTER = new Map(DATASETS.map(dataset => [dataset.adapter, dataset]));

export function siteAssetUrl(path, base = import.meta.url) {
  return new URL(`../${String(path).replace(/^\/+/, '')}`, base).href;
}

export function snapshotDatasets() {
  return DATASETS.filter(dataset => dataset.snapshot && dataset.metadata);
}
