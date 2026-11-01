# Water version support

The supported UI is `workbench-v10-2`.
The host loads this UI for every `waterVersion` query value, including historical shared URLs.
The host does not silently switch to an older UI or scientific generation after a load failure.
The current adapter provides a retry control and a link to the standalone workspace after an iframe startup failure.

The current UI loads scientific dependencies from `water/shared/`.
The experiment JSON schema and the scientific model identifiers retain their existing versions.
A UI release does not imply a new scientific model or external validation.
Existing persisted-session migration remains available.

Production delivery replaces V5, V6, V7, V8, V9, V10, V10.1 and prototype app entry points with compatibility redirects.
These pages carry `noindex` and link to the supported standalone workspace.
Compatibility redirects preserve the query and fragment.
Historical UI code stays in the repository for review and numerical regression checks.
Historical UI code is excluded from the production payload.

```text
Lab / historical query
        |
        v
Supported V10.2 UI
        |
        v
Stable shared scientific assets
        |
        v
Pinned data + preserved licenses + regression checks
```

The UI uses the host's `design-tokens.css` typography roles.
The Water theme retains its scientific signal colors and dark working field.
The iframe uses an absolute token URL so nested routes resolve the same design system.

Validate source wiring with `node scripts/verify-water-quiet-release.mjs --local`.
Validate the assembled production files with `node scripts/verify-water-quiet-release.mjs --dist`.
An optional directory after `--dist` selects an existing artifact without building it.
Validate deployed HTTP responses with `node scripts/verify-water-quiet-release.mjs --url https://geogeeklab.github.io/`.
All modes check the pinned scientific asset hashes. Production modes also check the current shared module URL.
