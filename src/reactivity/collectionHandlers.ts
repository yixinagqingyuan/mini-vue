import { readonly, ReactiveFlags, toRaw, reactive } from './reactive'
import { track, trigger } from './effect'
import { hasOwn } from './baseHandlers'
import { hasChanged, isObject, isMap } from '../shared'
import { TrackOpTypes, TriggerOpTypes } from './operations'

const toShallow = <T extends unknown>(value: T): T => value

const toReadonly = <T extends unknown>(value: T): T => isObject(value) ? readonly(value as Record<any, any>) : value

const toReactive = <T extends unknown>(value: T): T => isObject(value) ? reactive(value) : value

function has(this, key: unknown, isReadonly = false): boolean {
  const target = (this as any)[ReactiveFlags.RAW]
  const rawTarget = toRaw(target)
  const rawKey = toRaw(key)
  if (key !== rawKey) {
    !isReadonly && track(rawTarget, TrackOpTypes.HAS, key)
  }
  !isReadonly && track(rawTarget, TrackOpTypes.HAS, rawKey)
  return key === rawKey
    ? target.has(key)
    : target.has(key) || target.has(rawKey)
}

function get(
  target,
  key: unknown,
  isReadonly = false,
  isShallow = false) {
  // #1772: readonly(reactive(Map)) should return readonly + reactive version
  // of the value
  target = (target as any)[ReactiveFlags.RAW]
  const rawTarget = toRaw(target)
  const rawKey = toRaw(key)
  if (key !== rawKey) {
    !isReadonly && track(rawTarget, TrackOpTypes.GET, key)
  }
  !isReadonly && track(rawTarget, TrackOpTypes.GET, rawKey)
  const { has } = Reflect.getPrototypeOf(rawTarget) as any
  const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
  if (has.call(rawTarget, key)) {
    return wrap(target.get(key))
  } else if (has.call(rawTarget, rawKey)) {
    return wrap(target.get(rawKey))
  }
}

function add(this, value: unknown) {
  value = toRaw(value)
  const target = toRaw(this)
  const proto = Reflect.getPrototypeOf(target) as any
  const hadKey = proto.has.call(target, value)
  if (!hadKey) {
    target.add(value)
    trigger(target, TriggerOpTypes.ADD, value, value)
  }
  return this
}

function set(this, key: unknown, value: unknown) {
  value = toRaw(value)
  const target = toRaw(this)
  const { has, get } = Reflect.getPrototypeOf(target) as any

  let hadKey = has.call(target, key)
  if (!hadKey) {
    key = toRaw(key)
    hadKey = has.call(target, key)
  }

  const oldValue = get.call(target, key)
  target.set(key, value)
  if (!hadKey) {
    trigger(target, TriggerOpTypes.ADD, key, value)
  } else if (hasChanged(value, oldValue)) {
    trigger(target, TriggerOpTypes.SET, key, value, oldValue)
  }
  return this
}

function size(target, isReadonly = false) {
  target = (target as any)[ReactiveFlags.RAW]
  !isReadonly && track(toRaw(target), TrackOpTypes.ITERATE, Symbol(''))
  return Reflect.get(target, 'size', target)
}

function createForEach(isReadonly: boolean, isShallow: boolean) {
  return function forEach(
    this,
    callback: Function,
    thisArg?: unknown
  ) {
    const observed = this as any
    const target = observed[ReactiveFlags.RAW]
    const rawTarget = toRaw(target)
    const wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive
    !isReadonly && track(rawTarget, TrackOpTypes.ITERATE, Symbol(''))
    return target.forEach((value: unknown, key: unknown) => {
      // important: make sure the callback is
      // 1. invoked with the reactive map as `this` and 3rd arg
      // 2. the value received should be a corresponding reactive/readonly.
      return callback.call(thisArg, wrap(value), wrap(key), observed)
    })
  }
}

function deleteEntry(this, key: unknown) {
  const target = toRaw(this)
  const { has, get } = Reflect.getPrototypeOf(target) as any
  let hadKey = has.call(target, key)
  if (!hadKey) {
    key = toRaw(key)
    hadKey = has.call(target, key)
  }
  const oldValue = get ? get.call(target, key) : undefined
  // forward the operation before queueing reactions
  const result = target.delete(key)
  if (hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
  }
  return result
}

const readonlyInstrumentations: Record<string, Function> = {
  get(this, key: unknown) {
    return get(this, key, true)
  },
  get size() {
    return size((this as unknown), true)
  },
  has(this, key: unknown) {
    return has.call(this, key, true)
  },
  add: createReadonlyMethod(TriggerOpTypes.ADD),
  set: createReadonlyMethod(TriggerOpTypes.SET),
  delete: createReadonlyMethod(TriggerOpTypes.DELETE),
  clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
  forEach: createForEach(true, false)
}

const mutableInstrumentations: Record<string, Function> = {
  get(this, key: unknown) {
    return get(this, key)
  },
  get size() {
    return size((this as unknown))
  },
  has,
  add,
  set,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false, false)
}

function clear(this) {
  const target = toRaw(this)
  const hadItems = target.size !== 0
    ? isMap(target)
      ? new Map(target)
      : new Set(target)
    : undefined
  // forward the operation before queueing reactions
  const result = target.clear()
  if (hadItems) {
    trigger(target, TriggerOpTypes.CLEAR, undefined, undefined)
  }
  return result
}

function createInstrumentationGetter(isReadonly: boolean, shallow: boolean) {
  const instrumentations = shallow
    ? isReadonly
      ? shallowReadonlyInstrumentations
      : shallowInstrumentations
    : isReadonly
      ? readonlyInstrumentations
      : mutableInstrumentations

  return (
    target,
    key: string | symbol,
    receiver
  ) => {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (key === ReactiveFlags.RAW) {
      return target
    }

    return Reflect.get(
      hasOwn(instrumentations, key) && key in target
        ? instrumentations
        : target,
      key,
      receiver
    )
  }
}

const shallowInstrumentations: Record<string, Function> = {
  get(this, key: unknown) {
    return get(this, key, false, true)
  },
  get size() {
    return size((this as unknown))
  },
  has,
  add,
  set,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false, true)
}

const shallowReadonlyInstrumentations: Record<string, Function> = {
  get(this, key: unknown) {
    return get(this, key, true, true)
  },
  get size() {
    return size((this as unknown), true)
  },
  has(this, key: unknown) {
    return has.call(this, key, true)
  },
  add: createReadonlyMethod(TriggerOpTypes.ADD),
  set: createReadonlyMethod(TriggerOpTypes.SET),
  delete: createReadonlyMethod(TriggerOpTypes.DELETE),
  clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
  forEach: createForEach(true, true)
}

function createReadonlyMethod(type: TriggerOpTypes): Function {
  return function (this, ...args: unknown[]) {
    return type === TriggerOpTypes.DELETE ? false : this
  }
}

export const mutableCollectionHandlers = {
  get: createInstrumentationGetter(false, false)
}

export const readonlyCollectionHandlers = {
  get: createInstrumentationGetter(true, false)
}

export const shallowReadonlyCollectionHandlers = {
  get: createInstrumentationGetter(true, true)
}

