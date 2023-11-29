# bare-module-resolve

Low-level module resolution algorithm for Bare. The algorithm is implemented as a generator function that yields either package manifests to be read or resolution candidates to be tested by the caller. As a convenience, the main export is a synchronous and asynchronous iterable that relies on package manifests being read by a callback. For asynchronous iteration, the callback may return promises which will be awaited before being passed to the generator.

```
npm i bare-module-resolve
```

## Usage

For synchronous resolution:

``` js
const resolve = require('bare-module-resolve')

function readPackage (url) {
  // Read and parse `url` if it exists, otherwise `null`
}

for (const resolution of resolve('./file.js', new URL('file:///directory/'), readPackage)) {
  console.log(resolution)
}
```

For asynchronous resolution:

``` js
const resolve = require('bare-module-resolve')

async function readPackage (url) {
  // Read and parse `url` if it exists, otherwise `null`
}

for await (const resolution of resolve('./file.js', new URL('file:///directory/'), readPackage)) {
  console.log(resolution)
}
```

## API

#### `const resolver = resolve(specifier, parentURL[, options], readPackage)`

Resolve `specifier` relative to `parentURL`, which must be a WHATWG `URL` instance. `readPackage` is called with a `URL` instance for every package manifest to be read and must either return the parsed JSON package manifest, if it exists, or `null`. If `readPackage` returns a promise, synchronous iteration is not supported.

Options include:

```js
{
  // An additional "imports" map to apply to all specifiers. Follows the same
  // syntax and rules as the "imports" property defined in `package.json`.
  imports: null,
  // A list of builtin module specifiers. If matched, the protocol of the
  // resolved URL will be `builtin:`.
  builtins: [],
  // The supported import conditions. "default" is always recognized.
  conditions: [],
  // The file extensions to look for. Must be provided to support extensionless
  // specifier resolution and directory support, such as resolving './foo' to
  // './foo.js' or './foo/index.js'.
  extensions: []
}
```

#### `for (const resolution of resolver)`

Synchronously iterate the module resolution candidates. The resolved module is the first candidate that exists, either as a file on a file system, a resource at a URL, or something else entirely.

#### `for await (const resolution of resolver)`

Asynchronously iterate the module resolution candidates. If `readPackage` returns promises, these will be awaited. The same comments as `for (const resolution of resolver)` apply.

## License

Apache-2.0
