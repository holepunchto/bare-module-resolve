const errors = require('./lib/errors')

module.exports = exports = function resolve (specifier, parentURL, opts, readPackage) {
  if (typeof opts === 'function') {
    readPackage = opts
    opts = {}
  }

  return {
    * [Symbol.iterator] () {
      const generator = exports.module(specifier, parentURL, opts)

      let next = generator.next()

      while (next.done !== true) {
        const value = next.value

        if (value.package) {
          next = generator.next(readPackage(value.package))
        } else {
          yield value.module
          next = generator.next()
        }
      }

      return next.value
    },

    async * [Symbol.asyncIterator] () {
      const generator = exports.module(specifier, parentURL, opts)

      let next = generator.next()

      while (next.done !== true) {
        const value = next.value

        if (value.package) {
          next = generator.next(await readPackage(value.package))
        } else {
          yield value.module
          next = generator.next()
        }
      }

      return next.value
    }
  }
}

exports.module = function * (specifier, parentURL, opts = {}) {
  const { imports = null } = opts

  if (imports) {
    if (yield * exports.packageImportsExports(specifier, imports, parentURL, true, opts)) {
      return true
    }
  }

  if (yield * exports.packageImports(specifier, parentURL, opts)) {
    return true
  }

  if (specifier === '.' || specifier === '..' || specifier[0] === '/' || specifier.startsWith('./') || specifier.startsWith('../')) {
    let yielded = false

    if (yield * exports.file(specifier, parentURL, false, opts)) {
      yielded = true
    }

    if (yield * exports.directory(specifier, parentURL, opts)) {
      yielded = true
    }

    return yielded
  }

  return yield * exports.package(specifier, parentURL, opts)
}

exports.package = function * (packageSpecifier, parentURL, opts = {}) {
  const { builtins = [] } = opts

  let packageName

  if (packageSpecifier === '') {
    throw errors.INVALID_MODULE_SPECIFIER(`Module specifier '${packageSpecifier}' is not a valid package name`)
  }

  if (builtins.includes(packageSpecifier)) {
    yield { module: new URL('builtin:' + packageSpecifier) }

    return true
  }

  if (packageSpecifier[0] !== '@') {
    packageName = packageSpecifier.split('/', 1).join()
  } else {
    if (!packageSpecifier.includes('/')) {
      throw errors.INVALID_MODULE_SPECIFIER(`Module specifier '${packageSpecifier}' is not a valid package name`)
    }

    packageName = packageSpecifier.split('/', 2).join('/')
  }

  if (packageName[0] === '.' || packageName.includes('\\') || packageName.includes('%')) {
    throw errors.INVALID_MODULE_SPECIFIER(`Module specifier '${packageSpecifier}' is not a valid package name`)
  }

  let packageSubpath = '.' + packageSpecifier.substring(packageName.length)

  if (yield * exports.packageSelf(packageName, packageSubpath, parentURL, opts)) {
    return true
  }

  parentURL = new URL(parentURL.href)

  do {
    const packageURL = new URL('node_modules/' + packageName + '/', parentURL)

    parentURL.pathname = parentURL.pathname.substring(0, parentURL.pathname.lastIndexOf('/'))

    const info = yield { package: new URL('package.json', packageURL) }

    if (info) {
      if (info.exports) {
        return yield * exports.packageExports(packageURL, packageSubpath, info.exports, opts)
      }

      if (packageSubpath === '.') {
        if (typeof info.main === 'string' && info.main !== '') {
          packageSubpath = info.main
        } else {
          return yield * exports.file('index', packageURL, true, opts)
        }
      }

      let yielded = false

      if (yield * exports.file(packageSubpath, packageURL, false, opts)) {
        yielded = true
      }

      if (yield * exports.directory(packageSubpath, packageURL, opts)) {
        yielded = true
      }

      return yielded
    }
  } while (parentURL.pathname !== '/')

  return false
}

exports.packageSelf = function * (packageName, packageSubpath, parentURL, opts = {}) {
  for (const packageURL of lookupPackageScope(parentURL)) {
    const info = yield { package: packageURL }

    if (info) {
      if (info.exports && info.name === packageName) {
        return yield * exports.packageExports(packageURL, packageSubpath, info.exports, opts)
      }

      break
    }
  }

  return false
}

