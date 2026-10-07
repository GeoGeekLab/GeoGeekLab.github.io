(() => {
  'use strict';

  const records = {
    l04: {
      detailLabel: 'INSTRUMENT NOTES',
      recordConditions: [
        ['catalog', 'CelesTrak active · GeoGeek unified same-origin OMM snapshot'],
        ['model', 'SGP4 / SDP4 · Web Worker'],
        ['time', 'UTC propagation · user-controlled'],
        ['radial scale', 'Compressed / physical']
      ],
      bodyHtml: `
        <article class="lab-record-detail" aria-label="Orbital Commons instrument notes">
          <section class="lab-record-block">
            <div class="lab-record-block-label">PURPOSE</div>
            <div class="lab-record-copy">
              <h2>Read the active orbital population as a time-dependent field.</h2>
              <p>Orbital Commons joins catalog identity, mean elements, propagation epoch, orbital regime, and terrestrial observer geometry in one analytical view. The map is the working surface; the record keeps the observation contract.</p>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">OBSERVATION CONTRACT</div>
            <div class="lab-record-facts">
              <div><span>CATALOG</span><strong>CelesTrak General Perturbations active population</strong></div>
              <div><span>FORMAT</span><strong>CCSDS OMM / JSON mean-element records</strong></div>
              <div><span>PROPAGATION</span><strong>SGP4 / SDP4 via satellite.js in a Web Worker</strong></div>
              <div><span>TIME</span><strong>User-selected UTC propagation epoch</strong></div>
              <div><span>SPACE</span><strong>Propagated geocentric state + observer-relative geometry</strong></div>
              <div><span>VIEW</span><strong>Compressed or physical radial representation</strong></div>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">METHOD</div>
            <div class="lab-record-copy">
              <p>The runtime reads standardized mean elements, propagates each object to the selected UTC epoch, classifies orbital regime, and renders the population as one selectable field. Selecting an object exposes its orbit trace, ground relation, element epoch, and observer-relative geometry.</p>
              <p>The compressed radial view changes representation only. It does not change the propagated orbit.</p>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">LIMITS / SOURCES</div>
            <div class="lab-record-copy lab-record-links">
              <p>Mean elements and SGP4/SDP4 are analytical approximations, not precision ephemerides. Accuracy depends on element quality and separation from the source epoch. Catalog latency and inclusion rules also condition what the field can show.</p>
              <p><a href="https://github.com/GeoGeekLab/orbital-commons" target="_blank" rel="noreferrer">Orbital Commons source ↗</a> · <a href="https://geogeeklab.github.io/orbital-commons/" target="_blank" rel="noreferrer">Standalone instrument ↗</a> · <a href="https://celestrak.org/NORAD/elements/" target="_blank" rel="noreferrer">CelesTrak GP data ↗</a> · <a href="https://github.com/shashwatak/satellite-js" target="_blank" rel="noreferrer">satellite.js ↗</a></p>
            </div>
          </section>
        </article>`
    },

    l05: {
      detailLabel: 'INSTRUMENT NOTES',
      recordConditions: [
        ['sensor', 'MODIS / Terra'],
        ['product', 'Corrected Reflectance · True Color'],
        ['crs', 'EPSG:4326'],
        ['data source', 'NASA GIBS']
      ],
      bodyHtml: `
        <article class="lab-record-detail" aria-label="Earth in Change instrument notes">
          <section class="lab-record-block">
            <div class="lab-record-block-label">PURPOSE</div>
            <div class="lab-record-copy">
              <h2>Treat observation date as part of the image.</h2>
              <p>Earth in Change turns recent MODIS Terra imagery into a temporal field. The instrument is for comparing successive observations, not for presenting one timeless basemap.</p>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">OBSERVATION CONTRACT</div>
            <div class="lab-record-facts">
              <div><span>SENSOR</span><strong>MODIS / Terra</strong></div>
              <div><span>PRODUCT</span><strong>Corrected Reflectance · True Color</strong></div>
              <div><span>SOURCE</span><strong>NASA GIBS</strong></div>
              <div><span>CRS</span><strong>EPSG:4326 geographic display</strong></div>
              <div><span>TIME</span><strong>Date-scoped observation sequence</strong></div>
              <div><span>INTERACTION</span><strong>Step, scrub, and play through available dates</strong></div>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">METHOD</div>
            <div class="lab-record-copy">
              <p>The selected date determines the requested Earth observation. The runtime keeps the geographic frame stable while the raster changes, so visible differences can be read as temporal change rather than camera movement.</p>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">LIMITS / SOURCES</div>
            <div class="lab-record-copy lab-record-links">
              <p>True-color imagery is interpretive visual evidence, not a direct quantitative measurement. Cloud, atmosphere, acquisition geometry, compositing, and source availability condition every frame.</p>
              <p><a href="https://www.earthdata.nasa.gov/data/tools/gibs" target="_blank" rel="noreferrer">NASA GIBS ↗</a> · <a href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noreferrer">NASA Worldview ↗</a></p>
            </div>
          </section>
        </article>`
    },

    l06: {
      detailLabel: 'INSTRUMENT NOTES',
      recordConditions: [
        ['supply', 'Open-Meteo · NOAA GFS · reproducible demo data'],
        ['field', 'Vector wind / movement representations'],
        ['representations', 'Field · OD · trajectory · particles'],
        ['coordinates', 'Geographic lon / lat + time where applicable']
      ],
      bodyHtml: `
        <article class="lab-record-detail" aria-label="Geographic Flow Laboratory instrument notes">
          <section class="lab-record-block">
            <div class="lab-record-block-label">PURPOSE</div>
            <div class="lab-record-copy">
              <h2>Compare movement representations without pretending they are the same geometry.</h2>
              <p>Geographic Flow Laboratory places continuous vector fields, aggregate origin–destination networks, timestamped trajectories, and Lagrangian particle releases in one workbench.</p>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">OBSERVATION CONTRACT</div>
            <div class="lab-record-facts">
              <div><span>FIELD</span><strong>Directional vector field</strong></div>
              <div><span>NETWORK</span><strong>Origin–destination aggregates</strong></div>
              <div><span>TRAJECTORY</span><strong>Position as a function of time</strong></div>
              <div><span>PARTICLES</span><strong>Lagrangian releases through a vector field</strong></div>
              <div><span>SUPPLY</span><strong>Open-Meteo / NOAA GFS where live data is used</strong></div>
              <div><span>BASE GEOMETRY</span><strong>Natural Earth + reproducible examples</strong></div>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">METHOD</div>
            <div class="lab-record-copy">
              <p>Representation is an analytical choice. A field answers what direction and magnitude exist at locations; an OD network summarizes exchange; a trajectory preserves ordered motion; particles expose advection through a field.</p>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">LIMITS</div>
            <div class="lab-record-copy">
              <p>Switching representation changes what can be inferred. Interpolation, aggregation, temporal sampling, and synthetic examples can create apparent continuity or structure that the source observations do not directly contain.</p>
            </div>
          </section>
        </article>`
    },

    l10: {
      detailLabel: 'INSTRUMENT NOTES',
      recordConditions: [
        ['feed', 'USGS all_day GeoJSON'],
        ['window', 'Past 24 h'],
        ['encoding', 'Magnitude · depth · recency'],
        ['coordinates', 'Geographic lon / lat']
      ],
      bodyHtml: `
        <article class="lab-record-detail" aria-label="Earth Pulse instrument notes">
          <section class="lab-record-block">
            <div class="lab-record-block-label">PURPOSE</div>
            <div class="lab-record-copy">
              <h2>Read recent seismicity as a changing global event field.</h2>
              <p>Earth Pulse transforms the USGS all-day earthquake feed into a map where magnitude, depth, and recency remain distinct variables rather than collapsing into one alert symbol.</p>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">OBSERVATION CONTRACT</div>
            <div class="lab-record-facts">
              <div><span>FEED</span><strong>USGS all_day GeoJSON</strong></div>
              <div><span>WINDOW</span><strong>Past 24 hours</strong></div>
              <div><span>POSITION</span><strong>Event longitude / latitude</strong></div>
              <div><span>SIZE</span><strong>Magnitude encoding</strong></div>
              <div><span>DEPTH</span><strong>Hypocentral depth</strong></div>
              <div><span>TIME</span><strong>Recency relative to the current feed</strong></div>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">METHOD</div>
            <div class="lab-record-copy">
              <p>The runtime reads the current feed, projects event coordinates into a self-owned world view, and exposes temporal density, magnitude, depth, and selected-event detail without delegating interpretation to a generic alert map.</p>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">LIMITS / SOURCE</div>
            <div class="lab-record-copy lab-record-links">
              <p>Earthquake solutions can be preliminary and revised. Feed completeness, detection thresholds, location uncertainty, and the chosen 24-hour window condition the visible pattern.</p>
              <p><a href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php" target="_blank" rel="noreferrer">USGS GeoJSON feeds ↗</a></p>
            </div>
          </section>
        </article>`
    },

    l11: {
      detailLabel: 'INSTRUMENT NOTES',
      recordConditions: [
        ['input', 'Browser raster'],
        ['output', 'SVG isolines'],
        ['control', 'Threshold · levels · simplify'],
        ['space', 'Image coordinates']
      ],
      bodyHtml: `
        <article class="lab-record-detail" aria-label="Image to Trace instrument notes">
          <section class="lab-record-block">
            <div class="lab-record-block-label">PURPOSE</div>
            <div class="lab-record-copy">
              <h2>Test when a raster image begins to behave like a field.</h2>
              <p>Image → Trace converts a browser raster into derived contours and vector traces. It makes the abstraction step visible instead of treating vectorization as a neutral export operation.</p>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">OBSERVATION CONTRACT</div>
            <div class="lab-record-facts">
              <div><span>INPUT</span><strong>Browser-loaded raster</strong></div>
              <div><span>DERIVATION</span><strong>Thresholded scalar interpretation</strong></div>
              <div><span>OUTPUT</span><strong>SVG isolines / traces</strong></div>
              <div><span>CONTROL</span><strong>Threshold · levels · simplify</strong></div>
              <div><span>SPACE</span><strong>Image coordinates</strong></div>
              <div><span>RUNTIME</span><strong>Browser Canvas / SVG</strong></div>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">METHOD</div>
            <div class="lab-record-copy">
              <p>The workbench derives a field-like representation from pixel values, then exposes contour density and simplification as explicit controls. The output is a trace of the chosen transformation, not recovered geographic truth.</p>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">LIMITS</div>
            <div class="lab-record-copy">
              <p>Image coordinates are not geographic coordinates. Threshold choice, raster resolution, antialiasing, noise, and line simplification can materially change the resulting geometry.</p>
            </div>
          </section>
        </article>`
    },

    l12: {
      detailLabel: 'INSTRUMENT NOTES',
      recordConditions: [
        ['geometry', 'Natural Earth 1:110m'],
        ['projection', 'Equal Earth · Mercator · Orthographic'],
        ['distortion', 'Tissot indicatrices'],
        ['coordinates', 'Geographic lon / lat']
      ],
      bodyHtml: `
        <article class="lab-record-detail" aria-label="World as Relation instrument notes">
          <section class="lab-record-block">
            <div class="lab-record-block-label">PURPOSE</div>
            <div class="lab-record-copy">
              <h2>Make projection choice visible as part of the geographic argument.</h2>
              <p>World as Relation uses the same generalized world geometry across several projections so changes in area, shape, direction, and distance can be read as consequences of representation.</p>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">OBSERVATION CONTRACT</div>
            <div class="lab-record-facts">
              <div><span>GEOMETRY</span><strong>Natural Earth 1:110m</strong></div>
              <div><span>COORDINATES</span><strong>Geographic longitude / latitude</strong></div>
              <div><span>PROJECTIONS</span><strong>Equal Earth · Mercator · Orthographic</strong></div>
              <div><span>DISTORTION</span><strong>Tissot indicatrices</strong></div>
              <div><span>RUNTIME</span><strong>D3 geographic projection pipeline</strong></div>
              <div><span>EXTENT</span><strong>Global</strong></div>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">METHOD</div>
            <div class="lab-record-copy">
              <p>The geometry remains fixed while the projection changes. Tissot indicatrices expose local scale and angular distortion, making each projection's preserved and sacrificed relations visible.</p>
            </div>
          </section>
          <section class="lab-record-block">
            <div class="lab-record-block-label">LIMITS / SOURCE</div>
            <div class="lab-record-copy lab-record-links">
              <p>Natural Earth 1:110m is intentionally generalized. No world projection preserves every relation, and the instrument does not imply that one projection is universally correct.</p>
              <p><a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth ↗</a> · <a href="https://d3js.org/d3-geo" target="_blank" rel="noreferrer">D3 geographic projections ↗</a></p>
            </div>
          </section>
        </article>`
    }
  };

  const ref = document.body?.dataset?.recordRef || '';
  const id = ref.startsWith('lab:') ? ref.slice(4) : '';
  const detail = records[id];
  if (!detail) return;

  const item = window.GEOGEEK_DATA?.en?.lab?.find(entry => entry.id === id);
  if (!item) return;

  Object.assign(item, detail);
  document.body.classList.add('lab-instrument-record-page');
})();