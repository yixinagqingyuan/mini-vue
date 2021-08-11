// 在 render 中可以通过 this.xxx 访问到 setup 返回的对象
import { h, ref, reactive } from "../../lib/mini-vue.esm.js";
const count = ref(0);
export default {
  name: "App",
  setup() {

    const handleClick = () => {
      debugger;
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
