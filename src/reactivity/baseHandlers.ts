import {
  ReactiveFlags,
  isObject,
  readonly,
  reactive,
  shallowReadonlyMap,
  readonlyMap,
  shallowReactiveMap,
  reactiveMap,
  toRaw,

} from './reactive'
import { isRef } from './ref'
import { track, trigger } from './effect'
import { hasChanged } from './collectionHandlers'

export const enum TrackOpTypes {
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate'
}

export const enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear'
}

export const isString = (val: unknown): val is string => typeof val === 'string'

export const isSymbol = (val: unknown): val is symbol => typeof val === 'symbol'

export const isIntegerKey = (key): any => {
  isString(key) &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key
}

export const readonlyHandlers: ProxyHandler<object> = {
  get: createGetter(true),
  set(target, key) {
    return true
  },
  deleteProperty(target, key) {
    return true
  }
}

export const hasOwn = (
  val: object,
  key: string | symbol): any => {
  Object.prototype.hasOwnProperty.call(val, key)
}

const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
)

export function makeMap(
  str: string,
  expectsLowerCase?: boolean): (key: string) => boolean {
  const map: Record<string, boolean> = Object.create(null)
  const list: Array<string> = str.split(',')
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val]
}

const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`)

const arrayInstrumentations: Record<string, Function> = {}

function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly
    } else if (
      key === ReactiveFlags.RAW &&
      receiver ===
      (isReadonly
        ? shallow
          ? shallowReadonlyMap
          : readonlyMap
        : shallow
          ? shallowReactiveMap
          : reactiveMap
      ).get(target)
    ) {
      return target
    }

    const targetArray = Array.isArray(target)

    if (!isReadonly && targetArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }

    const res = Reflect.get(target, key, receiver)

    if (
      isSymbol(key)
        ? builtInSymbols.has(key as symbol)
        : isNonTrackableKeys(key)
    ) {
      return res
    }

    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }

    if (shallow) {
      return res
    }

    if (isRef(res)) {
      // ref unwrapping - does not apply for Array + integer key.
      const shouldUnwrap = !targetArray || !isIntegerKey(key)
      return shouldUnwrap ? res.value : res
    }

    if (isObject(res)) {
      // Convert returned value into a proxy as well. we do the isObject check
      // here to avoid invalid value warning. Also need to lazy access readonly
      // and reactive here to avoid circular dependency.
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res
  }
}

function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    let oldValue = (target as any)[key]
    if (!shallow) {
      value = toRaw(value)
      oldValue = toRaw(oldValue)
      if (!Array.isArray(target) && isRef(oldValue) && !isRef(value)) {
        oldValue.value = value
        return true
      }
    } else {
      // in shallow mode, objects are set as-is regardless of reactive or not
    }

    const hadKey =
      Array.isArray(target) && isIntegerKey(key)
        ? Number(key) < target.length
        : hasOwn(target, key)
    const result = Reflect.set(target, key, value, receiver)
    // don't trigger if target is something up in the prototype chain of original
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }
    return result
  }
}

const get = /*#__PURE__*/ createGetter()

const set = /*#__PURE__*/ createSetter()

const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true)

function deleteProperty(target: object, key: string | symbol): boolean {
  const hadKey = hasOwn(target, key)
  const oldValue = (target as any)[key]
  const result = Reflect.deleteProperty(target, key)
  if (result && hadKey) {
    trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
  }
  return result
}

function has(target: object, key: string | symbol): boolean {
  const result = Reflect.has(target, key)
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, TrackOpTypes.HAS, key)
  }
  return result
}

function ownKeys(target: object): (string | symbol)[] {
  track(target, TrackOpTypes.ITERATE, Array.isArray(target) ? 'length' : Symbol(''))
  return Reflect.ownKeys(target)
}

export const mutableHandlers: any = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys
}

export const shallowReadonlyHandlers = Object.assign(
  {},
  readonlyHandlers,
  {
    get: shallowReadonlyGet
  }
)