
// 通过闭包保存当前的cb
const effectStack: any = []
const trackStack: boolean[] = []
let activeEffect
let uid = 0
let shouldTrack = true
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

export const effect: any = (fn, options) => {
  console.log(fn)
}

function createReactiveEffect(
  fn,
  options
) {
  const effect = function reactiveEffect() {
    if (!effect.active) {
      return options.scheduler ? undefined : fn()
    }
    if (!effectStack.includes(effect)) {
      cleanup(effect)
      try {
        enableTracking()
        // 给当前的watcher 放进effectstack 的肚子里,临时放入，为了在依赖收集的时候能访问到当前真的effect
        effectStack.push(effect)
        // 给当前的这个effect 变为活动的effect
        activeEffect = effect
        // 执行以下
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