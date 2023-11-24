module.exports = class ModuleResolveError extends Error {
  constructor (msg, code, fn = ModuleResolveError) {
    super(`${code}: ${msg}`)
    this.code = code

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, fn)
    }
  }

  get name () {
    return 'ModuleResolveError'
  }

  static INVALID_MODULE_SPECIFIER (msg) {
    return new ModuleResolveError(msg, 'INVALID_MODULE_SPECIFIER', ModuleResolveError.INVALID_MODULE_SPECIFIER)
  }

  static INVALID_PACKAGE_CONFIGURATION (msg) {
    return new ModuleResolveError(msg, 'INVALID_PACKAGE_CONFIGURATION', ModuleResolveError.INVALID_PACKAGE_CONFIGURATION)
  }

  static INVALID_PACKAGE_TARGET (msg) {
    return new ModuleResolveError(msg, 'INVALID_PACKAGE_TARGET ', ModuleResolveError.INVALID_PACKAGE_TARGET)
  }
}
