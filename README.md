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

#### `const resolver = resolve(specifier, parentURL[, options][, readPackage])`

Resolve `specifier` relative to `parentURL`, which must be a WHATWG `URL` instance. `readPackage` is called with a `URL` instance for every package manifest to be read and must either return the parsed JSON package manifest, if it exists, or `null`. If `readPackage` returns a promise, synchronous iteration is not supported.

Options include:

```js
{
  // A default "imports" map to apply to all specifiers. Follows the same
  // syntax and rules as the "imports" property defined in `package.json`.
  imports,
  // A list of builtin module specifiers. If matched, the protocol of the
  // resolved URL will be `builtinProtocol`.
  builtins: [],
  // The protocol to use for resolved builtin module specifiers.
  builtinProtocol: 'builtin:',
  // The supported import conditions. "default" is always recognized.
  conditions: [],
  // The supported engine versions.
  engines: {},
  // The file extensions to look for. Must be provided to support extensionless
  // specifier resolution and directory support, such as resolving './foo' to
  // './foo.js' or './foo/index.js'.
  extensions: [],
  // A map of preresolved imports with keys being serialized parent URLs and
  // values being "imports" maps.
  resolutions
}
```

#### `for (const resolution of resolver)`

Synchronously iterate the module resolution candidates. The resolved module is the first candidate that exists, either as a file on a file system, a resource at a URL, or something else entirely.

#### `for await (const resolution of resolver)`

Asynchronously iterate the module resolution candidates. If `readPackage` returns promises, these will be awaited. The same comments as `for (const resolution of resolver)` apply.

### Algorithm

The following generator functions implement the resolution algorithm, which has been adapted from the Node.js resolution algorithms for CommonJS and ES modules. Unlike Node.js, Bare uses the same resolution algorithm for both module formats.

To drive the generator functions, a loop like the following can be used:

```js
const generator = resolve.module(specifier, parentURL)

let next = generator.next()

while (next.done !== true) {
  const value = next.value

  if (value.package) {
    const info = /* Read and parse `value.package` if it exists, otherwise `null` */;

    next = generator.next(info)
  } else {
    const resolution = value.resolution

    next = generator.next()
  }
}
```

Options are the same as `resolve()` for all functions.

#### `const generator = resolve.module(specifier, parentURL[, options])`

