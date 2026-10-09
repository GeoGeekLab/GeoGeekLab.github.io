# Earth Pulse · Professional Data Workflow V1

This opt-in workbench extends the existing Earth Pulse instrument. It does not
replace the current rolling-24-hour USGS snapshot viewer.

## Entry and workflow

Open \`Lab → Earth Pulse → OPEN DATA WORKFLOW\`.

1. Load the 24-hour snapshot, or select a UTC start/end date and a query minimum magnitude.
2. Use **QUERY HISTORY** for a date-scoped request to the USGS FDSN Event Web Service.
3. Draw a rectangle on the world map or type exact W/E/S/N ROI coordinates. For an ROI crossing
   the international date line, set west > east.
4. Set a *view* minimum magnitude, depth class, and review status.
5. Compare loaded catalogue records to the currently visible filtered/ROI records.
6. Export **GeoJSON** (filtered source features), **CSV**, and **MANIFEST JSON**.
   Save the manifest with the exported records.

## Data contract

- Snapshot: GeoGeek's same-origin last-known-good snapshot, sourced from the USGS
  all-day feed. Stale snapshots are identified explicitly.
- History: browser-side HTTPS request to \`/fdsnws/event/1/query\`; UTC start and
  end calendar dates, up to 31 dates per request.
- Historical query minimum magnitude defaults to 2.5; this is a *server-side
  restriction*, not a post-query filter. The view minimum magnitude is separate.
- A query requests at most 10,001 features; a response of more than 10,000 is
  rejected. No partial result is used. Narrow the query when necessary.
- Source catalogue, provider timestamps, geographic ROI, local filters, and
  export time are distinct fields in the exported manifest.
- An empty USGS HTTP 204 response is treated as an empty catalogue. Failed
  queries preserve the previously loaded catalogue and display an error.
- All events are rendered with the globally defined equirectangular projection.
  The ROI filters *loaded events*; it does not fetch additional unqueried events.
- A successful CSV export includes UTF-8 BOM and escapes spreadsheet-formula
  prefixes in text fields. GeoJSON keeps the USGS properties untouched.

## Scientific limitations

- Magnitude and hypocentre solutions can be revised after retrieval.
- Global event detection and catalogue completeness vary by magnitude and region.
- Neither a 24-hour snapshot nor a short date query proves a long-term seismic trend.
- Filtered event counts are not area-normalized densities, hazard estimates,
  intensity surfaces, or earthquake predictions.
- Saving only a URL cannot guarantee future reproducibility because the provider
  may revise records. Keep the exported GeoJSON/CSV and manifest together.

## Implementation references

- Front end: \`site/pulse/pulse-workflow-v1.js\`
- Styles: \`site/pulse/pulse-workflow-v1.css\`
- Loader: \`site/lab-fullpage.js\`
- Browser regression: \`tests/browser/pulse-workflow.spec.mjs\`
- USGS API: https://earthquake.usgs.gov/fdsnws/event/1/

Run the targeted browser test:

\`\`\`sh
npx playwright test tests/browser/pulse-workflow.spec.mjs
\`\`\`


## Round 2: analysis, comparison and map interaction

The **COMPARE TWO UTC WINDOWS** panel divides the loaded (not remotely re-queried)
events into two user-selected disjoint UTC intervals. Both intervals use the
same ROI and view filters. The end bound is **exclusive**: \`start <= time < end\`.
\`SPLIT SOURCE IN HALF\` initializes two equally long adjacent windows from
the earliest and latest source event; **APPLY WINDOWS** validates user input.
Overlapping or invalid windows are rejected without changing the applied windows.

The A/B comparisons include:

- Per-window count, maximum magnitude, median depth, and observed catalogue
  records per hour. The last measure is descriptive, not a completeness-adjusted
  physical occurrence rate.
- Time chart: twelve equal **relative elapsed-time** bins in each window.
  The horizontal axis is a fraction of each distinct duration, **not absolute UTC**
  and not automatically a comparison of equal-length periods.
- Magnitude histogram: 0.5 magnitude-wide bins, with missing magnitudes counted
  separately. A and B share the same magnitude bins.
- Depth histogram: <70 km, 70–<300 km, ≥300 km, and unknown depth.
- Each bar exposes its exact count and time interval via mouse hover or
  keyboard focus; click or Enter pins its description in the chart readout.

Use **MAP REPRESENTATION** for points or a configurable 2°, 5°, 10° or 20°
geographic grid, raw counts, or counts per 10⁶ km² spherical surface area.
Use MAP DATA to show all filtered records or the A/B period subsets. The A/B
grid modes share the same rendering maximum for meaningful visual comparison.
An empty cell is uncoloured. No gridded value estimates seismic hazard.

Mouse, touch and keyboard:

- Hover or keyboard-focus an event marker to show ID, place, magnitude, magnitude
  type, depth, coordinates, origin time, update time, status and event type.
- Click or press Enter/Space to pin an event and show its official USGS link.
- In grid view, hover, focus or click an occupied cell to inspect count, area,
  angular bounds and up to five contained events. Clicking a contained event
  opens its details in the local inspector.
- Wheel to zoom; drag an empty map area to pan. Use **RESET VIEW** to restore
  global extent. The same view transform is respected by the rectangle ROI tool.
- The exported **MANIFEST JSON** and exported GeoJSON metadata contain the
  active A/B windows, comparison counts, grid measure/resolution, map subset
  and viewBox. The exported event records remain the entire filtered/ROI
  selection, not only one of the comparison windows.

Limitations: A/B intervals only partition the *already fetched* data; they
do not retrieve records beyond the source query. Detection completeness
varies with time, region, network and magnitude, and magnitude types differ.
Two different-duration windows can have different counts without proving any
change in underlying seismicity. Spatial cell resolution does not correct
catalogue completeness, and a 2° angular cell is not constant-area.


### Event finder and aggregate CSVs

The EVENT FINDER searches the *currently filtered and ROI-limited* catalogue
by provider event ID or place name (two or more characters). It presents up to
25 matches to keep the interface responsive. Selecting a result pins its source
details, switches to point mode and centres the map on its coordinates. Use
this route when event points overlap.

**EXPORT CHARTS CSV** outputs the A/B count for every time-trend, magnitude,
and depth histogram bin. Time-trend rows carry the actual UTC interval for
each side even though the graphic uses relative elapsed time.

**EXPORT A/B GRID CSV** outputs the union of occupied geographic grid cells
in A or B with longitude/latitude boundaries, approximate cell area,
raw A/B counts and area-normalized A/B densities.

Neither aggregate CSV embeds the original immutable event catalogue. To
reproduce results later, save all of the following together: the selected
events GeoJSON, the A/B aggregate CSVs, and the full manifest JSON.
