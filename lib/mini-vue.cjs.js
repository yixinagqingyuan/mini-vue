'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var hasChanged = function (value, oldValue) { return value !== oldValue && (value === value || oldValue === oldValue); };
var isString = function (val) { return typeof val === 'string'; };
var isIntegerKey = function (key) {
    return isString(key) &&
        key !== 'NaN' &&
        key[0] !== '-' &&
        '' + parseInt(key, 10) === key;
};
var isMap = function (val) {
    return toTypeString(val) === '[object Map]';
};
var objectToString = Object.prototype.toString;
var toTypeString = function (value) {
    return objectToString.call(value);
};
var isObject = function (val) { return val !== null && typeof val === 'object'; };
var toRawType = function (value) {
    return toTypeString(value).slice(8, -1);
};
var isSymbol = function (val) { return typeof val === 'symbol'; };

var TrackOpTypes;
(function (TrackOpTypes) {
    TrackOpTypes["GET"] = "get";
    TrackOpTypes["HAS"] = "has";
    TrackOpTypes["ITERATE"] = "iterate";
})(TrackOpTypes || (TrackOpTypes = {}));
var TriggerOpTypes;
(function (TriggerOpTypes) {
    TriggerOpTypes["SET"] = "set";
    TriggerOpTypes["ADD"] = "add";
    TriggerOpTypes["DELETE"] = "delete";
    TriggerOpTypes["CLEAR"] = "clear";
})(TriggerOpTypes || (TriggerOpTypes = {}));

var activeEffect;
var targetMap = new WeakMap();
function track(target, type, key) {
    {
        return;
    }
}
function trigger(target, type, key, newValue, oldValue, oldTarget) {
    var depsMap = targetMap.get(target);
    if (!depsMap) {
        return;
    }
    var effects = new Set();
    var add = function (effectsToAdd) {
        if (effectsToAdd) {
            effectsToAdd.forEach(function (effect) {
                if (effect !== activeEffect || effect.allowRecurse) {
                    effects.add(effect);
                }
            });
        }
    };
    if (type === TriggerOpTypes.CLEAR) {
        depsMap.forEach(add);
    }
    else if (key === 'length' && Array.isArray(target)) {
        depsMap.forEach(function (dep, key) {
            if (key === 'length' || key >= newValue) {
                add(dep);
            }
        });
    }
    else {
        if (key !== void 0) {
            add(depsMap.get(key));
        }
        switch (type) {
            case TriggerOpTypes.ADD:
                if (!Array.isArray(target)) {
                    add(depsMap.get(Symbol('')));
                    if (isMap(target)) {
                        add(depsMap.get(Symbol('')));
                    }
                }
                else if (isIntegerKey(key)) {
                    add(depsMap.get('length'));
                }
                break;
            case TriggerOpTypes.DELETE:
                if (!Array.isArray(target)) {
                    add(depsMap.get(Symbol('')));
                    if (isMap(target)) {
                        add(depsMap.get(Symbol('')));
                    }
                }
                break;
            case TriggerOpTypes.SET:
                if (isMap(target)) {
                    add(depsMap.get(Symbol('')));
                }
                break;
        }
    }
    var run = function (effect) {
        if (effect.options.scheduler) {
            effect.options.scheduler(effect);
        }
        else {
            effect();
        }
    };
    effects.forEach(run);
}

var readonlyHandlers = {
    get: createGetter(true),
    set: function (target, key) {
        return true;
    },
    deleteProperty: function (target, key) {
        return true;
    }
};
var hasOwn = function (val, key) {
    Object.prototype.hasOwnProperty.call(val, key);
};
var builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol)
    .map(function (key) { return Symbol[key]; })
    .filter(isSymbol));
