# bare-module-resolve

Low-level module resolution algorithm for Bare. The algorithm is implemented as a generator function that yields either package manifests to be read or resolution candidates to be tested by the caller. As a convenience, the main export is a synchronous and asynchronous iterable that relies on package manifests being read by a callback. For asynchronous iteration, the callback may return promises which will be awaited before being passed to the generator.

```
npm i bare-module-resolve
```

## Usage

For synchronous resolution:

```js
const resolve = require('bare-module-resolve')

function readPackage(url) {
  // Read and parse `url` if it exists, otherwise `null`
}

for (const resolution of resolve('./file.js', new URL('file:///directory/'), readPackage)) {
  console.log(resolution)
}
```

For asynchronous resolution:

```js
const resolve = require('bare-module-resolve')

async function readPackage(url) {
  // Read and parse `url` if it exists, otherwise `null`
}

for await (const resolution of resolve('./file.js', new URL('file:///directory/'), readPackage)) {
  console.log(resolution)
}
```

<!-- bare-refgen:api start -->
## API

### Functions

#### `resolve`

```ts
resolve(specifier: string, parentURL: URL, readPackage?: (url: URL) => JSON | null): Iterable<URL>
```

[source](https://github.com/holepunchto/bare-module-resolve/blob/v1.12.3/index.d.ts#L33)

Resolve `specifier` relative to `parentURL`, which must be a WHATWG `URL` instance. `readPackage` is called with a `URL` instance for every package manifest to be read and must either return the parsed JSON package manifest, if it exists, or `null`. If `readPackage` returns a promise, synchronous iteration is not supported.

**Parameters**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `specifier` | `string` | — | The module specifier to resolve, relative to `parentURL`. |
| `parentURL` | `URL` | — | The WHATWG `URL` that `specifier` is resolved against. |
| `readPackage?` | `(url: URL) => JSON \| null` | — | Called with the `URL` of each package manifest to read; must return the parsed JSON manifest if it exists, or `null`. Returning a promise disables synchronous iteration. |

**Returns** `Iterable<URL>` — Yields each candidate resolution `URL` in the order the algorithm tries them, for the caller to test (e.g. check it exists); if none resolve, iteration simply ends without yielding further values — it does not throw or return `null` for an unresolved specifier.

**Throws**

- `INVALID_MODULE_SPECIFIER` — the specifier (or a `node:`-protocol target) is not a valid module or package specifier: empty, a scoped package name missing the `/`, invalid characters, a relative-style `node:` specifier, an unmatched internal `#import` specifier, or a `file:` path containing an encoded `/` or `\`.
- `INVALID_PACKAGE_TARGET` — a string target in a package's `"exports"` (or non-internal `"imports"`) map does not start with `./`.
- `PACKAGE_PATH_NOT_EXPORTED` — the requested subpath is not defined by the package's `"exports"` map.
- `PACKAGE_IMPORT_NOT_DEFINED` — an internal `#specifier` is not defined by the package's `"imports"` map.
- `UNSUPPORTED_ENGINE` — the package's `"engines"` requirement is not satisfied by the corresponding `opts.engines` entry.

### Types

#### `ResolveOptions`

```ts
interface ResolveOptions {
  builtinProtocol?: string
  builtins?: Builtins
  conditions?: Conditions
  defer?: string[]
  deferredProtocol?: string
  engines?: Engines
  extensions?: string[]
  imports?: ImportsMap
  matchedConditions?: string[]
  resolutions?: ResolutionsMap
}
```

[source](https://github.com/holepunchto/bare-module-resolve/blob/v1.12.3/index.d.ts#L20)

## `bare-module-resolve/errors`

### ModuleResolveError

#### `code: string`

[source](https://github.com/holepunchto/bare-module-resolve/blob/v1.12.3/lib/errors.d.ts#L2)

#### `ModuleResolveError.INVALID_MODULE_SPECIFIER(msg: string): ModuleResolveError`

[source](https://github.com/holepunchto/bare-module-resolve/blob/v1.12.3/lib/errors.d.ts#L4)

**Parameters**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `msg` | `string` | — | The error message. |

**Returns** `ModuleResolveError` — A new `ModuleResolveError` with code `INVALID_MODULE_SPECIFIER`.

#### `ModuleResolveError.INVALID_PACKAGE_TARGET(msg: string): ModuleResolveError`

[source](https://github.com/holepunchto/bare-module-resolve/blob/v1.12.3/lib/errors.d.ts#L5)

**Parameters**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `msg` | `string` | — | The error message. |

**Returns** `ModuleResolveError` — A new `ModuleResolveError` with code `INVALID_PACKAGE_TARGET`.

#### `ModuleResolveError.PACKAGE_IMPORT_NOT_DEFINED(msg: string): ModuleResolveError`

[source](https://github.com/holepunchto/bare-module-resolve/blob/v1.12.3/lib/errors.d.ts#L7)

**Parameters**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `msg` | `string` | — | The error message. |

**Returns** `ModuleResolveError` — A new `ModuleResolveError` with code `PACKAGE_IMPORT_NOT_DEFINED`.

#### `ModuleResolveError.PACKAGE_PATH_NOT_EXPORTED(msg: string): ModuleResolveError`

[source](https://github.com/holepunchto/bare-module-resolve/blob/v1.12.3/lib/errors.d.ts#L6)

**Parameters**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `msg` | `string` | — | The error message. |

**Returns** `ModuleResolveError` — A new `ModuleResolveError` with code `PACKAGE_PATH_NOT_EXPORTED`.

#### `ModuleResolveError.UNSUPPORTED_ENGINE(msg: string): ModuleResolveError`

[source](https://github.com/holepunchto/bare-module-resolve/blob/v1.12.3/lib/errors.d.ts#L8)

**Parameters**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `msg` | `string` | — | The error message. |

**Returns** `ModuleResolveError` — A new `ModuleResolveError` with code `UNSUPPORTED_ENGINE`.
<!-- bare-refgen:api end -->

## License

Apache-2.0
