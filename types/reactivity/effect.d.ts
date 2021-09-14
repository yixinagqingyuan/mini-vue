import { TriggerOpTypes } from './operations';
export declare function resetTracking(): void;
export declare function enableTracking(): void;
export declare function isEffect(fn: any): boolean;
export declare function effect(fn: any, options?: any): any;
export declare function track(target: object, type: any, key: unknown): void;
export declare function trigger(target: object, type: TriggerOpTypes, key?: unknown, newValue?: unknown, oldValue?: unknown, oldTarget?: Map<unknown, unknown> | Set<unknown>): void;
