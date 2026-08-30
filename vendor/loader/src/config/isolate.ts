import { Context, symbols } from 'cordis'
import type { Dict } from 'cosmokit'
import { Entry } from './entry.ts'

/** FORK: strict-mode accessor for the per-entry delimiter symbols the isolate
 *  realm stores directly on the context (the upstream vendored config relied
 *  on `noImplicitAny: false`; the root tsconfig is strict). */
const realmSlots = (ctx: Context) => ctx as any

declare module './entry.ts' {
  interface EntryOptions {
    intercept?: Dict | null
    isolate?: Dict<true | string> | null
  }

  interface Entry {
    realm: LocalRealm
  }
}

function swap<T extends {}>(target: T, source?: T | null) {
  for (const key of Reflect.ownKeys(target)) {
    Reflect.deleteProperty(target, key)
  }
  for (const key of Reflect.ownKeys(source || {})) {
    Reflect.defineProperty(target, key, Reflect.getOwnPropertyDescriptor(source!, key)!)
  }
}

/** Symbol realm used to isolate service implementations by entry or label. */
export abstract class Realm {
  protected store: Dict<symbol> = Object.create(null)

  abstract get suffix(): string

  access(key: string, create = false) {
    if (create) {
      return this.store[key] ??= Symbol(`${key}${this.suffix}`)
    } else {
      return this.store[key] ?? Symbol(`${key}${this.suffix}`)
    }
  }

  delete(key: string) {
    delete this.store[key]
  }

  get size() {
    return Object.keys(this.store).length
  }
}

/** Entry-local isolation realm. */
export class LocalRealm extends Realm {
  constructor(private entry: Entry) {
    super()
  }

  get suffix() {
    return '#' + this.entry.options.id
  }
}

/** Named isolation realm shared by entries that use the same label. */
export class GlobalRealm extends Realm {
  constructor(public label: string) {
    super()
  }

  get suffix() {
    return '@' + this.label
  }
}

/** Install loader hooks that apply `intercept` and `isolate` entry options. */
export default function isolate(ctx: Context) {
  const realms: Dict<GlobalRealm> = Object.create(null)
  const delims: Dict<symbol> = Object.create(null)

  function access(entry: Entry, name: string, create: true): symbol
  function access(entry: Entry, name: string, create?: boolean): symbol | undefined
  function access(entry: Entry, name: string, create = false) {
    let realm: Realm | undefined
    const label = entry.options.isolate?.[name]
    if (!label) return
    if (label === true) {
      realm = entry.realm ??= new LocalRealm(entry)
    } else if (create) {
      realm = realms[label] ??= new GlobalRealm(label)
    } else {
      realm = realms[label]
    }
    return realm?.access(name, create)
  }

  ctx.on('loader/entry-init', (entry) => {
    entry.ctx[Context.intercept] = Object.create(entry.ctx[Context.intercept])
    entry.ctx[symbols.isolate] = Object.create(entry.ctx[symbols.isolate])
  })

  ctx.on('loader/patch-context', async (entry, next) => {
    // step 1: generate new isolate map
    const newMap: Dict<symbol> = Object.create(entry.parent.ctx[Context.isolate])
    for (const name of Object.keys(entry.options.isolate ?? {})) {
      newMap[name] = access(entry, name, true)
    }

    // step 2: generate service diff
    const diff: Dict<[symbol, symbol, symbol, symbol]> = Object.create(null)
    const oldMap = entry.ctx[symbols.isolate]
    for (const name in { ...newMap, ...delims }) {
      if (newMap[name] === oldMap[name]) continue
      const delim = delims[name] ??= Symbol(`delim:${name}`)
      realmSlots(entry.ctx)[delim] = Symbol(`${name}#${entry.id}`)
      for (const symbol of [oldMap[name], newMap[name]]) {
        const impl = symbol && entry.ctx.reflect.store[symbol]
        if (!impl) continue
        if (!impl.fiber) {
          entry.ctx.logger.warn(new Error(`expected service ${name} to be implemented`))
          continue
        }
        diff[name] = [oldMap[name], newMap[name], realmSlots(entry.ctx)[delim], realmSlots(impl.fiber.ctx)[delim]]
        if (realmSlots(entry.ctx)[delim] !== realmSlots(impl.fiber.ctx)[delim]) break
      }
    }

    // step 3: set prototype for transferred context
    Object.setPrototypeOf(entry.ctx[symbols.isolate], entry.parent.ctx[Context.isolate])
    Object.setPrototypeOf(entry.ctx[Context.intercept], entry.parent.ctx[Context.intercept])
    swap(entry.ctx[symbols.isolate], newMap)
    swap(entry.ctx[Context.intercept], entry.options.intercept)

    // step 4: reload fiber
    await next()

    // step 5: replace service impl
    for (const [symbol1, symbol2, flag1, flag2] of Object.values(diff)) {
      if (flag1 === flag2 && entry.ctx.reflect.store[symbol1] && !entry.ctx.reflect.store[symbol2]) {
        entry.ctx.reflect.store[symbol2] = entry.ctx.reflect.store[symbol1]
        delete entry.ctx.reflect.store[symbol1]
      }
    }

    // step 6: reflect notify
    ctx.reflect.notify(Object.keys(diff), (ctx, name) => {
      const [symbol1, symbol2, flag1, flag2] = diff[name]
      const symbol3 = ctx[symbols.isolate][name]
      const flag3 = realmSlots(ctx)[delims[name]]
      return (symbol1 === symbol3 || symbol2 === symbol3) && (flag1 === flag3) !== (flag1 === flag2)
    })

    // step 7: clean up delimiters
    for (const name in delims) {
      if (!Reflect.ownKeys(newMap).includes(name)) {
        delete realmSlots(entry.ctx)[delims[name]]
      }
    }
  })

  ctx.on('loader/partial-dispose', (entry, legacy, active) => {
    for (const [name, label] of Object.entries(legacy.isolate ?? {})) {
      if (label === true) continue
      if (active && entry.options.isolate?.[name] === label) continue
      const realm = realms[label]
      if (!realm) continue

      // realm garbage collection
      for (const entry of ctx.loader.entries()) {
        // has reference to this realm
        if (entry.options.isolate?.[name] === realm.label) return
      }
      realm.delete(name)
      if (!realm.size) {
        delete realms[realm.label]
      }
    }
  })
}
