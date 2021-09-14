export declare const enum ReactiveFlags {
    SKIP = "__v_skip",
    IS_REACTIVE = "__v_isReactive",
    IS_READONLY = "__v_isReadonly",
    RAW = "__v_raw"
}
export declare const readonlyMap: WeakMap<object, any>;
export declare const shallowReadonlyMap: WeakMap<object, any>;
export declare const shallowReactiveMap: WeakMap<object, any>;
export declare const reactiveMap: WeakMap<object, any>;
export declare function readonly(target: any): any;
export declare function isReactive(value: any): any;
export declare function isReadonly(value: any): boolean;
export declare function shallowReadonly(target: any): any;
export declare function reactive(target: any): any;
export declare function toRaw<T>(observed: T): T;
