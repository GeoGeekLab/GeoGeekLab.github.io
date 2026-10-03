# ORIENT unit tests

These tests protect browser-independent ORIENT domain logic. They intentionally load the same IIFE source used by the static site through a minimal `window` shim, so the project keeps its current no-bundler delivery model while geometry remains testable under Node.
