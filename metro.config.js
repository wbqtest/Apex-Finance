const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const { getMetroConfig } = require("@tarojs/rn-supporter");

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
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
      "css",
      "less",
      "scss",
      "sass",
    ],
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

module.exports = (async function () {
  return mergeConfig(
    getDefaultConfig(__dirname),
    await getMetroConfig(),
    config,
  );
})();