1.  If `specifier` [starts with a Windows drive letter](https://url.spec.whatwg.org/#start-with-a-windows-drive-letter):
    1.  Prepend `/` to `specifier`.
2.  If `options.resolutions` is set:
    1.  If `preresolved(specifier, options.resolutions, parentURL, options)` returns `true`:
        1.  Return `true`.
4.  If `url(specifier, parentURL, options)` returns `true`:
    1.  Return `true`.
5.  If `packageImports(specifier, parentURL, options)` returns `true`:
    1.  Return `true`.
6.  If `specifier` equals `.` or `..`, or if `specifier` starts with `/`, `\`, `./`, `.\`, `../`, or `..\`:
    1.  If `options.imports` is set:
        1.  If `packageImportsExports(specifier, options.imports, parentURL, true, options)` returns `true`:
            1.  Return `true`.
    2.  Let `yielded` be `false`.
    3.  If `file(specifier, parentURL, false, options)` returns `true`:
        1.  Set `yielded` to `true`.
    4.  If `directory(specifier, parentURL, options)` returns `true`:
        1.  Set `yielded` to `true`.
    5.  Return `yielded`.
7.  Return `package(specifier, parentURL, options)`.

#### `const generator = resolve.url(url, parentURL[, options])`

1.  If `url` is not a valid URL:
    1.  Return `false`.
2.  If `options.imports` is set:
    1.  If `packageImportsExports(url.href, options.imports, parentURL, true, options)` returns `true`:
        1.  Return `true`.
3.  If `url.protocol` equals `node:`:
    1.  Let `specifier` be `url.pathname`.
    2.  If `specifier` equals `.` or `..`, or if `specifier` starts with `/`, `\`, `./`, `.\`, `../`, or `..\`, throw.
    3.  Return `package(specifier, parentURL, options)`
4.  Yield `url` and return `true`.

#### `const generator = resolve.preresolved(specifier, resolutions, parentURL[, options])`

1.  Let `imports` be `resolutions[parentURL]`.
2.  If `imports` is a non-`null` object:
    1.  Return `packageImportsExports(specifier, imports, parentURL, true, options)`
3.  Return `false`.

#### `const generator = resolve.package(packageSpecifier, parentURL[, options])`

1.  If `packageSpecifier` is the empty string, throw.
2.  If `packageSpecifier` does not start with `@`:
    1.  Set `packageName` to the substring of `packageSpecifier` until the first `/` or the end of the string.
3.  Let `packageName` be `undefined`.
4.  Otherwise:
    1.  If `packageSpecifier` does not include `/`, throw.
    2.  Set `packageName` to the substring of `packageSpecifier` until the second `/` or the end of the string.
5.  If `packageName` starts with `.` or includes `\` or `%`, throw.
6.  If `builtinTarget(packageSpecifier, null, options.builtins, options)` returns `true`:
    1.  Return `true`.
7.  Let `packageSubpath` be `.` concatenated with the substring of `packageSpecifier` from the position at the length of `packageName`.
8.  If `packageSelf(packageName, packageSubpath, parentURL, options)` returns `true`:
    1.  Return `true`.
9.  Repeat:
    1.  Let `packageURL` be the resolution of `node_modules/` concatenated with `packageName` and `/` relative to `parentURL`.
    2.  Set `parentURL` to the substring of `parentURL` until the last `/`.
    3.  Let `info` be the result of yielding the resolution of `package.json` relative to `packageURL`.
    4.  If `info` is not `null`:
        1.  If `info.engines` is set:
            1.  Call `validateEngines(packageURL, info.engines, options)`.
        2.  If `info.exports` is set:
            1.  Return `packageExports(packageURL, packageSubpath, info.exports, options)`.
        3.  If `packageSubpath` is `.`:
            1.  If `info.main` is a non-empty string:
                1.  Set `packageSubpath` to `info.main`.
            2.  Otherwise:
                1.  Return `file('index', packageURL, true, options)`.
        4.  Let `yielded` be `false`.
            1.  If `file(packageSubpath, packageURL, false, options)` returns `true`:
                1.  Set `yielded` to `true`.
            2.  If `directory(packageSubpath, packageURL, options)` returns `true`:
                1.  Set `yielded` to `true`.
            3.  Return `yielded`.
    5.  If `parentURL` is the file system root:
        1. Return `false`.

#### `const generator = resolve.packageSelf(packageName, packageSubpath, parentURL[, options])`

1.  For each value `packageURL` of `lookupPackageScope(parentURL, options)`:
    1.  Let `info` be the result of yielding `packageURL`.
    2.  If `info` is not `null`:
        1.  If not `info.name` equals `packageName`:
            1.  Return `false`.
        2.  If `info.exports` is set:
            1.  Return `packageExports(packageURL, packageSubpath, info.exports, options)`.
        3.  If `packageSubpath` is `.`:
            1.  If `info.main` is a non-empty string:
                1.  Set `packageSubpath` to `info.main`.
            2.  Otherwise:
                1.  Return `file('index', packageURL, true, options)`.
        4.  Let `yielded` be `false`.
            1.  If `file(packageSubpath, packageURL, false, options)` returns `true`:
                1.  Set `yielded` to `true`.
            2.  If `directory(packageSubpath, packageURL, options)` returns `true`:
                1.  Set `yielded` to `true`.
            3.  Return `yielded`.
2.  Return `false`.

#### `const generator = resolve.packageExports(packageURL, subpath, exports[, options])`

1.  If `subpath` is `.`:
    1.  Let `mainExport` be `undefined`.
    2.  If `exports` is a string or an array:
        1.  Set `mainExport` to `exports`.
    3.  If `exports` is a non-`null` object:
        1.  If some keys of `exports` start with `.`:
            1.  If `.` is a key of `exports`:
                1.  Set `mainExport` to `exports['.']`.
        2.  Otherwise:
            1.  Set `mainExport` to `exports`.
    4.  If `mainExport` is not `undefined`:
        1.  If `packageTarget(packageURL, mainExport, null, false, options)` returns `true`:
            1.  Return `true`.
2.  Otherwise, if `exports` is a non-`null` object:
    1.  If every key of `exports` starts with `.`:
        1.  If `packageImportsExports(subpath, exports, packageURL, false, options)` returns `true`:
            1.  Return `true`.
3. Throw.

#### `const generator = resolve.packageImports(specifier, parentURL[, options])`

1.  If `specifier` is `#` or starts with `#/`, throw.
2.  For each value `packageURL` of `lookupPackageScope(parentURL, opions)`:
    1.  Let `info` be the result of yielding `packageURL`.
    2.  If `info` is not `null`:
        1.  If `info.imports` is set:
            1.  If `packageImportsExports(specifier, info.imports, packageURL, true, options)` returns `true`:
                1.  Return `true`.
        2.  If specifier starts with `#`, throw.
        3.  Return `false`.
3.  If `options.imports` is set:
    1.  If `packageImportsExports(url.href, options.imports, parentURL, true, options)` returns `true`:
        1.  Return `true`.
4.  Return `false`.

#### `const generator = resolve.packageImportsExports(matchKey, matchObject, packageURL, isImports[, options])`

1.  If `matchKey` is a key of `matchObject` and `matchKey` does not include `*`:
    1.  Let `target` be `matchObject[matchKey]`.
    2.  Return `packageTarget(packageURL, target, null, isImports, options)`.
2.  Let `expansionKeys` be the keys of `matchObject` that include `*` sorted by `patternKeyCompare`.
3.  For each value `expansionKey` of `expansionKeys`:
    1.  Let `patternBase` be the substring of `expansionKey` until the first `*`.
    2.  If `matchKey` starts with but isn't equal to `patternBase`:
        1.  Let `patternTrailer` be the substring of `expansionKey` from the position at the index after the first `*`.
        2.  If `patternTrailer` is the empty string, or if `matchKey` ends with `patternTrailer` and the length of `matchKey` is greater than or equal to the length of `expansionKey`:
            1.  Let `target` be `matchObject[expansionKey]`.
            2.  Let `patternMatch` be the substring of `matchKey` from the position at the length of `patternBase` until the length of `matchKey` minus the length of `patternTrailer`.
            3.  Return `packageTarget(packageURL, target, patternMatch, isImports, options)`.
4.  Return `false`.

#### `const generator = resolve.packageTarget(packageURL, target, patternMatch, isImports[, options])`

1.  If `target` is a string:
    1.  If `target` does not start with `./` and `isImports` is `false`, throw.
    2.  If `patternMatch` is not `null`:
        1.  Replace every instance of `*` in `target` with `patternMatch`.
    3.  If `url(target, packageURL, options)` returns `true`:
        1.  Return `true`.
    4.  If `target` equals `.` or `..`, or if `target` starts with `/`, `./`, or `../`:
        1.  Yield the resolution of `target` relative to `packageURL` and return `true`.
    5.  Return `package(target, packageURL, options)`.
2.  If `target` is an array:
    1.  For each value `targetValue` of `target`:
        1.  If `packageTarget(packageURL, targetValue, patternMatch, isImports, options)` returns `true`:
            1.  Return `true`.
3.  If `target` is a non-`null` object:
    1.  For each key `p` of `target`:
        1.  If `p` equals `default` or if `options.conditions` includes `p`:
            1.  Let `targetValue` be `target[p]`.
            2.  Return `packageTarget(packageURL, targetValue, patternMatch, isImports, options)`.
4.  Return `false`.

#### `const generator = resolve.builtinTarget(packageSpecifier, packageVersion, target[, options])`

1.  If `target` is a string:
    1.  If `target` does not start with `@`:
        1.  Let `targetName` be the substring of `target` until the first `@` or the end of the string.
        2.  Let `targetVersion` be the substring of `target` from the character following the first `@` and to the end of string, or `null` if no such substring exists.
    2.  Otherwise:
        1.  Let `targetName` be the substring of `target` until the second `@` or the end of the string.
        2.  Let `targetVersion` be the substring of `target` from the character following the second `@` and to the end of string, or `null` if no such substring exists.
    1.  If `packageSpecifier` equals `targetName`:
        1.  If `packageVersion` is `null` and `targetVersion` is `null`:
            1.  Yield `options.builtinProtocol` concatenated with `packageSpecifier` and return `true`.
        2.  Let `version` be `null`.
        3.  If `packageVersion` is `null`, let `version` be `targetVersion`.
        4.  Otherwise, if `targetVersion` is either `null` or equals `packageVersion`, let `version` be `packageVersion`
        5.  If `version` is not `null`:
            1.  Yield `options.builtinProtocol` concatenated with `packageSpecifier`, `@`, and `version` and return `true`.
2.  If `target` is an array:
    1.  For each value `targetValue` of `target`:
        1.  If `builtinTarget(packageSpecifier, packageVersion, targetValue, options)` returns `true`:
            1.  Return `true`.
3.  If `target` is a non-`null` object:
    1.  For each key `p` of `target`:
        1.  If `p` equals `default` or if `options.conditions` includes `p`:
            1.  Let `targetValue` be `target[p]`.
            2.  Return `builtinTarget(packageSpecifier, packageVersion, targetValue, options)`.
4.  Return `false`.

#### `const generator = resolve.file(filename, parentURL, isIndex[, options])`

1.  If `filename` equals `.` or `..`, or if `filename` ends with `/` or `\`:
    1.  Return `false`.
2.  If `parentURL` is a `file:` URL and `filename` includes encoded `/` or `\`, throw.
3.  If `isIndex` is `false`:
    1.  Yield the resolution of `filename` relative to `parentURL`.
4.  For each value `ext` of `options.extensions`:
    1.  Yield the resolution of `filename` concatenated with `ext` relative to `parentURL`.
5.  If `isIndex` is `false` or `options.extensions` is non-empty:
    1.  Return `true`.
6.  Return `false`.

#### `const generator = resolve.directory(dirname, parentURL[, options])`

1.  Let `directoryURL` be `undefined`.
2.  If `dirname` ends with `/` or `\`:
    1.  Set `directoryURL` to the resolution of `dirname` relative to `parentURL`.
3.  Otherwise:
    1.  Set `directoryURL` to the resolution of `dirname` concatenated with `/` relative to `parentURL`.
4.  Let `info` be the result of yielding the resolution of `package.json` relative to `directoryURL`.
5.  If `info` is not `null`:
    1.  If `info.exports` is set:
        1.  Return `packageExports(directoryURL, '.', info.exports, options)`.
    2.  If `info.main` is a non-empty string:
        1.  Let `yielded` be `false`.
        2.  If `file(info.main, directoryURL, false, options)` returns `true`:
            1.  Set `yielded` to `true`.
        3.  If `directory(info.main, directoryURL, options)` returns `true`:
            1.  Set `yielded` to `true`.
        4.  Return `yielded`.
6.  Return `file('index', directoryURL, true, options)`.

## License

Apache-2.0