function makeMap(str, expectsLowerCase) {
    var map = Object.create(null);
    var list = str.split(',');
    for (var i = 0; i < list.length; i++) {
        map[list[i]] = true;
    }
    return expectsLowerCase ? function (val) { return !!map[val.toLowerCase()]; } : function (val) { return !!map[val]; };
}
var isNonTrackableKeys = makeMap("__proto__,__v_isRef,__isVue");
var arrayInstrumentations = {};
function createGetter(isReadonly, shallow) {
    if (isReadonly === void 0) { isReadonly = false; }
    if (shallow === void 0) { shallow = false; }
    return function get(target, key, receiver) {
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly;
        }
        else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly;
        }
        else if (key === ReactiveFlags.RAW &&
            receiver ===
                (isReadonly
                    ? shallow
                        ? shallowReadonlyMap
                        : readonlyMap
                    : shallow
                        ? shallowReactiveMap
                        : reactiveMap).get(target)) {
            return target;
        }
        var targetArray = Array.isArray(target);
        if (!isReadonly && targetArray && hasOwn(arrayInstrumentations, key)) {
            return Reflect.get(arrayInstrumentations, key, receiver);
        }
        var res = Reflect.get(target, key, receiver);
        if (isSymbol(key)
            ? builtInSymbols.has(key)
            : isNonTrackableKeys(key)) {
            return res;
        }
        if (!isReadonly) {
            track(target, TrackOpTypes.GET);
        }
        if (shallow) {
            return res;
        }
        if (isRef(res)) {
            var shouldUnwrap = !targetArray || !isIntegerKey(key);
            return shouldUnwrap ? res.value : res;
        }
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter(shallow) {
    if (shallow === void 0) { shallow = false; }
    return function set(target, key, value, receiver) {
        var oldValue = target[key];
        if (!shallow) {
            value = toRaw(value);
            oldValue = toRaw(oldValue);
            if (!Array.isArray(target) && isRef(oldValue) && !isRef(value)) {
                oldValue.value = value;
                return true;
            }
        }
        var hadKey = Array.isArray(target) && isIntegerKey(key)
            ? Number(key) < target.length
            : hasOwn(target, key);
        var result = Reflect.set(target, key, value, receiver);
        if (target === toRaw(receiver)) {
            if (!hadKey) {
                trigger(target, TriggerOpTypes.ADD, key, value);
            }
            else if (hasChanged(value, oldValue)) {
                trigger(target, TriggerOpTypes.SET, key, value);
            }
        }
        return result;
    };
}
var get = createGetter();
var set = createSetter();
var shallowReadonlyGet = createGetter(true, true);
var mutableHandlers = {
    get: get,
    set: set,
    deleteProperty: deleteProperty,
    has: has,
    ownKeys: ownKeys
};
Object.assign({}, readonlyHandlers, {
    get: shallowReadonlyGet
});
function deleteProperty(target, key) {
    var hadKey = hasOwn(target, key);
    target[key];
    var result = Reflect.deleteProperty(target, key);
    if (result && hadKey) {
        trigger(target, TriggerOpTypes.DELETE, key, undefined);
    }
    return result;
}
function has(target, key) {
    var result = Reflect.has(target, key);
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
        track(target, TrackOpTypes.HAS);
    }
    return result;
}
function ownKeys(target) {
    track(target, TrackOpTypes.ITERATE);
    return Reflect.ownKeys(target);
}

