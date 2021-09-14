import { h, ref, reactive } from "../../lib/mini-vue.esm.js";
const count = ref('haoaho');
export default {
  name: "Child",
  setup(props, { emit }) { },
  render(proxy) {
    return h("div", {}, [h("div", {}, "child" + this.$props.msg + count.value)]);
  },
};
