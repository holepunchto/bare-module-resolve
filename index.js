const errors = require('./lib/errors')

module.exports = exports = function * resolve (specifier, parentURL, opts, readPackage) {
  if (typeof opts === 'function') {
    readPackage = opts
    opts = {}
  }

  if (!opts) opts = {}

  for (const resolved of exports.module(specifier, parentURL, opts, readPackage)) {
    if (resolved.protocol === 'file:' && /%2f|%5c/i.test(resolved.href)) {
      throw errors.INVALID_MODULE_SPECIFIER()
    }

    yield resolved
  }
}

exports.module = function * (specifier, parentURL, opts, readPackage) {
  const {
    imports = null
  } = opts

  let count = 0

  if (imports) {
    for (const resolved of exports.packageImportsExports(specifier, imports, parentURL, true, opts, readPackage)) {
      yield resolved
      count++
    }

    if (count) return
  }

  for (const resolved of exports.packageImports(specifier, parentURL, opts, readPackage)) {
    yield resolved
    count++
  }

  if (count) return

  if (specifier === '.' || specifier[0] === '/' || specifier.startsWith('./') || specifier.startsWith('../')) {
    yield * exports.file(specifier, parentURL, true, opts)
    yield * exports.directory(specifier, parentURL, opts, readPackage)
  } else {
    yield * exports.package(specifier, parentURL, opts, readPackage)
  }
}

exports.package = function * (packageSpecifier, parentURL, opts, readPackage) {
  const {
    builtins = []
  } = opts

  let packageName

  if (packageSpecifier === '') {
    throw errors.INVALID_MODULE_SPECIFIER()
  }

  if (builtins.includes(packageSpecifier)) return yield new URL('builtin:' + packageSpecifier)

  if (packageSpecifier[0] !== '@') {
    packageName = packageSpecifier.split('/', 1).join()
  } else {
    if (!packageSpecifier.includes('/')) {
      throw errors.INVALID_MODULE_SPECIFIER()
    }

    packageName = packageSpecifier.split('/', 2).join('/')
  }

  if (packageName[0] === '.' || packageName.includes('\\') || packageName.includes('%')) {
    throw errors.INVALID_MODULE_SPECIFIER()
  }

  const packageSubpath = '.' + packageSpecifier.substring(packageName.length)

  if (packageSubpath[packageSubpath.length - 1] === '/') {
    throw errors.INVALID_MODULE_SPECIFIER()
  }

  yield * exports.packageSelf(packageName, packageSubpath, parentURL, opts, readPackage)

  parentURL = new URL(parentURL.href)

  do {
    const packageURL = new URL('node_modules/' + packageName + '/', parentURL)

    parentURL.pathname = parentURL.pathname.substring(0, parentURL.pathname.lastIndexOf('/'))

    const pkg = readPackage(new URL('package.json', packageURL))

    if (pkg) {
      if (pkg.exports) {
        return yield * exports.packageExports(packageURL, packageSubpath, pkg.exports, opts, readPackage)
      }

      if (packageSubpath === '.') {
        if (typeof pkg.main === 'string') {
          return yield new URL(pkg.main, packageURL)
        } else {
          return yield * exports.file('index', packageURL, false, opts)
        }
      }

      yield * exports.file(packageSubpath, packageURL, true, opts)
      yield * exports.directory(packageSubpath, packageURL, opts, readPackage)

      return
    }
  } while (parentURL.pathname !== '/')
}

exports.packageSelf = function * (packageName, packageSubpath, parentURL, opts, readPackage) {
  for (const packageURL of exports.lookupPackageScope(parentURL)) {
    const pkg = readPackage(packageURL)

    if (pkg) {
      if (pkg.exports && pkg.name === packageName) {
        return yield * exports.packageExports(packageURL, packageSubpath, pkg.exports, opts, readPackage)
      }

      return
    }
  }
}

exports.packageExports = function * (packageURL, subpath, packageExports, opts, readPackage) {
  let count = 0

  if (subpath === '.') {
    let mainExport

    if (typeof packageExports === 'string' || Array.isArray(packageExports)) {
      mainExport = packageExports
    } else if (typeof packageExports === 'object') {
      const keys = Object.keys(packageExports)

      if (keys.some(key => key.startsWith('.'))) {
        if ('.' in packageExports) mainExport = packageExports['.']
      } else {
        mainExport = packageExports
      }
    }

    if (mainExport) {
      for (const resolved of exports.packageTarget(packageURL, mainExport, null, false, opts, readPackage)) {
        yield resolved
        count++
      }

      if (count) return
    }
  } else if (typeof packageExports === 'object' && packageExports !== null) {
    const keys = Object.keys(packageExports)

    if (keys.every(key => key.startsWith('.'))) {
      const matchKey = subpath

      for (const resolved of exports.packageImportsExports(matchKey, packageExports, packageURL, false, opts, readPackage)) {
        yield resolved
        count++
      }

      if (count) return
    }
  }

  throw errors.PACKAGE_PATH_NOT_EXPORTED()
}

