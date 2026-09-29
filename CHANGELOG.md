## [1.9.1](https://github.com/ElJijuna/ssignal/compare/v1.9.0...v1.9.1) (2026-09-29)


### Performance Improvements

* enhance computed signals and effect handling in batch operations ([d471a0d](https://github.com/ElJijuna/ssignal/commit/d471a0d0b36ae4d91993a6662a62d2ed9648f203))

# [1.9.0](https://github.com/ElJijuna/ssignal/compare/v1.8.0...v1.9.0) (2026-09-29)


### Features

* add batch processing for signal updates and improve notification handling ([eebd7a2](https://github.com/ElJijuna/ssignal/commit/eebd7a2b072349dc0bfc3fd00933c8055ef4ead7))
* add dispose() and Symbol.dispose to SSignal ([e070a43](https://github.com/ElJijuna/ssignal/commit/e070a43b317e7c649da64e0ec88836aff8305035))
* add effect() for side effects with cleanup ([902338e](https://github.com/ElJijuna/ssignal/commit/902338e92987617568d96e3753ef38881777c6cb))
* add equals option to SSignal and computed ([6e1e4d5](https://github.com/ElJijuna/ssignal/commit/6e1e4d521edc3fa779370f9af2379583e7599917))
* enhance garbage collection handling in computed signals and improve event listener management ([13ce6f4](https://github.com/ElJijuna/ssignal/commit/13ce6f4810599b9517e9a8908234bc0a6dc56e6e))
* export Unsubscribe, SubscribeOptions and OnceOptions types ([cc55b45](https://github.com/ElJijuna/ssignal/commit/cc55b45035708db1b88be72eb348f2f1ec02cbf7)), closes [#19](https://github.com/ElJijuna/ssignal/issues/19)
* implement in-place mutation notifications for computed signals ([6b6dc86](https://github.com/ElJijuna/ssignal/commit/6b6dc86f601a22dfc354089f9ac668c6528b6a78))
* support immediate option in once() ([9affee9](https://github.com/ElJijuna/ssignal/commit/9affee92cd5741cf783794df1156ecb0799e467d))


### Performance Improvements

* cache Map/Set proxy methods and copy computed sources ([80a9399](https://github.com/ElJijuna/ssignal/commit/80a9399edbb9634d09004b5a7f6e445337b239e1))

# [1.8.0](https://github.com/ElJijuna/ssignal/compare/v1.7.0...v1.8.0) (2026-09-28)


### Bug Fixes

* correct file extension for CommonJS module in package.json and vite config ([4a8c587](https://github.com/ElJijuna/ssignal/commit/4a8c5873db39c18e31ffa477c53d776eb3f22a90))
* keep chained Map.set()/Set.add() calls reactive ([eee2589](https://github.com/ElJijuna/ssignal/commit/eee25895917cf0e011d8ac896ef1e27557a2caec))
* keep Map/Set mutations reactive when chained and skip no-op changes ([b57d1e5](https://github.com/ElJijuna/ssignal/commit/b57d1e5a38b21f494ba51e8bb4e38551355dfdf5))
* keep Map/Set mutations reactive when chained, skip no-op changes, and release abort listener on unsubscribe ([a855811](https://github.com/ElJijuna/ssignal/commit/a855811a595b668979f7755e660daa1f69f03d46))


### Features

* add in-place mutation support for arrays and objects, with single change event dispatch ([1099edf](https://github.com/ElJijuna/ssignal/commit/1099edf9b958d540c3c4bd6f6fd83ce49016d645))

## [1.7.1](https://github.com/ElJijuna/ssignal/compare/v1.7.0...v1.7.1) (2026-09-28)


### Bug Fixes

* correct file extension for CommonJS module in package.json and vite config ([d5af401](https://github.com/ElJijuna/ssignal/commit/d5af401a0ae9c45ea1eaf20fd9e17e0c140b9775))

# [1.7.0](https://github.com/ElJijuna/ssignal/compare/v1.6.0...v1.7.0) (2026-06-11)


### Features

* enhance project setup with new scripts and dependencies ([a5e72b5](https://github.com/ElJijuna/ssignal/commit/a5e72b5be967174ce9be99dde6fb51b23002099a))

# [1.6.0](https://github.com/ElJijuna/ssignal/compare/v1.5.0...v1.6.0) (2026-05-04)


### Features

* add reactive Set support (closes [#27](https://github.com/ElJijuna/ssignal/issues/27)) ([9d8183a](https://github.com/ElJijuna/ssignal/commit/9d8183a3a21ed7e7003b0f7afca5724c25602ed0))

# [1.5.0](https://github.com/ElJijuna/ssignal/compare/v1.4.0...v1.5.0) (2026-05-03)


### Features

* add one-time signal subscriptions ([857ab5e](https://github.com/ElJijuna/ssignal/commit/857ab5e659a88e22a82bb9008b40858ee70fa262)), closes [#24](https://github.com/ElJijuna/ssignal/issues/24)

# [1.4.0](https://github.com/ElJijuna/ssignal/compare/v1.3.0...v1.4.0) (2026-05-03)


### Features

* add computed() derived read-only signal (closes [#21](https://github.com/ElJijuna/ssignal/issues/21)) ([f493460](https://github.com/ElJijuna/ssignal/commit/f4934603c26f92e56ee32d49c805f52819d3d1bd))
* add immediate option to subscribe (closes [#20](https://github.com/ElJijuna/ssignal/issues/20)) ([f6210a7](https://github.com/ElJijuna/ssignal/commit/f6210a712eb636d5a230a84b7cef663bb4e229e5))
* move types condition before import/require in exports map ([c65c903](https://github.com/ElJijuna/ssignal/commit/c65c9034952af7d76c96a7a238afa08300b8303d))

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

From v1.4.0 onwards this file is maintained automatically by [semantic-release](https://github.com/semantic-release/semantic-release).

## [Unreleased]

### Added
- `immediate` option in `subscribe()` — fires callback synchronously with the current value on registration.
- CI workflow running tests, type check, and build on PRs across Node.js 18, 20, and 22.
- Automated release pipeline with semantic-release: publishes to npm, generates changelog, and opens a release PR on every push to `main`.

### Fixed
- `src/index.ts` re-exported with `export { default }` instead of `export *` — default export was not forwarded to consumers.
- `set value` setter now correctly typed as `T | ((prev: T) => T)`, eliminating the need for `as any` casts.
- `subscribe` no longer adds and immediately removes a listener when called with a pre-aborted `AbortSignal`.
- `vite.config.ts` output changed from `exports: 'named'` to `exports: 'default'` — CJS consumers received `{ default: SSignal }` instead of the constructor.
- `engines.node` corrected to `>=18.7.0` (`CustomEvent` is unavailable before that version).

### Changed
- Build and TypeScript targets aligned to `ES2022` to preserve native private class fields.
- `tsconfig.json` `moduleResolution` updated from deprecated `node` to `bundler`.
- Private method `#Map` renamed to `#wrapMap` to avoid confusion with the global `Map` constructor.
- `subscribe` AbortSignal cleanup simplified using `{ once: true }`.
- `#wrapMap` Proxy handler migrated to arrow functions, removing the `const self = this` workaround.
- JSDoc comments added in English for all public API members.

## [1.3.0] - 2025-10-02

### Added
- AbortController / AbortSignal support in `subscribe()`. Passing `{ signal: AbortSignal }` automatically cancels the subscription when the controller is aborted. If the signal is already aborted at call time, the callback is never registered.

## [1.2.1] - 2025-10-01

### Changed
- README expanded with usage examples and API reference.
- Cleaned up `package.json` exports and metadata.

## [1.2.0] - 2025-10-01

### Changed
- Build toolchain migrated from `tsc` to **Vite**. Output now ships ESM, CJS, and UMD bundles under `lib/`.
- `package.json` updated with `main`, `module`, `types`, and `exports` fields pointing to the new build output.

## [1.1.0] - 2025-10-01

### Added
- Reactive `Map` support. Initializing `SSignal` with a `Map` wraps it in a `Proxy` that automatically dispatches `change` events when `set()`, `delete()`, or `clear()` are called. All read methods (`get`, `has`, `entries`, `keys`, `values`, `forEach`, `size`) continue to work transparently.

## [1.0.2] - 2025-10-01

### Added
- `subscribe()` now returns an unsubscribe function — calling it removes the listener.
- Performance test suite: verifies 200,000 value updates with 10 simultaneous subscribers complete in under 500 ms.
- Jest HTML reporter and slow-test reporter configured.

### Changed
- Value setter uses `Object.is` for equality check — no event is dispatched when the new value is strictly equal to the current one.

## [1.0.0] - 2025-09-30

### Added
- Initial release.
- `SSignal<T>` class extending `EventTarget` with `value` getter/setter and `subscribe(callback)` method.
- Dispatches a `CustomEvent<T>` named `change` on every value update.
- Full TypeScript support with generics.

[Unreleased]: https://github.com/ElJijuna/ssignal/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/ElJijuna/ssignal/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/ElJijuna/ssignal/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/ElJijuna/ssignal/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/ElJijuna/ssignal/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/ElJijuna/ssignal/compare/v1.0.0...v1.0.2
[1.0.0]: https://github.com/ElJijuna/ssignal/releases/tag/v1.0.0
