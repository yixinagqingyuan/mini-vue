import { hasChanged, isIntegerKey, isMap } from '../shared'
import { TriggerOpTypes } from './operations'
// 通过闭包保存当前的cb
const effectStack: any = []

const trackStack: boolean[] = []

let activeEffect

let uid = 0

let shouldTrack = true

const targetMap = new WeakMap()

function cleanup(effect) {
  const { deps } = effect
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect)
    }
    deps.length = 0
  }
}

export function resetTracking() {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}

export function enableTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = true
}
// effect 钩子函数
export function isEffect(fn: any) {
  return fn && fn._isEffect === true
}

export function effect(
  fn,
  options: any = {}): any {
  if (isEffect(fn)) {
    fn = fn.raw
  }
  // 真正的创建方法在这里
  // 建立当前的变量和依赖的关系
  const effect = createReactiveEffect(fn, options)
  if (!options.lazy) {
    effect()
  }
  return effect
}


function createReactiveEffect(
  fn,
  options) {
  debugger
  const effect = function reactiveEffect() {
    if (!effect.active) {
      return options.scheduler ? undefined : fn()
    }
    // 如果当前的依赖栈中没有
    if (!effectStack.includes(effect)) {
      cleanup(effect)
      try {
        enableTracking()
        // 给当前的watcher 放进effectstack 的肚子里,临时放入，为了在依赖收集的时候能访问到当前真的effect
        effectStack.push(effect)
        // 给当前的这个effect 变为活动的effect
        activeEffect = effect
        // 执行一下
        return fn()
      } finally {
        // 执行成功了出栈
        effectStack.pop()
        resetTracking()
        activeEffect = effectStack[effectStack.length - 1]
      }
    }
  }
  effect.id = uid++
  effect.allowRecurse = !!options.allowRecurse
  effect._isEffect = true
  effect.active = true
  effect.raw = fn
  effect.deps = []
  effect.options = options
  return effect
}

export function track(target: object, type, key: unknown) {
  if (!shouldTrack || activeEffect === undefined) {
    return
  }
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}

export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // never been tracked
    return
  }

  const effects = new Set()
  const add = (effectsToAdd) => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => {
        if (effect !== activeEffect || effect.allowRecurse) {
          effects.add(effect)
        }
      })
    }
  }

  if (type === TriggerOpTypes.CLEAR) {
    // collection being cleared
    // trigger all effects for target
    depsMap.forEach(add)
  } else if (key === 'length' && Array.isArray(target)) {
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key >= (newValue as number)) {
        add(dep)
      }
    })
  } else {
    // schedule runs for SET | ADD | DELETE
    if (key !== void 0) {
      add(depsMap.get(key))
    }

    // also run for iteration key on ADD | DELETE | Map.SET
    switch (type) {
      case TriggerOpTypes.ADD:
        if (!Array.isArray(target)) {
          add(depsMap.get(Symbol('')))
          if (isMap(target)) {
            add(depsMap.get(Symbol('')))
          }
        } else if (isIntegerKey(key)) {
          // new index added to array -> length changes
          add(depsMap.get('length'))
        }
        break
      case TriggerOpTypes.DELETE:
        if (!Array.isArray(target)) {
          add(depsMap.get(Symbol('')))
          if (isMap(target)) {
            add(depsMap.get(Symbol('')))
          }
        }
        break
      case TriggerOpTypes.SET:
        if (isMap(target)) {
          add(depsMap.get(Symbol('')))
        }
        break
    }
  }

  const run = (effect) => {

    if (effect.options.scheduler) {
      effect.options.scheduler(effect)
    } else {
      effect()
    }
  }

  effects.forEach(run)
}