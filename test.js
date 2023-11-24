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

function noPackage () {
  return null
}
