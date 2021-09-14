export declare const readonlyHandlers: ProxyHandler<object>;
export declare const hasOwn: (val: object, key: string | symbol) => any;
export declare function makeMap(str: string, expectsLowerCase?: boolean): (key: string) => boolean;
export declare const mutableHandlers: any;
export declare const shallowReadonlyHandlers: ProxyHandler<object> & {
    get: (target: any, key: any, receiver: any) => any;
};
