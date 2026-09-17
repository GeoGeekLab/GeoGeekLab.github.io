# Gravity Trace

Gravity Trace is an original, dependency-free browser game built for GeoGeek Lab.

The player places short-lived gravity wells to bend drifting survey tracers through moving gates. The idea is broadly inspired by gravity-manipulation games, but the implementation, visuals, interface, scoring model, field model, controls, and assets in this directory were created from scratch for GeoGeek.

## Run

No build step is required for the game itself. Serve the repository over HTTP and open:

```text
/gravity-trace/
```

From the repository root, the normal GeoGeek build also copies the game into `dist/gravity-trace/`.

## Controls

- Pointer/touch: hold and release to place a gravity well. Longer holds create stronger wells.
- Arrow keys: move the keyboard reticle.
- Enter: place a keyboard-controlled well.
- Space: pause/resume.
- R: reset.
- M: toggle generated sound.

## Model

The field uses a softened, bounded inverse-square attraction integrated with a fixed simulation step. It is intentionally a game model rather than a scale-faithful astrophysics simulator.

## Accessibility and resilience

- Pointer, touch, and keyboard input are supported.
- `prefers-reduced-motion` removes particle trails and pulsing motion.
- The game auto-pauses when its document becomes hidden.
- Local-storage failure only disables high-score persistence; gameplay continues.
- No external JavaScript, fonts, images, analytics, or API calls are required.

## License

MIT. See [`LICENSE`](./LICENSE).
