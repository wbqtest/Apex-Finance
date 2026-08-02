/**
 * rn-rpx-transform.js
 * 自定义 postcss 插件：修复 Taro 4.2.x RN 端 rpx 单位不转换的 bug。
 *
 * 背景：
 *   postcss-pxtransform 在 platform:'rn' 模式下，transUnits 只有 ['px']，
 *   不会把 rpx 转换成 px，导致 RN 构建时 taro-css-to-react-native 报
 *   "Unexpected token type: word"。
 *
 * 本插件在 RN 构建的 postcss 链中，把 rpx 单位的值转换为 px
 *   （按 Taro 设计稿 750 换算：1rpx = 屏幕宽/750，此处转成 px 数值，
 *    后续 rn-style-transformer 会用 scalePx2dp 做真正的 dp 自适应）。
 *
 * 通过 config/index.ts 的 rn.postcss 注册启用。
 */
// postcss 8 函数式插件写法（兼容 postcss.plugin 弃用警告）
module.exports = () => {
  const rpxRegex = /(\d+(?:\.\d+)?)rpx/g
  return {
    postcssPlugin: 'rn-rpx-transform',
    Declaration(decl) {
      if (decl.value && decl.value.includes('rpx')) {
        // 把 20rpx -> 10px（750 设计稿，rpx/2 = px）
        decl.value = decl.value.replace(rpxRegex, (match, num) => {
          const px = parseFloat(num) / 2
          return `${px}px`
        })
      }
    }
  }
}
module.exports.postcss = true
