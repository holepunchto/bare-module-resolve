const test = require('brittle')
const resolve = require('.')

test('bare specifier', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {}
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/node_modules/d/index.js'])
})

test('bare specifier with subpath', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {}
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d/e', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, [
    'file:///a/b/node_modules/d/e',
    'file:///a/b/node_modules/d/e.js',
    'file:///a/b/node_modules/d/e/index.js'
  ])
})

test('bare specifier with subpath and extension', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {}
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d/e.js', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, [
    'file:///a/b/node_modules/d/e.js',
    'file:///a/b/node_modules/d/e.js.js',
    'file:///a/b/node_modules/d/e.js/index.js'
  ])
})

test('bare specifier with package.json#main', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {
        main: 'e'
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, [
    'file:///a/b/node_modules/d/e',
    'file:///a/b/node_modules/d/e.js',
    'file:///a/b/node_modules/d/e/index.js'
  ])
})

test('bare specifier with empty package.json#main', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {
        main: ''
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/node_modules/d/index.js'])
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

  const result = []

  for (const resolution of resolve('f', new URL('file:///a/b/node_modules/d/e.js'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/node_modules/d/g.js'])
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

  const result = []

  for (const resolution of resolve('f', new URL('file:///a/b/node_modules/d/e.js'), { extensions: ['.js'], builtins: ['foo'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['builtin:foo'])
})

test('bare specifier with scope', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/@s/d/package.json') {
      return {}
    }

    return null
  }

  const result = []

  for (const resolution of resolve('@s/d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/node_modules/@s/d/index.js'])
})

test('bare specifier with scope and subpath', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/@s/d/package.json') {
      return {}
    }

    return null
  }

  const result = []

  for (const resolution of resolve('@s/d/e', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, [
    'file:///a/b/node_modules/@s/d/e',
    'file:///a/b/node_modules/@s/d/e.js',
    'file:///a/b/node_modules/@s/d/e/index.js'
  ])
})

test('bare specifier with trailing slash', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {}
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d/', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/node_modules/d/index.js'])
})

test('relative specifier', (t) => {
  const result = []

  for (const resolution of resolve('./d', new URL('file:///a/b/c'), { extensions: ['.js'] }, noPackage)) {
    result.push(resolution.href)
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
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/d'])
})

test('relative specifier with extension', (t) => {
  const result = []

  for (const resolution of resolve('./d.js', new URL('file:///a/b/c'), { extensions: ['.js'] }, noPackage)) {
    result.push(resolution.href)
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
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/d.js'])
})

test('relative specifier with scoped package.json#main', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/d/package.json') {
      return {
        main: 'e'
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('./d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
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
    if (url.href === 'file:///a/b/d/package.json') {
      return {
        exports: './e.js'
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('./d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
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
    t.ok(err)
  }

  try {
    for (const resolution of resolve('./d%2Fe', new URL('file:///a/b/c'), noPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
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
    t.ok(err)
  }

  try {
    for (const resolution of resolve('./d%5Ce', new URL('file:///a/b/c'), noPackage)) {
      t.absent(resolution)
    }

    t.fail()
  } catch (err) {
    t.ok(err)
  }
})

test('relative specifier with trailing slash', (t) => {
  const result = []

  for (const resolution of resolve('./d/', new URL('file:///a/b/c'), { extensions: ['.js'] }, noPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/d/index.js'])
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

  const result = []

  for (const resolution of resolve('d/e/g.js', new URL('file:///a/b/c'), readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/node_modules/d/f/g.js'])
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

  let result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), { conditions: ['require'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.cjs'])

  result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), { conditions: ['import'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.mjs'])

  result = []

  for (const resolution of resolve('d', new URL('file:///a/b/c'), readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.js'])
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

  let result = []

  for (const resolution of resolve('d/e', new URL('file:///a/b/c'), { conditions: ['require'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.cjs'])

  result = []

  for (const resolution of resolve('d/e', new URL('file:///a/b/c'), { conditions: ['import'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.mjs'])

  result = []

  for (const resolution of resolve('d/e', new URL('file:///a/b/c'), readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/node_modules/d/e.js'])
})

test('package.json#exports with self reference', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/d/package.json') {
      return {
        name: 'd',
        exports: './e.js'
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d', new URL('file:///a/b/d/'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, [
    'file:///a/b/d/e.js'
  ])
})

test('package.json#exports with self reference and name mismatch', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/d/package.json') {
      return {
        name: 'e',
        exports: './e.js'
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('d', new URL('file:///a/b/d/'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, [])
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

  const result = []

  for (const resolution of resolve('./e/g.js', new URL('file:///a/b/d/'), readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/d/f/g.js'])
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

  const result = []

  for (const resolution of resolve('#e', new URL('file:///a/b/d/'), readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/d/e.js'])
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

  const result = []

  for (const resolution of resolve('#e/g.js', new URL('file:///a/b/d/'), readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/d/f/g.js'])
})

test('package.json#main with trailing slash', (t) => {
  function readPackage (url) {
    if (url.href === 'file:///a/b/d/package.json') {
      return {
        main: 'e/'
      }
    }

    return null
  }

  const result = []

  for (const resolution of resolve('./d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, [
    'file:///a/b/d',
    'file:///a/b/d.js',
    'file:///a/b/d/e/index.js'
  ])
})

test('async package reads', async (t) => {
  async function readPackage (url) {
    if (url.href === 'file:///a/b/node_modules/d/package.json') {
      return {}
    }

    return null
  }

  const result = []

  for await (const resolution of resolve('d', new URL('file:///a/b/c'), { extensions: ['.js'] }, readPackage)) {
    result.push(resolution.href)
  }

  t.alike(result, ['file:///a/b/node_modules/d/index.js'])
})

function noPackage () {
  return null
}
