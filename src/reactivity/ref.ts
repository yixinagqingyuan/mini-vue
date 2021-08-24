
import { isReactive, toRaw, reactive } from './reactive'
import { track, trigger } from './effect'
import { isObject, hasChanged } from '../shared'
import { TrackOpTypes, TriggerOpTypes } from './operations'

export function isRef(r) {
  return Boolean(r && r.__v_isRef === true)
}

export function unref(ref) {
  return isRef(ref) ? (ref.value as any) : ref
}

const convert = (val) => isObject(val) ? reactive(val) : val

const shallowUnwrapHandlers = {
  get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
  set: (target, key, value, receiver) => {
    const oldValue = target[key]
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value
      return true
    } else {
      return Reflect.set(target, key, value, receiver)
    }
  }
}
// ref 的响应式其实就是利用object.defineproperty的能力去做响应式
function createRef(rawValue: unknown, shallow = false) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}
class RefImpl {
  private _value

  public readonly __v_isRef = true

  constructor(private _rawValue, public readonly _shallow = false) {
    this._value = _shallow ? _rawValue : convert(_rawValue)
  }
  // 最后将ts 的get 和set 转换为浏览器的object.defineproperty
  get value() {
    track(toRaw(this), TrackOpTypes.GET, 'value')
    return this._value
  }

  set value(newVal) {
    if (hasChanged(toRaw(newVal), this._rawValue)) {
      this._rawValue = newVal
      this._value = this._shallow ? newVal : convert(newVal)
      trigger(toRaw(this), TriggerOpTypes.SET, 'value', newVal)
    }
  }
}

export function proxyRefs(
  objectWithRefs) {
  return isReactive(objectWithRefs)
    ? objectWithRefs
    : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}

export function ref(value?: unknown): any {
  return createRef(value)
}

