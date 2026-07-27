// API配置
// 开发环境使用空字符串，通过 devServer proxy 代理到后端
// 生产环境使用完整地址
export const API_BASE_URL = process.env.TARO_APP_API_BASE_URL || ''

// 请求超时时间
export const REQUEST_TIMEOUT = 10000
