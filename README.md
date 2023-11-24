# bare-module-resolve

Low-level module resolution algorithm for Bare.

```
npm i bare-module-resolve
```

## Usage

``` js
const resolve = require('bare-module-resolve')

function readPackage (url) {
  if (url.href === 'file:///directory/package.json') {
    return {
      main: './index.js'
    }
  }

  return null
}

for (const resolution of resolve('./file', new URL('file:///directory/'), { extensions: ['.js'] }, readPackage)) {
  console.log(resolution)
}
```

## License

Apache-2.0
