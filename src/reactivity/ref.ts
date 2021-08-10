
export function proxyRefs<T extends object>(
  objectWithRefs: T
){
  return isReactive(objectWithRefs)
    ? objectWithRefs
    : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}