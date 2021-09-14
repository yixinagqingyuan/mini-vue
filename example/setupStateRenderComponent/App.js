// 在 render 中可以通过 this.xxx 访问到 setup 返回的对象
import { h, ref, reactive, effect } from "../../lib/mini-vue.esm.js";
const count = ref(0);
effect(() => {
  console.log('vue怎么不会重复执行呢');
  count.value++;
});

export default {
  name: "App",
  setup() {

    const handleClick = () => {
      console.log("click");
      count.value++;
    };

    return {
      handleClick,
    };
  },

  render() {
    return h("div", {}, [
      h("div", {}, String(count.value)),
      h("button", { onClick: this.handleClick }, "click"),
    ]);
  },
};
