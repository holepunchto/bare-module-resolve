import URL from 'bare-url'

type RecursiveStringObject = {
  [key: string]: RecursiveStringObject | string
}

type ResolveModuleStatus = number

type ResolveModuleTarget =
  | string
  | RecursiveStringObject
  | (string | RecursiveStringObject)[]

type ResolveModuleConditions = string[] | string[][]

interface ModuleResolveOptions {
  builtinProtocol?: string
  builtins?: (RecursiveStringObject | string)[]
  conditions?: ResolveModuleConditions
  engines?: RecursiveStringObject
  extensions?: string[]
  imports?: RecursiveStringObject
  matchedConditions?: string[]
  resolutions?: RecursiveStringObject
}

declare function resolve(
  specifier: string,
  parentURL: URL,
  opts?: ModuleResolveOptions,
  readPackage?: (url: URL) => unknown
): Iterable<URL>

declare function resolve(
  specifier: string,
  parentURL: URL,
  readPackage: (url: URL) => unknown
): Iterable<URL> & AsyncIterable<URL>

declare namespace resolve {
  export {
    type ModuleResolveOptions,
    type ResolveModuleStatus,
    type ResolveModuleTarget,
    type ResolveModuleConditions
  }

  export const constants: {
    UNRESOLVED: ResolveModuleStatus
    YIELDED: ResolveModuleStatus
    RESOLVED: ResolveModuleStatus
  }

  export function module(
    specifier: string,
    parentURL: URL,
    opts?: ModuleResolveOptions
  ): Iterable<{ resolution: URL }, ResolveModuleStatus>

  export function url(
    url: string,
    parentURL: URL,
    opts?: ModuleResolveOptions
  ): Iterable<{ resolution: URL }, ResolveModuleStatus>

  export function preresolved(
    specifier: string,
    resolutions: RecursiveStringObject,
    parentURL: URL,
    opts?: ModuleResolveOptions
  ): Iterable<{ resolution: URL }, ResolveModuleStatus>

  export function package(
    packageSpecifier: string,
    parentURL: URL,
    opts?: ModuleResolveOptions
  ): Iterable<{ resolution?: URL; package?: URL }, ResolveModuleStatus>

  export function packageSelf(
    packageName: string,
    packageSubpath: string,
    parentURL: URL,
    opts?: ModuleResolveOptions
  ): Iterable<{ resolution?: URL; package?: URL }, ResolveModuleStatus>

  export function packageExports(
    packageURL: URL,
    subpath: string,
    packageExports: ResolveModuleTarget,
    opts?: ModuleResolveOptions
  ): Iterable<{ resolution?: URL; package?: URL }, ResolveModuleStatus>

  export function packageImports(
    specifier: string,
    parentURL: URL,
    opts?: ModuleResolveOptions
  ): Iterable<{ resolution?: URL; package?: URL }, ResolveModuleStatus>

  export function packageImportsExports(
    matchKey: string,
    matchObject: RecursiveStringObject,
    packageURL: URL,
    isImports: boolean,
    opts?: ModuleResolveOptions
  ): Iterable<{ resolution?: URL; package?: URL }, ResolveModuleStatus>

  export function validateEngines(
    packageURL: URL,
    packageEngines: Record<string, string>,
    opts?: ModuleResolveOptions
  ): void

  export function patternKeyCompare(keyA: string, keyB: string): number

  export function packageTarget(
    packageURL: URL,
    target: ResolveModuleTarget,
    patternMatch: string,
    isImports: boolean,
    opts?: ModuleResolveOptions
  ): Iterable<{ resolution?: URL; package?: URL }, ResolveModuleStatus>

  export function builtinTarget(
    packageSpecifier: string,
    packageVersion: string,
    target: ResolveModuleTarget,
    opts?: ModuleResolveOptions
  ): Iterable<{ resolution: URL }, ResolveModuleStatus>

  export function conditionMatches(
    target: ResolveModuleTarget,
    conditions: ResolveModuleConditions,
    opts?: ModuleResolveOptions
  ): Iterable<
    [
      condition: string,
      target: ResolveModuleTarget,
      conditions: ResolveModuleConditions
    ],
    ResolveModuleStatus
  >

  export function lookupPackageScope(
    url: URL,
    opts?: ModuleResolveOptions
  ): Iterable<URL>

  export function file(
    filename: string,
    parentURL: URL,
    isIndex: boolean,
    opts?: ModuleResolveOptions
  ): Iterable<{ resolution: URL }, ResolveModuleStatus>

  export function directory(
    dirname: string,
    parentURL: URL,
    opts?: ModuleResolveOptions
  ): Iterable<{ resolution?: URL; package?: URL }, ResolveModuleStatus>

  export function isWindowsDriveLetter(input: string): boolean

  export function startsWithWindowsDriveLetter(input: string): boolean
}

export = resolve
