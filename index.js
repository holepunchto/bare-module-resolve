const { satisfies } = require('bare-semver')
const errors = require('./lib/errors')

module.exports = exports = function resolve (specifier, parentURL, opts, readPackage) {
  if (typeof opts === 'function') {
    readPackage = opts
    opts = {}
  } else if (typeof readPackage !== 'function') {
    readPackage = defaultReadPackage
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
          yield value.resolution
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
          yield value.resolution
          next = generator.next()
        }
      }

      return next.value
    }
  }
}

function defaultReadPackage () {
  return null
}

exports.module = function * (specifier, parentURL, opts = {}) {
  const { resolutions = null, imports = null } = opts

  if (exports.startsWithWindowsDriveLetter(specifier)) {
    specifier = '/' + specifier
  }

  if (resolutions) {
    if (yield * exports.preresolved(specifier, resolutions, parentURL, opts)) {
      return true
    }
  }

  if (yield * exports.url(specifier, parentURL, opts)) {
    return true
  }

  if (yield * exports.packageImports(specifier, parentURL, opts)) {
    return true
  }

  if (specifier === '.' || specifier === '..' || specifier[0] === '/' || specifier[0] === '\\' || specifier.startsWith('./') || specifier.startsWith('.\\') || specifier.startsWith('../') || specifier.startsWith('..\\')) {
    if (imports) {
      if (yield * exports.packageImportsExports(specifier, imports, parentURL, true, opts)) {
        return true
      }
    }

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

exports.url = function * (url, parentURL, opts = {}) {
  const { imports = null } = opts

  let resolution
  try {
    resolution = new URL(url)
  } catch {
    return false
  }

  if (imports) {
    if (yield * exports.packageImportsExports(resolution.href, imports, parentURL, true, opts)) {
      return true
    }
  }

  if (resolution.protocol === 'node:') {
    const specifier = resolution.pathname

    if (specifier === '.' || specifier === '..' || specifier[0] === '/' || specifier.startsWith('./') || specifier.startsWith('../')) {
      throw errors.INVALID_MODULE_SPECIFIER(`Module specifier '${url}' is not a valid package name`)
    }

    return yield * exports.package(specifier, parentURL, opts)
  }

  yield { resolution }

  return true
}

exports.preresolved = function * (specifier, resolutions, parentURL, opts = {}) {
  const imports = resolutions[parentURL.href]

  if (typeof imports === 'object' && imports !== null) {
    return yield * exports.packageImportsExports(specifier, imports, parentURL, true, opts)
  }

  return false
}

exports.package = function * (packageSpecifier, parentURL, opts = {}) {
  const { builtins = [] } = opts

  if (packageSpecifier === '') {
    throw errors.INVALID_MODULE_SPECIFIER(`Module specifier '${packageSpecifier}' is not a valid package name`)
  }

  let packageName

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

  if (yield * exports.builtinTarget(packageSpecifier, null, builtins, opts)) {
    return true
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
      if (info.engines) exports.validateEngines(packageURL, info.engines, opts)

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
  } while (parentURL.pathname !== '' && parentURL.pathname !== '/')

  return false
}

exports.packageSelf = function * (packageName, packageSubpath, parentURL, opts = {}) {
  for (const packageURL of exports.lookupPackageScope(parentURL, opts)) {
    const info = yield { package: packageURL }

    if (info) {
      if (info.name !== packageName) return false

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

  throw errors.PACKAGE_PATH_NOT_EXPORTED(`Package subpath '${subpath}' is not defined by "exports" in '${packageURL}'`)
}

exports.packageImports = function * (specifier, parentURL, opts = {}) {
  const { imports = null } = opts

  if (specifier === '#' || specifier.startsWith('#/')) {
    throw errors.INVALID_MODULE_SPECIFIER(`Module specifier '${specifier}' is not a valid internal imports specifier`)
  }

  for (const packageURL of exports.lookupPackageScope(parentURL, opts)) {
    const info = yield { package: packageURL }

    if (info) {
      if (info.imports) {
        if (yield * exports.packageImportsExports(specifier, info.imports, packageURL, true, opts)) {
          return true
        }
      }

      if (specifier.startsWith('#')) {
        throw errors.PACKAGE_IMPORT_NOT_DEFINED(`Package import specifier '${specifier}' is not defined by "imports" in '${packageURL}'`)
      }

      break
    }
  }

  if (imports) {
    if (yield * exports.packageImportsExports(specifier, imports, parentURL, true, opts)) {
      return true
    }
  }

  return false
}

exports.packageImportsExports = function * (matchKey, matchObject, packageURL, isImports, opts = {}) {
  if (matchKey in matchObject && !matchKey.includes('*')) {
    const target = matchObject[matchKey]

    return yield * exports.packageTarget(packageURL, target, null, isImports, opts)
  }

  const expansionKeys = Object.keys(matchObject).filter(key => key.includes('*')).sort(exports.patternKeyCompare)

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

exports.validateEngines = function validateEngines (packageURL, packageEngines, opts = {}) {
  const { engines = {} } = opts

  for (const [engine, range] of Object.entries(packageEngines)) {
    if (engine in engines) {
      const version = engines[engine]

      if (!satisfies(version, range)) {
        packageURL = new URL('package.json', packageURL)

        throw errors.UNSUPPORTED_ENGINE(`Package not compatible with engine '${engine}' ${version}, requires range '${range}' defined by "engines" in '${packageURL}'`)
      }
    }
  }
}

exports.patternKeyCompare = function patternKeyCompare (keyA, keyB) {
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

      throw errors.INVALID_PACKAGE_TARGET(`Invalid target '${target}' defined by "exports" in '${packageURL}'`)
    }

    if (patternMatch !== null) {
      target = target.replaceAll('*', patternMatch)
    }

    if (yield * exports.url(target, packageURL, opts)) {
      return true
    }

    if (target === '.' || target === '..' || target[0] === '/' || target.startsWith('./') || target.startsWith('../')) {
      yield { resolution: new URL(target, packageURL) }

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
  } else if (typeof target === 'object' && target !== null) {
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

exports.builtinTarget = function * (packageSpecifier, packageVersion, target, opts = {}) {
  const { builtinProtocol = 'builtin:', conditions = [] } = opts

  if (typeof target === 'string') {
    const targetParts = target.split('@')

    let targetName
    let targetVersion

    if (target[0] !== '@') {
      targetName = targetParts[0]
      targetVersion = targetParts[1] || null
    } else {
      targetName = targetParts.slice(0, 2).join('@')
      targetVersion = targetParts[2] || null
    }

    if (packageSpecifier === targetName) {
      if (packageVersion === null && targetVersion === null) {
        yield { resolution: new URL(builtinProtocol + packageSpecifier) }

        return true
      }

      let version = null

      if (packageVersion === null) {
        version = targetVersion
      } else if (targetVersion === null || packageVersion === targetVersion) {
        version = packageVersion
      }

      if (version !== null) {
        yield { resolution: new URL(builtinProtocol + packageSpecifier + '@' + version) }

        return true
      }
    }
  } else if (Array.isArray(target)) {
    for (const targetValue of target) {
      if (yield * exports.builtinTarget(packageSpecifier, packageVersion, targetValue, opts)) {
        return true
      }
    }
  } else if (typeof target === 'object' && target !== null) {
    const keys = Object.keys(target)

    for (const p of keys) {
      if (p === 'default' || conditions.includes(p)) {
        const targetValue = target[p]

        return yield * exports.builtinTarget(packageSpecifier, packageVersion, targetValue, opts)
      }
    }
  }

  return false
}

exports.lookupPackageScope = function * lookupPackageScope (url, opts = {}) {
  const { resolutions = null } = opts

  if (resolutions) {
    for (const { resolution } of exports.preresolved('#package', resolutions, url, opts)) {
      if (resolution) return yield resolution
    }

    // Internal preresolution path, do not depend on this! It will be removed without
    // warning.
    for (const { resolution } of exports.preresolved('bare:package', resolutions, url, opts)) {
      if (resolution) return yield resolution
    }
  }

  const scopeURL = new URL(url.href)

  do {
    if (scopeURL.pathname.endsWith('/node_modules')) break

    yield new URL('package.json', scopeURL)

    scopeURL.pathname = scopeURL.pathname.substring(0, scopeURL.pathname.lastIndexOf('/'))

    if (scopeURL.pathname.length === 3 && exports.isWindowsDriveLetter(scopeURL.pathname.substring(1))) break
  } while (scopeURL.pathname !== '' && scopeURL.pathname !== '/')
}

exports.file = function * (filename, parentURL, isIndex, opts = {}) {
  if (filename === '.' || filename === '..' || filename[filename.length - 1] === '/' || filename[filename.length - 1] === '\\') return false

  if (parentURL.protocol === 'file:' && /%2f|%5c/i.test(filename)) {
    throw errors.INVALID_MODULE_SPECIFIER(`Module specifier '${filename}' is invalid`)
  }

  const { extensions = [] } = opts

  if (!isIndex) {
    yield { resolution: new URL(filename, parentURL) }
  }

  for (const ext of extensions) {
    yield { resolution: new URL(filename + ext, parentURL) }
  }

  return !isIndex || extensions.length > 0
}

exports.directory = function * (dirname, parentURL, opts = {}) {
  let directoryURL

  if (dirname[dirname.length - 1] === '/' || dirname[dirname.length - 1] === '\\') {
    directoryURL = new URL(dirname, parentURL)
  } else {
    directoryURL = new URL(dirname + '/', parentURL)
  }

  const info = yield { package: new URL('package.json', directoryURL) }

  if (info) {
    if (info.exports) {
      return yield * exports.packageExports(directoryURL, '.', info.exports, opts)
    }

    if (typeof info.main === 'string' && info.main !== '') {
      let yielded = false

      if (yield * exports.file(info.main, directoryURL, false, opts)) {
        yielded = true
      }

      if (yield * exports.directory(info.main, directoryURL, opts)) {
        yielded = true
      }

      return yielded
    }
  }

  return yield * exports.file('index', directoryURL, true, opts)
}

// https://infra.spec.whatwg.org/#ascii-upper-alpha
function isASCIIUpperAlpha (c) {
  return c >= 0x41 && c <= 0x5a
}

// https://infra.spec.whatwg.org/#ascii-lower-alpha
function isASCIILowerAlpha (c) {
  return c >= 0x61 && c <= 0x7a
}

// https://infra.spec.whatwg.org/#ascii-alpha
function isASCIIAlpha (c) {
  return isASCIIUpperAlpha(c) || isASCIILowerAlpha(c)
}

// https://url.spec.whatwg.org/#windows-drive-letter
exports.isWindowsDriveLetter = function isWindowsDriveLetter (input) {
  return input.length >= 2 && isASCIIAlpha(input.charCodeAt(0)) && (
    input.charCodeAt(1) === 0x3a ||
    input.charCodeAt(1) === 0x7c
  )
}

// https://url.spec.whatwg.org/#start-with-a-windows-drive-letter
exports.startsWithWindowsDriveLetter = function startsWithWindowsDriveLetter (input) {
  return input.length >= 2 && exports.isWindowsDriveLetter(input) && (
    input.length === 2 ||
    input.charCodeAt(2) === 0x2f ||
    input.charCodeAt(2) === 0x5c ||
    input.charCodeAt(2) === 0x3f ||
    input.charCodeAt(2) === 0x23
  )
}
