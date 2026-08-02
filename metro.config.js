const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { getMetroConfig } = require("@tarojs/rn-supporter");
const path = require("path");

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */

// 空模块文件路径：用于拦截 NutUI CSS 导入
const emptyModulePath = path.resolve(__dirname, "empty-module.js");

module.exports = (async function () {
  const defaultConfig = getDefaultConfig(__dirname);
  const taroConfig = await getMetroConfig();

  // 保存 Taro 的自定义解析器（如果有）
  const taroResolveRequest =
    taroConfig.resolver && taroConfig.resolver.resolveRequest;

  const config = {
    resolver: {
      assetExts: [
        "bmp",
        "gif",
        "jpg",
        "jpeg",
        "png",
        "psd",
        "svg",
        "webp",
        "m4v",
        "mov",
        "mp4",
        "mpeg",
        "mpg",
        "webm",
        "aac",
        "aiff",
        "caf",
        "m4a",
        "mp3",
        "wav",
        "html",
        "pdf",
        "yaml",
        "yml",
        "otf",
        "ttf",
        "zip",
      ],
      // Taro 会自动为 NutUI 组件注入 CSS 样式导入（style.css），但 RN 端 NutUI 组件自带内联样式
      // 拦截 CSS 导入，返回空模块文件避免 Metro 解析失败
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName.includes("style.css") || /\.css$/.test(moduleName)) {
          return { type: "sourceFile", filePath: emptyModulePath };
        }
        // 优先使用 Taro 的自定义解析器
        if (taroResolveRequest) {
          return taroResolveRequest(context, moduleName, platform);
        }
        return context.resolveRequest(context, moduleName, platform);
      },
    },
    transformer: {
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
  };

  return mergeConfig(defaultConfig, taroConfig, config);
})();
