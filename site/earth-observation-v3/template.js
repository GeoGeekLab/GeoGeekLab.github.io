export function earthTemplate() {
  return `
    <div class="earth-observation-lab">
      <section class="earth-observation-canvas" aria-label="Temporal Earth observation">
        <header class="earth-observation-hud">
          <div><span>OBSERVATION</span><strong id="eoHudLayer">—</strong></div>
          <div><span>VIEW DATE</span><strong id="eoHudDate">—</strong></div>
          <div><span>REFERENCE</span><strong id="eoHudReference">OFF</strong></div>
          <div><span>VIEW</span><strong id="eoHudView">GLOBAL · Z 1.0</strong></div>
          <button type="button" id="eoReset" class="eo-quiet-button">RESET</button>
        </header>

        <div class="earth-observation-frame-shell" id="eoFrameShell">
          <div class="earth-observation-frame" id="eoFrame" aria-label="Interactive date-scoped Earth observation viewport in EPSG:4326">
            <div class="eo-image-stack eo-image-a" id="eoImageA" aria-label="Primary observation"></div>
            <div class="eo-image-stack eo-image-b" id="eoImageB" aria-label="Reference observation"></div>
            <div class="eo-loading" id="eoLoading" aria-live="polite"><i></i><span>REQUESTING VIEWPORT</span></div>
            <svg class="eo-graticule" id="eoGraticule" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
            <div class="eo-probe" id="eoProbe" hidden><i></i><span id="eoProbeLabel"></span></div>
            <button class="eo-compare-handle" id="eoCompareHandle" type="button" role="slider" aria-label="Comparison split" aria-valuemin="5" aria-valuemax="95" aria-valuenow="50" aria-valuetext="50 percent reveal" hidden><span></span></button>
            <div class="eo-map-label eo-label-a"><span>A</span><b id="eoLabelA">—</b></div>
            <div class="eo-map-label eo-label-b" id="eoLabelBWrap" hidden><span>B</span><b id="eoLabelB">—</b></div>
            <div class="eo-nav-controls" aria-label="Map navigation">
              <button type="button" id="eoZoomOut" aria-label="Zoom out">−</button>
              <output id="eoZoomReadout" aria-live="polite">Z 1.0</output>
              <button type="button" id="eoZoomIn" aria-label="Zoom in">+</button>
              <button type="button" id="eoFit">FIT</button>
            </div>
            <div class="eo-frame-note"><span>VIEWPORT WMS / EPSG:4326</span><span>DRAG TO PAN · WHEEL TO ZOOM · CLICK TO PROBE</span></div>
          </div>
        </div>

        <footer class="earth-timeline" aria-label="Observation timeline">
          <div class="eo-timeline-controls">
            <button type="button" id="eoPrev" aria-label="Previous day">−1D</button>
            <button type="button" id="eoPlay" aria-pressed="false">PLAY</button>
            <button type="button" id="eoNext" aria-label="Next day">+1D</button>
            <button type="button" id="eoLatest" aria-label="Jump to conservative recent observation date" title="Uses a product-specific conservative request window; provider availability can differ.">SAFE DATE</button>
          </div>
          <div class="eo-timeline-track">
            <div class="eo-timeline-head"><span id="eoCoverageStart">—</span><strong id="eoTimelineDate">—</strong><span id="eoCoverageEnd">—</span></div>
            <input id="eoRange" type="range" min="0" max="120" value="0" step="1" aria-label="Days before conservative recent observation date" />
            <div class="eo-ticks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
          </div>
          <label class="eo-date-input">UTC DATE<input id="eoDate" type="date" /></label>
        </footer>
      </section>

      <aside class="earth-observation-panel">
        <section class="eo-panel-card eo-layer-card">
          <div class="eo-panel-head"><div><span>OBSERVATION LAYERS</span><strong>Choose what the sensor means.</strong></div><em id="eoLayerMode">—</em></div>
          <div class="eo-layer-groups" id="eoLayerGroups" role="tablist" aria-orientation="horizontal" aria-label="Observation layer categories"></div>
          <div class="eo-layer-list" id="eoLayerList" role="tabpanel" aria-label="Observation products in the selected category"></div>
        </section>

        <section class="eo-panel-card">
          <div class="eo-panel-head"><div><span>COMPARE</span><strong>Change requires a reference.</strong></div><em id="eoCompareState">OFF</em></div>
          <button type="button" class="eo-compare-toggle" id="eoCompare" aria-pressed="false"><i></i><span><b>SWIPE A / B</b><small>Same product, two UTC dates · same viewport</small></span></button>
          <div class="eo-compare-presets" id="eoComparePresets" aria-label="Requested reference date offset">
            <button type="button" data-offset="1">1 DAY</button>
            <button type="button" data-offset="7" class="is-active">7 DAYS</button>
            <button type="button" data-offset="30">30 DAYS</button>
          </div>
          <div class="eo-opacity" id="eoOpacityWrap" hidden><label for="eoOpacity">OVERLAY OPACITY</label><output id="eoOpacityValue">100%</output><input id="eoOpacity" type="range" min="15" max="100" value="100" step="1" /></div>
        </section>

        <section class="eo-panel-card">
          <div class="eo-panel-head"><div><span>MAP READING</span><strong>Geometry follows the requested viewport.</strong></div></div>
          <div class="eo-map-tools">
            <button type="button" id="eoGrid" class="is-active" aria-pressed="true">GRATICULE</button>
            <button type="button" id="eoClearProbe">CLEAR PROBE</button>
          </div>
          <p class="eo-layer-note" id="eoLayerNote"></p>
        </section>

        <section class="eo-panel-card eo-inspector">
          <div class="eo-panel-head"><div><span>OBSERVATION CONDITIONS</span><strong id="eoInspectorTitle">—</strong></div><em id="eoSupplyState">WMS</em></div>
          <dl id="eoInspectorMeta"></dl>
          <div class="eo-probe-readout" id="eoProbeReadout"><span>GEOMETRIC PROBE</span><strong>CLICK THE MAP</strong><small>No pixel-value decoding; coordinates describe location, not measurement value.</small></div>
          <a id="eoSourceLink" target="_blank" rel="noreferrer">OPEN SAME VIEW IN NASA WORLDVIEW ↗</a>
        </section>
      </aside>
    </div>`;
}
