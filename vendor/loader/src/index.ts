import { Context, Inject, Service, type Fiber } from 'cordis'
import { defineProperty, isNullable, type Dict } from 'cosmokit'
import { Entry, type EntryOptions } from './config/entry.ts'
import isolate from './config/isolate.ts'
import { EntryTree } from './config/tree.ts'

/** Re-export entry node APIs. */
export * from './config/entry.ts'
/** Re-export nested entry group APIs. */
export * from './config/group.ts'
/** Re-export service isolation helpers. */
export * from './config/isolate.ts'
/** Re-export entry tree persistence APIs. */
export * from './config/tree.ts'
/** Re-export loader config expression helpers. */
export * from './config/utils.ts'

declare module 'cordis' {
  interface Events {
    'exit'(signal: NodeJS.Signals): Promise<void>
    'loader/config-update'(): void
    'loader/entry-init'(entry: Entry): void
    'loader/partial-dispose'(entry: Entry, legacy: Partial<EntryOptions>, active: boolean): void
    'loader/patch-context'(entry: Entry, next: () => void | Promise<void>): void | Promise<void>
  }

  interface Context {
    loader: Loader
  }

  interface EnvData {
    startTime?: number
  }

  interface Fiber {
    entry?: Entry
  }
}

/** FORK: minimal module-loader shape the loader calls for plugin resolution.
 *  The orca fork supplies a static module map (name → dynamic import); the
 *  upstream Node-internals introspection (`internal.ts`) is dropped. */
export interface ModuleLoaderLike {
  version: 'v1' | 'v2'
  import(
    specifier: string,
    parentURL: string,
    importAttributes: Record<string, unknown>,
  ): Promise<unknown>
}

/** Loader config and dependency intercept namespace. */
export namespace Loader {
  /** Root loader configuration. */
  export interface Config {
    /** Base URL used to resolve relative plugin specifiers and config paths. */
    baseUrl?: string
  }

  /** Intercept config used when other plugins depend on `loader`. */
  export interface Intercept {
    /** Keep dependent plugins pending while loader entries are still loading. */
    await?: boolean
  }
}

/**
 * Service that owns a loader entry tree and imports configured plugins.
 *
 * Subclasses provide persistence by implementing `write()` on `EntryTree`.
 */
export class Loader extends EntryTree {
  declare [Service.config]: Loader.Intercept

  public envData =
    typeof process !== 'undefined' && process.env?.CORDIS_SHARED
      ? JSON.parse(process.env.CORDIS_SHARED)
      : { startTime: Date.now() }

  public name = 'loader'
  // FORK: the upstream vendored copy introspects Node's internal ESM loader
  // (node:module / process) — unavailable in workerd. The orca fork always
  // assigns `loader.internal` a static module map before settling entries.
  public internal?: ModuleLoaderLike

  public builtins: Dict<any> = Object.create(null)

  constructor(ctx: Context, public config: Loader.Config = {}) {
    super(ctx)
    if (config.baseUrl) {
      this.ctx.baseUrl = config.baseUrl
    }
    const self = this

    defineProperty(this, Service.tracker, {
      associate: 'loader',
      property: 'ctx',
      noShadow: true,
    })

    ctx.reflect.provide('loader', this, this[Service.check])

    // FORK: the upstream hook on `internal/config` (evaluating `!js`
    // expressions in entry configs at resolution time) is dropped — cordis
    // 4.0.0-rc.8 emits no `internal/config` event. Manifest configs must be
    // plain YAML data.
    ctx.on('internal/update', async function (config, noSave, next) {
      if (!this.entry || noSave || this.parent.fiber?.entry === this.entry) return next()
      await next()
      // FORK: strict-mode cast — `simplify` is not part of the
      // StandardSchemaV1 surface the runtime Config is typed as.
      const unparse = (this.runtime?.Config as any)?.['simplify']
      this.entry.options.config = unparse ? unparse(config) : config
      this.entry.parent.tree.write()
    }, { global: true, prepend: true })

    ctx.on('internal/update', function (config, _, next) {
      if (!this.entry || this.parent.fiber?.entry === this.entry) return next()
      self.showLog(this.entry, 'reload')
      return next()
    }, { global: true })

    ctx.on('internal/plugin', (fiber) => {
      // 1. set `fiber.entry`
      // FORK: strict-mode cast — Entry.key is a symbol slot on Fiber.
      if ((fiber.parent as any)[Entry.key] && !fiber.entry) {
        fiber.entry = (fiber.parent as any)[Entry.key]
        // FIXME merge config
        Inject.resolve(fiber.entry!.options.inject, fiber.inject)
      }

      // 2. handle self-dispose
      // We only care about `ctx.fiber.dispose()`, so we need to filter out other cases.

      // case 1: fiber is created
      if (fiber.uid) return

      // case 2: fiber is not tracked by loader
      if (!fiber.entry) return

      // case 3: fiber is a child plugin under the entry (not the entry's root fiber)
      if (fiber.parent.fiber?.entry === fiber.entry) return

      // case 4: fiber is disposed on behalf of plugin deletion (such as plugin hmr)
      // self-dispose: ctx.fiber.dispose() -> fiber / runtime dispose -> delete(plugin)
      // plugin hmr: delete(plugin) -> runtime dispose -> fiber dispose
      if (!ctx.registry.has(fiber.runtime!.callback)) return

      // case 5: the entry's tree is being disposed
      const treeOwner = fiber.entry.parent.tree.ctx.fiber
      // FORK: 5 = FiberState.UNLOADING — ambient const enums are banned under
      // the root tsconfig's isolatedModules.
      if (!treeOwner.uid || treeOwner.state === 5) return

      // case 6: Loader is replacing or removing this exact fiber
      if (fiber.entry._disposing) return

      this.showLog(fiber.entry, 'unload')

      // case 7: fiber is disposed by loader behavior
      // such as inject checker, config file update, ancestor group disable
      if (fiber.entry.disabled) return

      fiber.entry.options.disabled = true
      fiber.entry.parent.tree.write()
    })

    ctx.plugin(isolate)
  }

  write() {
    // Loader's root tree is in-memory; writes are no-ops.
  }

  [Service.check]() {
    const config: Loader.Intercept = Service.prototype[Service.resolveConfig].call(this)
    if (config.await && this.getTasks().length) return false
    return true
  }

  showLog(entry: Entry, type: string) {
    if (entry.options.group || !entry.parent.tree.enableLogs) return
    this.ctx.root.logger?.('loader').info('%s plugin %C', type, entry.options.name)
  }

  /** Return the loader entry id that owns `fiber`, if any. */
  locate(fiber = this.ctx.fiber) {
    while (1) {
      if (fiber.entry) return fiber.entry.id
      const next = fiber.parent.fiber
      if (fiber === next) return
      fiber = next
    }
  }

  /** Hook for hosts that can restart the process on full-reload requests. */
  exit() {
  }

  /** Normalize ESM/CJS/default export shapes before applying a plugin. */
  unwrapExports(exports: any) {
    if (isNullable(exports)) return exports
    exports = exports.default ?? exports
    // https://github.com/evanw/esbuild/issues/2623
    // https://esbuild.github.io/content-types/#default-interop
    if (!exports.__esModule) return exports
    return exports.default ?? exports
  }
}

export default Loader
