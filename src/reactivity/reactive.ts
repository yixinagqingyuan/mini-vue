// 判断是否是响应式对象
export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value)[ReactiveFlags.RAW]) -
  }
  return !!(value && (value)[ReactiveFlags.IS_REACTIVE])
}
export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_READONLY])
}
