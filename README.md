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

## License

Apache-2.0
