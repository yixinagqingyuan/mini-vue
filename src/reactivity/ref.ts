
import { isReactive } from './reactive'
export function proxyRefs(
  objectWithRefs
) {
  return isReactive(objectWithRefs)
    ? objectWithRefs
    : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}