var toShallow = function (value) { return value; };
var toReadonly = function (value) { return isObject(value) ? readonly(value) : value; };
var toReactive = function (value) { return isObject(value) ? reactive(value) : value; };
function has$1(key, isReadonly) {
    if (isReadonly === void 0) { isReadonly = false; }
    var target = this[ReactiveFlags.RAW];
    var rawTarget = toRaw(target);
    var rawKey = toRaw(key);
    if (key !== rawKey) {
        !isReadonly && track(rawTarget, TrackOpTypes.HAS);
    }
    !isReadonly && track(rawTarget, TrackOpTypes.HAS);
    return key === rawKey
        ? target.has(key)
        : target.has(key) || target.has(rawKey);
}
function get$1(target, key, isReadonly, isShallow) {
    if (isReadonly === void 0) { isReadonly = false; }
    if (isShallow === void 0) { isShallow = false; }
    target = target[ReactiveFlags.RAW];
    var rawTarget = toRaw(target);
    var rawKey = toRaw(key);
    if (key !== rawKey) {
        !isReadonly && track(rawTarget, TrackOpTypes.GET);
    }
    !isReadonly && track(rawTarget, TrackOpTypes.GET);
    var has = Reflect.getPrototypeOf(rawTarget).has;
    var wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
    if (has.call(rawTarget, key)) {
        return wrap(target.get(key));
    }
    else if (has.call(rawTarget, rawKey)) {
        return wrap(target.get(rawKey));
    }
}
function add(value) {
    value = toRaw(value);
    var target = toRaw(this);
    var proto = Reflect.getPrototypeOf(target);
    var hadKey = proto.has.call(target, value);
    if (!hadKey) {
        target.add(value);
        trigger(target, TriggerOpTypes.ADD, value, value);
    }
    return this;
}
function set$1(key, value) {
    value = toRaw(value);
    var target = toRaw(this);
    var _a = Reflect.getPrototypeOf(target), has = _a.has, get = _a.get;
    var hadKey = has.call(target, key);
    if (!hadKey) {
        key = toRaw(key);
        hadKey = has.call(target, key);
    }
    var oldValue = get.call(target, key);
    target.set(key, value);
    if (!hadKey) {
        trigger(target, TriggerOpTypes.ADD, key, value);
    }
    else if (hasChanged(value, oldValue)) {
        trigger(target, TriggerOpTypes.SET, key, value);
    }
    return this;
}
function size(target, isReadonly) {
    if (isReadonly === void 0) { isReadonly = false; }
    target = target[ReactiveFlags.RAW];
    !isReadonly && track(toRaw(target), TrackOpTypes.ITERATE);
    return Reflect.get(target, 'size', target);
}
function createForEach(isReadonly, isShallow) {
    return function forEach(callback, thisArg) {
        var observed = this;
        var target = observed[ReactiveFlags.RAW];
        var rawTarget = toRaw(target);
        var wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
        !isReadonly && track(rawTarget, TrackOpTypes.ITERATE);
        return target.forEach(function (value, key) {
            return callback.call(thisArg, wrap(value), wrap(key), observed);
        });
    };
}
function deleteEntry(key) {
    var target = toRaw(this);
    var _a = Reflect.getPrototypeOf(target), has = _a.has, get = _a.get;
    var hadKey = has.call(target, key);
    if (!hadKey) {
        key = toRaw(key);
        hadKey = has.call(target, key);
    }
    get ? get.call(target, key) : undefined;
    var result = target.delete(key);
    if (hadKey) {
        trigger(target, TriggerOpTypes.DELETE, key, undefined);
    }
    return result;
}
var readonlyInstrumentations = {
    get: function (key) {
        return get$1(this, key, true);
    },
    get size() {
        return size(this, true);
    },
    has: function (key) {
        return has$1.call(this, key, true);
    },
    add: createReadonlyMethod(TriggerOpTypes.ADD),
    set: createReadonlyMethod(TriggerOpTypes.SET),
    delete: createReadonlyMethod(TriggerOpTypes.DELETE),
    clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
    forEach: createForEach(true, false)
};
var mutableInstrumentations = {
    get: function (key) {
        return get$1(this, key);
    },
    get size() {
        return size(this);
    },
    has: has$1,
    add: add,
    set: set$1,
    delete: deleteEntry,
    clear: clear,
    forEach: createForEach(false, false)
};
function clear() {
    var target = toRaw(this);
    var hadItems = target.size !== 0
        ? isMap(target)
            ? new Map(target)
            : new Set(target)
        : undefined;
    var result = target.clear();
    if (hadItems) {
        trigger(target, TriggerOpTypes.CLEAR, undefined, undefined);
    }
    return result;
}
function createInstrumentationGetter(isReadonly, shallow) {
    var instrumentations = shallow
        ? isReadonly
            ? shallowReadonlyInstrumentations
            : shallowInstrumentations
        : isReadonly
            ? readonlyInstrumentations
            : mutableInstrumentations;
    return function (target, key, receiver) {
        if (key === ReactiveFlags.IS_REACTIVE) {
            return !isReadonly;
        }
        else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly;
        }
        else if (key === ReactiveFlags.RAW) {
            return target;
        }
        return Reflect.get(hasOwn(instrumentations, key) && key in target
            ? instrumentations
            : target, key, receiver);
    };
}
var shallowInstrumentations = {
    get: function (key) {
        return get$1(this, key, false, true);
    },
    get size() {
        return size(this);
    },
    has: has$1,
    add: add,
    set: set$1,
    delete: deleteEntry,
    clear: clear,
    forEach: createForEach(false, true)
};
var shallowReadonlyInstrumentations = {
    get: function (key) {
        return get$1(this, key, true, true);
    },
    get size() {
        return size(this, true);
    },
    has: function (key) {
        return has$1.call(this, key, true);
    },
    add: createReadonlyMethod(TriggerOpTypes.ADD),
    set: createReadonlyMethod(TriggerOpTypes.SET),
    delete: createReadonlyMethod(TriggerOpTypes.DELETE),
    clear: createReadonlyMethod(TriggerOpTypes.CLEAR),
    forEach: createForEach(true, true)
};
function createReadonlyMethod(type) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        return type === TriggerOpTypes.DELETE ? false : this;
    };
}
var mutableCollectionHandlers = {
    get: createInstrumentationGetter(false, false)
};
var readonlyCollectionHandlers = {
    get: createInstrumentationGetter(true, false)
};

