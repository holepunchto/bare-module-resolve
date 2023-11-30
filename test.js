const test = require('brittle')
const resolve = require('.')

test('bare specifier', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {}
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/index.js'])
})

test('bare specifier with subpath', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {}
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d/e', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, [
    'file:///a/b/node_modules/d/e',
    'file:///a/b/node_modules/d/e.js',
    'file:///a/b/node_modules/d/e/index.js'
  ])
})

test('bare specifier with subpath and extension', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {}
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d/e.js', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, [
    'file:///a/b/node_modules/d/e.js',
    'file:///a/b/node_modules/d/e.js.js',
    'file:///a/b/node_modules/d/e.js/index.js'
  ])
})

test('bare specifier with package.json#main', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {
        main: 'e'
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, [
    'file:///a/b/node_modules/d/e',
    'file:///a/b/node_modules/d/e.js',
    'file:///a/b/node_modules/d/e/index.js'
  ])
})

test('bare specifier with empty package.json#main', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {
        main: ''
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/index.js'])
})

test('bare specifier with packge.json#imports', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {
        imports: {
          f: './g.js'
        }
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('f', new URL('file:///a/b/node_modules/d/e.js'), { extensions: ['.js'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/g.js'])
})

test('bare specifier with packge.json#imports, map to builtin', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {
        imports: {
          f: 'foo'
        }
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('f', new URL('file:///a/b/node_modules/d/e.js'), { extensions: ['.js'], builtins: ['foo'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['builtin:foo'])
})

test('bare specifier with scope', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/@s/d/package.json') {
      return {}
    }

    return null
  }

  const result = []

  for (const resolution of resolve('@s/d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/@s/d/index.js'])
})

test('bare specifier with scope and subpath', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/@s/d/package.json') {
      return {}
    }

    return null
  }

  const result = []

  for (const resolution of resolve('@s/d/e', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, [
    'file:///a/b/node_modules/@s/d/e',
    'file:///a/b/node_modules/@s/d/e.js',
    'file:///a/b/node_modules/@s/d/e/index.js'
  ])
})

