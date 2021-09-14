import { ShapeFlags } from "../shared";
export declare const createVNode: (type: any, props?: any, children?: string | Array<any>) => {
    el: any;
    component: any;
    key: any;
    type: any;
    props: any;
    children: string | any[];
    shapeFlag: ShapeFlags;
};
export declare function normalizeChildren(vnode: any, children: any): void;
export declare const Text: unique symbol;
export declare function createTextVNode(text?: string): {
    el: any;
    component: any;
    key: any;
    type: any;
    props: any;
    children: string | any[];
    shapeFlag: ShapeFlags;
};
export declare function normalizeVNode(child: any): void;
