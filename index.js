const errors = require('./lib/errors')

module.exports = exports = function * resolve (specifier, parentURL, opts, readPackage) {
  if (typeof opts === 'function') {
    readPackage = opts
    opts = {}
  }

  yield * exports.packageImports(specifier, parentURL, opts, readPackage)

  if (specifier[0] === '/' || specifier.startsWith('./') || specifier.startsWith('../')) {
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

  if (builtins.includes(packageSpecifier)) return yield packageSpecifier

  if (packageSpecifier[0] !== '@') {
    packageName = packageSpecifier.split('/', 1).join()
  } else {
    if (!packageSpecifier.includes('/')) {
      throw errors.INVALID_MODULE_SPECIFIER()
    }

    packageName = packageSpecifier.split('/', 2).join('/')
  }

  if (packageName[0] === '' || packageName.includes('\\') || packageName.includes('%')) {
    throw errors.INVALID_MODULE_SPECIFIER()
  }

  const packageSubpath = '.' + packageSpecifier.substring(packageName.length)

  if (packageSubpath[packageSubpath.length - 1] === '/') {
    throw errors.INVALID_MODULE_SPECIFIER()
  }

  yield * exports.packageSelf(packageName, packageSubpath, parentURL, opts, readPackage)

  parentURL = new URL(parentURL.href)

  while (parentURL.pathname !== '/') {
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
  }
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

exports.packageExports = function * (packageURL, subpath, exports, opts, readPackage) {
  if (subpath === '.') {
    let mainExport

    if (typeof exports === 'string' || Array.isArray(exports)) {
      mainExport = exports
    } else if (typeof exports === 'object') {
      const keys = Object.keys(exports)

      if (keys.some(key => key.startsWith('.'))) {
        if ('.' in exports) mainExport = exports['.']
      } else {
        mainExport = exports
      }
    }

    if (mainExport) {
      yield * exports.packageTarget(packageURL, mainExport, null, opts, readPackage)
    }
  } else if (typeof exports === 'object') {
    const keys = Object.keys(exports)

    if (keys.every(key => key.startsWith('.'))) {
      const matchKey = './' + subpath

      yield * exports.packageImportsExports(matchKey, exports, packageURL, opts, readPackage)
    }
  }
}

exports.packageImports = function * (specifier, parentURL, opts, readPackage) {
  for (const packageURL of exports.lookupPackageScope(parentURL)) {
    const pkg = readPackage(packageURL)

    if (pkg) {
      if (pkg.imports) {
        return yield * exports.packageImportsExports(specifier, pkg.imports, packageURL, opts, readPackage)
      }

      return
    }
  }
}

exports.packageImportsExports = function * (matchKey, matchObject, packageURL, opts, readPackage) {
  if (matchKey in matchObject && !matchKey.includes('*')) {
    const target = matchObject[matchKey]

    return yield * exports.packageTarget(packageURL, target, null, opts, readPackage)
  }

  const expansionKeys = Object.keys(matchObject).filter(key => key.includes('*')).sort(patternKeyCompare)

  // TODO
}

function patternKeyCompare (keyA, keyB) {
  // TODO
}

exports.packageTarget = function * (packageURL, target, patternMatch, opts, readPackage) {
  const {
    conditions = []
  } = opts

  if (typeof target === 'string') {
    if (!target.startsWith('./')) {
      if (target[0] === '/' || target.startsWith('../')) {
        throw errors.INVALID_PACKAGE_TARGET()
      }

      if (patternMatch !== null) {
        target = target.replaceAll('*', patternMatch)
      }

      return yield * exports.package(target, packageURL, opts, readPackage)
    }

    if (patternMatch !== null) {
      target = target.replaceAll('*', patternMatch)
    }

    yield new URL(target, packageURL)
  } else if (Array.isArray(target)) {
    for (const targetValue of target) {
      yield * exports.packageTarget(packageURL, targetValue, patternMatch, opts, readPackage)
    }
  } else if (target) {
    for (const p of target) {
      if (p === 'default' || conditions.includes(p)) {
        const targetValue = target[p]

        yield * exports.packageTarget(packageURL, targetValue, patternMatch, opts, readPackage)
      }
    }
  }
}

exports.lookupPackageScope = function * (url) {
  const scopeURL = new URL(url.href)

  while (scopeURL.pathname !== '/') {
    yield new URL('package.json', scopeURL)

    scopeURL.pathname = scopeURL.pathname.substring(0, scopeURL.pathname.lastIndexOf('/'))

    if (scopeURL.pathname.endsWith('/node_modules')) break
  }
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
  const pkg = readPackage(new URL(dirname + '/package.json', parentURL))

  if (pkg) {
    if (pkg.exports) {
      return yield * exports.packageExports(new URL(dirname, parentURL), '.', pkg.exports, opts, readPackage)
    }

    if (typeof pkg.main === 'string') {
      return yield new URL(dirname + '/' + pkg.main, parentURL)
    }
  }

  yield * exports.file(dirname + '/index', parentURL, false, opts)
}