var ReactiveFlags;
(function (ReactiveFlags) {
    ReactiveFlags["SKIP"] = "__v_skip";
    ReactiveFlags["IS_REACTIVE"] = "__v_isReactive";
    ReactiveFlags["IS_READONLY"] = "__v_isReadonly";
    ReactiveFlags["RAW"] = "__v_raw";
})(ReactiveFlags || (ReactiveFlags = {}));
var TargetType;
(function (TargetType) {
    TargetType[TargetType["INVALID"] = 0] = "INVALID";
    TargetType[TargetType["COMMON"] = 1] = "COMMON";
    TargetType[TargetType["COLLECTION"] = 2] = "COLLECTION";
})(TargetType || (TargetType = {}));
var readonlyMap = new WeakMap();
var shallowReadonlyMap = new WeakMap();
var shallowReactiveMap = new WeakMap();
var reactiveMap = new WeakMap();
function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap);
}
function targetTypeMap(rawType) {
    switch (rawType) {
        case 'Object':
        case 'Array':
            return TargetType.COMMON;
        case 'Map':
        case 'Set':
        case 'WeakMap':
        case 'WeakSet':
            return TargetType.COLLECTION;
        default:
            return TargetType.INVALID;
    }
}
function isReactive(value) {
    if (isReadonly(value)) {
        return isReactive((value)[ReactiveFlags.RAW]);
    }
    return !!(value && (value)[ReactiveFlags.IS_REACTIVE]);
}
function isReadonly(value) {
    return !!(value && value[ReactiveFlags.IS_READONLY]);
}
function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
    if (!isObject(target)) {
        return target;
    }
    if (target[ReactiveFlags.RAW] &&
        !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) {
        return target;
    }
    var existingProxy = proxyMap.get(target);
    if (existingProxy) {
        return existingProxy;
    }
    var targetType = getTargetType(target);
    if (targetType === TargetType.INVALID) {
        return target;
    }
    var proxy = new Proxy(target, targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers);
    proxyMap.set(target, proxy);
    return proxy;
}
function getTargetType(value) {
    return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
        ? TargetType.INVALID
        : targetTypeMap(toRawType(value));
}
function reactive(target) {
    if (target && (target)[ReactiveFlags.IS_READONLY]) {
        return target;
    }
    return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
}
function toRaw(observed) {
    return ((observed && toRaw(observed[ReactiveFlags.RAW])) || observed);
}

function isRef(r) {
    return Boolean(r && r.__v_isRef === true);
}
function unref(ref) {
    return isRef(ref) ? ref.value : ref;
}
var convert = function (val) { return isObject(val) ? reactive(val) : val; };
var shallowUnwrapHandlers = {
    get: function (target, key, receiver) { return unref(Reflect.get(target, key, receiver)); },
    set: function (target, key, value, receiver) {
        var oldValue = target[key];
        if (isRef(oldValue) && !isRef(value)) {
            oldValue.value = value;
            return true;
        }
        else {
            return Reflect.set(target, key, value, receiver);
        }
    }
};
function createRef(rawValue, shallow) {
    if (shallow === void 0) { shallow = false; }
    if (isRef(rawValue)) {
        return rawValue;
    }
    return new RefImpl(rawValue, shallow);
}
var RefImpl = (function () {
    function RefImpl(_rawValue, _shallow) {
        if (_shallow === void 0) { _shallow = false; }
        this._rawValue = _rawValue;
        this._shallow = _shallow;
        this.__v_isRef = true;
        this._value = _shallow ? _rawValue : convert(_rawValue);
    }
    Object.defineProperty(RefImpl.prototype, "value", {
        get: function () {
            track(toRaw(this), TrackOpTypes.GET);
            return this._value;
        },
        set: function (newVal) {
            if (hasChanged(toRaw(newVal), this._rawValue)) {
                this._rawValue = newVal;
                this._value = this._shallow ? newVal : convert(newVal);
                trigger(toRaw(this), TriggerOpTypes.SET, 'value', newVal);
            }
        },
        enumerable: false,
        configurable: true
    });
    return RefImpl;
}());
function proxyRefs(objectWithRefs) {
    return isReactive(objectWithRefs)
        ? objectWithRefs
        : new Proxy(objectWithRefs, shallowUnwrapHandlers);
}
function ref(value) {
    return createRef(value);
}

exports.proxyRefs = proxyRefs;
exports.ref = ref;
//# sourceMappingURL=mini-vue.cjs.js.map
