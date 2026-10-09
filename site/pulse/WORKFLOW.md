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
