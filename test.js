const test = require('brittle')
const resolve = require('.')
const { url, expand } = require('./test/helpers')

test('bare specifier', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {}
    }

    return null
  }

  t.alike(
    expand(resolve('d', url('file:///a/b/c'), { extensions: ['.js'] }, readPackage)),
    [
      'file:///a/b/node_modules/d/index.js'
    ]
  )
})

test('bare specifier with subpath', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {}
    }

    return null
  }

  t.alike(
    expand(resolve('d/e', url('file:///a/b/c'), { extensions: ['.js'] }, readPackage)),
    [
      'file:///a/b/node_modules/d/e',
      'file:///a/b/node_modules/d/e.js',
      'file:///a/b/node_modules/d/e/index.js'
    ]
  )
})

test('bare specifier with subpath and extension', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {}
    }

    return null
  }

  t.alike(
    expand(resolve('d/e.js', url('file:///a/b/c'), { extensions: ['.js'] }, readPackage)),
    [
      'file:///a/b/node_modules/d/e.js',
      'file:///a/b/node_modules/d/e.js.js',
      'file:///a/b/node_modules/d/e.js/index.js'
    ]
  )
})

test('bare specifier with package.json#main', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {
        main: 'e.js'
      }
    }

    return null
  }

  t.alike(
    expand(resolve('d', url('file:///a/b/c'), { extensions: ['.js'] }, readPackage)),
    [
      'file:///a/b/node_modules/d/e.js'
    ]
  )
})

test('bare specifier with packge.json#imports', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {
        imports: {
          f: './g.js'
        }
      }
    }

    return null
  }

  t.alike(
    expand(resolve('f', url('file:///a/b/node_modules/d/e.js'), { extensions: ['.js'] }, readPackage)),
    [
      'file:///a/b/node_modules/d/g.js'
    ]
  )
})

test('bare specifier with packge.json#imports, map to builtin', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {
        imports: {
          f: 'foo'
        }
      }
    }

    return null
  }

  t.alike(
    expand(resolve('f', url('file:///a/b/node_modules/d/e.js'), { extensions: ['.js'], builtins: ['foo'] }, readPackage)),
    [
      'builtin:foo'
    ]
  )
})

test('relative specifier', (t) => {
  t.alike(
    expand(resolve('./d', url('file:///a/b/c'), { extensions: ['.js'] }, noPackage)),
    [
      'file:///a/b/d',
      'file:///a/b/d.js',
      'file:///a/b/d/index.js'
    ]
  )
})

test('relative specifier with no default extensions', (t) => {
  t.alike(
    expand(resolve('./d', url('file:///a/b/c'), noPackage)),
    [
      'file:///a/b/d'
    ]
  )
})

test('relative specifier with extension', (t) => {
  t.alike(
    expand(resolve('./d.js', url('file:///a/b/c'), { extensions: ['.js'] }, noPackage)),
    [
      'file:///a/b/d.js',
      'file:///a/b/d.js.js',
      'file:///a/b/d.js/index.js'
    ]
  )
})

test('relative specifier with extension and no default extensions', (t) => {
  t.alike(
    expand(resolve('./d.js', url('file:///a/b/c'), noPackage)),
    [
      'file:///a/b/d.js'
    ]
  )
})

test('relative specifier with scoped package.json#main', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/d/package.json') {
      return {
        main: 'e.js'
      }
    }

    return null
  }

  t.alike(
    expand(resolve('./d', url('file:///a/b/c'), { extensions: ['.js'] }, readPackage)),
    [
      'file:///a/b/d',
      'file:///a/b/d.js',
      'file:///a/b/d/e.js'
    ]
  )
})

test('relative specifier with scoped package.json#exports', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/d/package.json') {
      return {
        exports: './e.js'
      }
    }

    return null
  }

  t.alike(
    expand(resolve('./d', url('file:///a/b/c'), { extensions: ['.js'] }, readPackage)),
    [
      'file:///a/b/d',
      'file:///a/b/d.js',
      'file:///a/b/d/e.js'
    ]
  )
})

test('relative specifier with percent encoded /', async (t) => {
  await t.exception(
    () => expand(resolve('./d%2fe', url('file:///a/b/c'), noPackage))
  )

  await t.exception(
    () => expand(resolve('./d%2Fe', url('file:///a/b/c'), noPackage))
  )
})

test('relative specifier with percent encoded \\', async (t) => {
  await t.exception(
    () => expand(resolve('./d%5ce', url('file:///a/b/c'), noPackage))
  )

  await t.exception(
    () => expand(resolve('./d%5Ce', url('file:///a/b/c'), noPackage))
  )
})

test('package.json#exports with expansion key', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {
        exports: {
          './e/*.js': './f/*.js'
        }
      }
    }

    return null
  }

  t.alike(
    expand(resolve('d/e/g.js', url('file:///a/b/c'), readPackage)),
    [
      'file:///a/b/node_modules/d/f/g.js'
    ]
  )
})

test('package.json#exports with conditions', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {
        exports: {
          require: './e.cjs',
          import: './e.mjs',
          default: './e.js'
        }
      }
    }

    return null
  }

  t.alike(
    expand(resolve('d', url('file:///a/b/c'), { conditions: ['require'] }, readPackage)),
    [
      'file:///a/b/node_modules/d/e.cjs'
    ]
  )

  t.alike(
    expand(resolve('d', url('file:///a/b/c'), { conditions: ['import'] }, readPackage)),
    [
      'file:///a/b/node_modules/d/e.mjs'
    ]
  )

  t.alike(
    expand(resolve('d', url('file:///a/b/c'), readPackage)),
    [
      'file:///a/b/node_modules/d/e.js'
    ]
  )
})

test('package.json#exports with conditions and subpath', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {
        exports: {
          './e': {
            require: './e.cjs',
            import: './e.mjs',
            default: './e.js'
          }
        }
      }
    }

    return null
  }

  t.alike(
    expand(resolve('d/e', url('file:///a/b/c'), { conditions: ['require'] }, readPackage)),
    [
      'file:///a/b/node_modules/d/e.cjs'
    ]
  )

  t.alike(
    expand(resolve('d/e', url('file:///a/b/c'), { conditions: ['import'] }, readPackage)),
    [
      'file:///a/b/node_modules/d/e.mjs'
    ]
  )

  t.alike(
    expand(resolve('d/e', url('file:///a/b/c'), readPackage)),
    [
      'file:///a/b/node_modules/d/e.js'
    ]
  )
})

test('package.json#imports with expansion key', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/d/package.json') {
      return {
        imports: {
          './e/*.js': './f/*.js'
        }
      }
    }

    return null
  }

  t.alike(
    expand(resolve('./e/g.js', url('file:///a/b/d/'), readPackage)),
    [
      'file:///a/b/d/f/g.js'
    ]
  )
})

test('package.json#imports with private key', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/d/package.json') {
      return {
        imports: {
          '#e': './e.js'
        }
      }
    }

    return null
  }

  t.alike(
    expand(resolve('#e', url('file:///a/b/d/'), readPackage)),
    [
      'file:///a/b/d/e.js'
    ]
  )
})

test('package.json#imports with private expansion key', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/d/package.json') {
      return {
        imports: {
          '#e/*.js': './f/*.js'
        }
      }
    }

    return null
  }

  t.alike(
    expand(resolve('#e/g.js', url('file:///a/b/d/'), readPackage)),
    [
      'file:///a/b/d/f/g.js'
    ]
  )
})

function noPackage () {
  return null
}
