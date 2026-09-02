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

## API

See the [`bare-module-resolve` reference](https://docs.pears.com/reference/bare/modules/bare-module-resolve).

## Algorithm

The following generator functions implement the resolution algorithm, which has been adapted from the Node.js resolution algorithms for CommonJS and ES modules. Unlike Node.js, Bare uses the same resolution algorithm for both module formats. The yielded values have the following shape:

**Package manifest**

```js
next.value = {
  package: URL
}
```

If the package manifest identified by `next.value.package` exists, `generator.next()` must be passed the parsed JSON value of the manifest. If it does not exist, pass `null` instead.

**Resolution candidate**

```js
next.value = {
  resolution: URL
}
```

If the module identified by `next.value.resolution` exists, `generator.next()` may be passed `true` to signal that the resolution for the current set of conditions has been identified. If it does not exist, pass `false` instead.

To drive the generator functions, a loop like the following can be used:

```js
const generator = resolve.module(specifier, parentURL)

let next = generator.next()

while (next.done !== true) {
  const value = next.value

  if (value.package) {
    // Read and parse `value.package` if it exists, otherwise `null`
    let info

    next = generator.next(info)
  } else {
    const resolution = value.resolution

    // `true` if `resolution` was the correct candidate, otherwise `false`
    let resolved

    next = generator.next(resolved)
  }
}
```

Options are the same as `resolve()` for all functions.

> [!WARNING]
> These functions are currently subject to change between minor releases. If using them directly, make sure to specify a tilde range (`~1.2.3`) when declaring the module dependency.

## License

Apache-2.0