exports.packageExports = function * (packageURL, subpath, packageExports, opts = {}) {
  if (subpath === '.') {
    let mainExport

    if (typeof packageExports === 'string' || Array.isArray(packageExports)) {
      mainExport = packageExports
    } else if (typeof packageExports === 'object' && packageExports !== null) {
      const keys = Object.keys(packageExports)

      if (keys.some(key => key.startsWith('.'))) {
        if ('.' in packageExports) mainExport = packageExports['.']
      } else {
        mainExport = packageExports
      }
    }

    if (mainExport) {
      if (yield * exports.packageTarget(packageURL, mainExport, null, false, opts)) {
        return true
      }
    }
  } else if (typeof packageExports === 'object' && packageExports !== null) {
    const keys = Object.keys(packageExports)

    if (keys.every(key => key.startsWith('.'))) {
      if (yield * exports.packageImportsExports(subpath, packageExports, packageURL, false, opts)) {
        return true
      }
    }
  }

  packageURL = new URL('package.json', packageURL)

  throw errors.PACKAGE_PATH_NOT_EXPORTED(`Package subpath '${subpath}' is not defined by "exports" in ${packageURL}`)
}

exports.packageImports = function * (specifier, parentURL, opts = {}) {
  if (specifier === '#' || specifier.startsWith('#/')) {
    throw errors.INVALID_MODULE_SPECIFIER(`Module specifier '${specifier}' is not a valid internal imports specifier`)
  }

  for (const packageURL of lookupPackageScope(parentURL)) {
    const info = yield { package: packageURL }

    if (info) {
      if (info.imports) {
        if (yield * exports.packageImportsExports(specifier, info.imports, packageURL, true, opts)) {
          return true
        }
      }

      if (specifier.startsWith('#')) {
        throw errors.PACKAGE_IMPORT_NOT_DEFINED(`Package import specifier '${specifier}' is not defined by "imports" in ${packageURL}`)
      }

      break
    }
  }

  return false
}

exports.packageImportsExports = function * (matchKey, matchObject, packageURL, isImports, opts = {}) {
  if (matchKey in matchObject && !matchKey.includes('*')) {
    const target = matchObject[matchKey]

    return yield * exports.packageTarget(packageURL, target, null, isImports, opts)
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

        return yield * exports.packageTarget(packageURL, target, patternMatch, isImports, opts)
      }
    }
  }

  return false
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

exports.packageTarget = function * (packageURL, target, patternMatch, isImports, opts = {}) {
  const { conditions = [] } = opts

  if (typeof target === 'string') {
    if (!target.startsWith('./') && !isImports) {
      packageURL = new URL('package.json', packageURL)

      throw errors.INVALID_PACKAGE_TARGET(`Invalid target '${target}' defined by "exports" in ${packageURL}`)
    }

    if (patternMatch !== null) {
      target = target.replaceAll('*', patternMatch)
    }

    if (target === '.' || target[0] === '/' || target.startsWith('./') || target.startsWith('../')) {
      yield { module: new URL(target, packageURL) }

      return true
    }

    return yield * exports.package(target, packageURL, opts)
  }

  if (Array.isArray(target)) {
    for (const targetValue of target) {
      if (yield * exports.packageTarget(packageURL, targetValue, patternMatch, isImports, opts)) {
        return true
      }
    }

    return false
  }

  if (typeof target === 'object' && target !== null) {
    const keys = Object.keys(target)

    for (const p of keys) {
      if (p === 'default' || conditions.includes(p)) {
        const targetValue = target[p]

        return yield * exports.packageTarget(packageURL, targetValue, patternMatch, isImports, opts)
      }
    }
  }

  return false
}

function * lookupPackageScope (url) {
  const scopeURL = new URL(url.href)

  do {
    yield new URL('package.json', scopeURL)

    scopeURL.pathname = scopeURL.pathname.substring(0, scopeURL.pathname.lastIndexOf('/'))

    if (scopeURL.pathname.endsWith('/node_modules')) break
  } while (scopeURL.pathname !== '/')
}

exports.file = function * (filename, parentURL, isIndex, opts = {}) {
  if (filename === '.' || filename === '..' || filename[filename.length - 1] === '/') return false

  if (parentURL.protocol === 'file:' && /%2f|%5c/i.test(filename)) {
    throw errors.INVALID_MODULE_SPECIFIER(`Module specifier '${filename}' is invalid`)
  }

  const { extensions = [] } = opts

  const candidates = []

  if (!isIndex) candidates.push(filename)

  for (const ext of extensions) {
    candidates.push(filename + ext)
  }

  for (const candidate of candidates) {
    yield { module: new URL(candidate, parentURL) }
  }

  return candidates.length > 0
}

exports.directory = function * (dirname, parentURL, opts = {}) {
  parentURL = new URL(dirname[dirname.length - 1] === '/' ? dirname : dirname + '/', parentURL)

  const info = yield { package: new URL('package.json', parentURL) }

  if (info) {
    if (info.exports) {
      return yield * exports.packageExports(parentURL, '.', info.exports, opts)
    }

    if (typeof info.main === 'string' && info.main !== '') {
      let yielded = false

      if (yield * exports.file(info.main, parentURL, false, opts)) {
        yielded = true
      }

      if (yield * exports.directory(info.main, parentURL, opts)) {
        yielded = true
      }

      return yielded
    }
  }

  return yield * exports.file('index', parentURL, true, opts)
}