exports.packageImports = function * (specifier, parentURL, opts, readPackage) {
  if (specifier === '#' || specifier.startsWith('#/')) {
    throw errors.INVALID_MODULE_SPECIFIER()
  }

  for (const packageURL of exports.lookupPackageScope(parentURL)) {
    const pkg = readPackage(packageURL)

    if (pkg) {
      if (pkg.imports) {
        let count = 0

        for (const resolved of exports.packageImportsExports(specifier, pkg.imports, packageURL, true, opts, readPackage)) {
          yield resolved
          count++
        }

        if (count) return
      }

      break
    }
  }

  if (specifier.startsWith('#')) {
    throw errors.PACKAGE_IMPORT_NOT_DEFINED()
  }
}

exports.packageImportsExports = function * (matchKey, matchObject, packageURL, isImports, opts, readPackage) {
  if (matchKey in matchObject && !matchKey.includes('*')) {
    const target = matchObject[matchKey]

    return yield * exports.packageTarget(packageURL, target, null, isImports, opts, readPackage)
  }

  const expansionKeys = Object.keys(matchObject).filter(key => key.includes('*')).sort(patternKeyCompare)

  for (const expansionKey of expansionKeys) {
    const patternIndex = expansionKey.indexOf('*')
    const patternBase = expansionKey.substring(0, patternIndex)

    if (matchKey.startsWith(patternBase) && matchKey !== patternBase) {
      const patternTrailer = expansionKey.substring(patternIndex + 1)

      if (patternTrailer === '' || (matchKey.endsWith(patternTrailer) && matchKey.length >= expansionKey.length)) {
        const target = matchObject[expansionKey]

        const patternMatch = matchKey.substring(patternBase.length, matchKey.length - patternTrailer.length)

        return yield * exports.packageTarget(packageURL, target, patternMatch, isImports, opts, readPackage)
      }
    }
  }
}

function patternKeyCompare (keyA, keyB) {
  const patternIndexA = keyA.indexOf('*')
  const patternIndexB = keyB.indexOf('*')
  const baseLengthA = patternIndexA === -1 ? keyA.length : patternIndexA + 1
  const baseLengthB = patternIndexB === -1 ? keyB.length : patternIndexB + 1
  if (baseLengthA > baseLengthB) return -1
  if (baseLengthB > baseLengthA) return 1
  if (patternIndexA === -1) return 1
  if (patternIndexB === -1) return -1
  if (keyA.length > keyB.length) return -1
  if (keyB.length > keyA.length) return 1
  return 0
}

exports.packageTarget = function * (packageURL, target, patternMatch, isImports, opts, readPackage) {
  const {
    conditions = []
  } = opts

  if (typeof target === 'string') {
    if (!target.startsWith('./') && !isImports) {
      throw errors.INVALID_PACKAGE_TARGET()
    }

    if (patternMatch !== null) {
      target = target.replaceAll('*', patternMatch)
    }

    if (target === '.' || target[0] === '/' || target.startsWith('./') || target.startsWith('../')) {
      yield new URL(target, packageURL)
    } else {
      yield * exports.package(target, packageURL, opts, readPackage)
    }
  } else if (Array.isArray(target)) {
    for (const targetValue of target) {
      yield * exports.packageTarget(packageURL, targetValue, patternMatch, isImports, opts, readPackage)
    }
  } else if (typeof target === 'object' && target !== null) {
    const keys = Object.keys(target)

    for (const p of keys) {
      if (p === +p.toString()) {
        throw errors.INVALID_PACKAGE_CONFIGURATION()
      }
    }

    for (const p of keys) {
      if (p === 'default' || conditions.includes(p)) {
        const targetValue = target[p]

        yield * exports.packageTarget(packageURL, targetValue, patternMatch, isImports, opts, readPackage)
      }
    }
  }
}

exports.lookupPackageScope = function * (url) {
  const scopeURL = new URL(url.href)

  do {
    yield new URL('package.json', scopeURL)

    scopeURL.pathname = scopeURL.pathname.substring(0, scopeURL.pathname.lastIndexOf('/'))

    if (scopeURL.pathname.endsWith('/node_modules')) break
  } while (scopeURL.pathname !== '/')
}

exports.file = function * (filename, parentURL, allowBare, opts) {
  const {
    extensions = []
  } = opts

  const candidates = []

  if (allowBare) candidates.push(filename)

  for (const ext of extensions) {
    candidates.push(filename + ext)
  }

  for (const candidate of candidates) {
    yield new URL(candidate, parentURL)
  }
}

exports.directory = function * (dirname, parentURL, opts, readPackage) {
  parentURL = new URL(dirname === '/' ? dirname : dirname + '/', parentURL)

  const pkg = readPackage(new URL('package.json', parentURL))

  if (pkg) {
    if (pkg.exports) {
      return yield * exports.packageExports(parentURL, '.', pkg.exports, opts, readPackage)
    }

    if (typeof pkg.main === 'string') {
      return yield new URL(pkg.main, parentURL)
    }
  }

  yield * exports.file('index', parentURL, false, opts)
}