test('bare specifier with invalid scope', (t) => {
  try {
    for (const resolution of resolve('@s', new URL('file:///a/b/c'), noPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.comment(err.message)
    t.ok(err)
  }

  try {
    for (const resolution of resolve('@s/d\\', new URL('file:///a/b/c'), noPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.comment(err.message)
    t.ok(err)
  }

  try {
    for (const resolution of resolve('@s/d%', new URL('file:///a/b/c'), noPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.comment(err.message)
    t.ok(err)
  }
})

test('bare specifier with trailing slash', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {}
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d/', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/index.js'])
})

test('relative specifier', (t) => {
  const result = []

  for (const resolution of resolve('./d', new URL('file:///a/b/c'), { extensions: ['.js'] }, noPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, [
    'file:///a/b/d',
    'file:///a/b/d.js',
    'file:///a/b/d/index.js'
  ])
})

test('relative specifier with no default extensions', (t) => {
  const result = []

  for (const resolution of resolve('./d', new URL('file:///a/b/c'), noPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/d'])
})

test('relative specifier with extension', (t) => {
  const result = []

  for (const resolution of resolve('./d.js', new URL('file:///a/b/c'), { extensions: ['.js'] }, noPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, [
    'file:///a/b/d.js',
    'file:///a/b/d.js.js',
    'file:///a/b/d.js/index.js'
  ])
})

test('relative specifier with extension and no default extensions', (t) => {
  const result = []

  for (const resolution of resolve('./d.js', new URL('file:///a/b/c'), noPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/d.js'])
})

test('relative specifier with scoped package.json#main', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/d/package.json') {
      return {
        main: 'e'
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('./d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, [
    'file:///a/b/d',
    'file:///a/b/d.js',
    'file:///a/b/d/e',
    'file:///a/b/d/e.js',
    'file:///a/b/d/e/index.js'
  ])
})

test('relative specifier with scoped package.json#exports', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/d/package.json') {
      return {
        exports: './e.js'
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('./d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, [
    'file:///a/b/d',
    'file:///a/b/d.js',
    'file:///a/b/d/e.js'
  ])
})

test('relative specifier with percent encoded /', async (t) => {
  try {
    for (const resolution of resolve('./d%2fe', new URL('file:///a/b/c'), noPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.comment(err.message)
    t.ok(err)
  }

  try {
    for (const resolution of resolve('./d%2Fe', new URL('file:///a/b/c'), noPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.comment(err.message)
    t.ok(err)
  }
})

test('relative specifier with percent encoded \\', async (t) => {
  try {
    for (const resolution of resolve('./d%5ce', new URL('file:///a/b/c'), noPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.comment(err.message)
    t.ok(err)
  }

  try {
    for (const resolution of resolve('./d%5Ce', new URL('file:///a/b/c'), noPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.comment(err.message)
    t.ok(err)
  }
})

test('relative specifier with trailing slash', (t) => {
  const result = []

  for (const resolution of resolve('./d/', new URL('file:///a/b/c'), { extensions: ['.js'] }, noPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/d/index.js'])
})

test('relative specifier, current directory', (t) => {
  const result = []

  for (const resolution of resolve('.', new URL('file:///a/b/c'), { extensions: ['.js'] }, noPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/index.js'])
})

test('relative specifier, parent directory', (t) => {
  const result = []

  for (const resolution of resolve('..', new URL('file:///a/b/c'), { extensions: ['.js'] }, noPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/index.js'])
})

test('absolute specifier', (t) => {
  const result = []

  for (const resolution of resolve('/d', new URL('file:///a/b/c'), { extensions: ['.js'] }, noPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, [
    'file:///d',
    'file:///d.js',
    'file:///d/index.js'
  ])
})

test('absolute specifier with trailing slash', (t) => {
  const result = []

  for (const resolution of resolve('/d/', new URL('file:///a/b/c'), { extensions: ['.js'] }, noPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///d/index.js'])
})

test('absolute specifier, root directory', (t) => {
  const result = []

  for (const resolution of resolve('/', new URL('file:///a/b/c'), { extensions: ['.js'] }, noPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///index.js'])
})

test('package.json#exports with expansion key', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {
        exports: {
          './e/*.js': './f/*.js'
        }
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d/e/g.js', new URL('file:///a/b/c'), readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/f/g.js'])
})

test('package.json#exports with conditions', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
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

  let result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), { conditions: ['require'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.cjs'])

  result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), { conditions: ['import'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.mjs'])

  result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.js'])
})

test('package.json#exports with conditions and array targets', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {
        exports: [
          {
            require: './e.cjs',
            import: './e.mjs'
          },
          './e.js'
        ]
      }
    }

    return null
  }

  let result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), { conditions: ['require'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.cjs'])

  result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), { conditions: ['import'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.mjs'])

  result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.js'])
})

test('package.json#exports with conditions and array targets with no match', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {
        exports: [
          {
            require: './e.cjs',
            import: './e.mjs'
          }
        ]
      }
    }

    return null
  }

  try {
    for (const resolution of resolve('d', new URL('file:///a/b/c'), readPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.comment(err.message)
    t.ok(err)
  }
})

test('package.json#exports with conditions and subpath', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
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

  let result = []

  for (const resolution of resolve('d/e', new URL('file:///a/b/c'), { conditions: ['require'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.cjs'])

  result = []

  for (const resolution of resolve('d/e', new URL('file:///a/b/c'), { conditions: ['import'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.mjs'])

  result = []

  for (const resolution of resolve('d/e', new URL('file:///a/b/c'), readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.js'])
})

test('package.json#exports with self reference', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/d/package.json') {
      return {
        name: 'd',
        exports: './e.js'
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d', new URL('file:///a/b/d/'), readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, [
    'file:///a/b/d/e.js'
  ])
})

test('package.json#exports with self reference and name mismatch', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/d/package.json') {
      return {
        name: 'e',
        exports: './e.js'
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d', new URL('file:///a/b/d/'), readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, [])
})

test('package.json#exports with unexported subpath', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {
        exports: {
          '.': './e.js',
          './f': './f.js'
        }
      }
    }

    return null
  }

  try {
    for (const resolution of resolve('d/g', new URL('file:///a/b/c'), readPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.comment(err.message)
    t.ok(err)
  }
})

test('package.json#exports with invalid target', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {
        exports: {
          '.': 'e.js',
          './f': 'f.js'
        }
      }
    }

    return null
  }

  try {
    for (const resolution of resolve('d', new URL('file:///a/b/c'), readPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.comment(err.message)
    t.ok(err)
  }
})

test('package.json#imports with expansion key', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/d/package.json') {
      return {
        imports: {
          './e/*.js': './f/*.js'
        }
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('./e/g.js', new URL('file:///a/b/d/'), readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/d/f/g.js'])
})

test('package.json#imports with private key', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/d/package.json') {
      return {
        imports: {
          '#e': './e.js'
        }
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('#e', new URL('file:///a/b/d/'), readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/d/e.js'])
})

test('package.json#imports with private key and no match', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/d/package.json') {
      return {
        imports: {
          '#e': './e.js'
        }
      }
    }

    return null
  }

  try {
    for (const resolution of resolve('#f', new URL('file:///a/b/d/'), readPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.comment(err.message)
    t.ok(err)
  }
})

test('package.json#imports with invalid key', (t) => {
  try {
    for (const resolution of resolve('#', new URL('file:///a/b/c'), noPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.comment(err.message)
    t.ok(err)
  }

  try {
    for (const resolution of resolve('#/e', new URL('file:///a/b/c'), noPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.comment(err.message)
    t.ok(err)
  }
})

test('package.json#imports with private expansion key', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/d/package.json') {
      return {
        imports: {
          '#e/*.js': './f/*.js'
        }
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('#e/g.js', new URL('file:///a/b/d/'), readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/d/f/g.js'])
})

test('package.json#main in scope with trailing slash', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/d/package.json') {
      return {
        main: 'e/'
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('./d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, [
    'file:///a/b/d',
    'file:///a/b/d.js',
    'file:///a/b/d/e/index.js'
  ])
})

test('package.json#main in module with trailing slash', (t) => {
  function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {
        main: 'e/'
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, [
    'file:///a/b/node_modules/d/e/index.js'
  ])
})

test('empty specifier', (t) => {
  try {
    for (const resolution of resolve('', new URL('file:///a/b/c'), noPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.comment(err.message)
    t.ok(err)
  }
})

test('async package reads', async (t) => {
  async function readPackage (url) {
    if (decodeURIComponent(url.href) === 'file:///a/b/node_modules/d/package.json') {
      return {}
    }

    return null
  }

  const result = []

  for await (const resolution of resolve('d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/node_modules/d/index.js'])
})

test('imports override with bare specifier', (t) => {
  const imports = {
    d: './e.js'
  }

  const result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), { imports }, noPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/e.js'])
})

test('imports override with relative specifier', (t) => {
  const imports = {
    './d': './e.js'
  }

  const result = []

  for (const resolution of resolve('./d', new URL('file:///a/b/c'), { imports }, noPackage)) {
    result.push(decodeURIComponent(resolution.href))
  }

  t.alike(result, ['file:///a/b/e.js'])
})

function noPackage () {
  return null
}
