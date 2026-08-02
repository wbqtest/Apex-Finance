import Taro from '@tarojs/taro';

/** 是否为 React Native 环境 */
export const IS_RN = Taro.getEnv() === Taro.ENV_TYPE.RN;

/** 是否为 H5 环境 */
export const IS_H5 = Taro.getEnv() === Taro.ENV_TYPE.WEB;

/** 是否为微信小程序 */
export const IS_WEAPP = Taro.getEnv() === Taro.ENV_TYPE.WEAPP;

/**
 * 安全 showToast - 跨端兼容
 * RN 端 NutUI Toast 组件（依赖 react-dom createPortal）不可用，统一用 Taro.showToast
 */
export function safeShowToast(
  title: string,
  options?: { icon?: 'success' | 'error' | 'loading' | 'none'; duration?: number }
) {
  Taro.showToast({
    title,
    icon: options?.icon || 'none',
    duration: options?.duration || 2000,
  });
}

/**
 * 安全 showModal - 跨端兼容
 * RN 端 NutUI Dialog 组件（依赖 Popup -> react-dom createPortal）不可用，统一用 Taro.showModal
 */
export function safeShowModal(options: {
  title?: string;
  content?: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  cancelColor?: string;
}): Promise<{ confirm: boolean; cancel: boolean }> {
  return new Promise((resolve) => {
    Taro.showModal({
      title: options.title || '提示',
      content: options.content || '',
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
      confirmColor: options.confirmColor || '#1A3A5C',
      cancelColor: options.cancelColor || '#999',
      success: (res) => resolve(res),
      fail: () => resolve({ confirm: false, cancel: true }),
    });
  });
}

/**
 * 安全 hideToast
 */
export function safeHideToast() {
  Taro.hideToast();
}

/**
 * 安全获取页面参数（兼容 RN 无 window.location）
 */
export function getPageParams(): Record<string, any> {
  try {
    const pages = Taro.getCurrentPages();
    if (pages.length > 0) {
      const currentPage = pages[pages.length - 1];
      return (currentPage as any)?.options || {};
    }
  } catch (e) {
    console.error('getPageParams error:', e);
  }
  return {};
}

/**
 * 判断 H5 是否在 App（原生 webview）中打开
 *
 * 判断顺序：
 * 1. URL 参数：from=app / inapp=1 / source=native（App 端打开 webview 时附带）
 * 2. User-Agent：包含常见 App 标识或自定义标识 ApexFinance
 * 3. document.referrer：来自 App 内部 scheme
 *
 * @returns true 表示在 App 中打开，需要隐藏头部返回栏
 */
export function isInApp(): boolean {
  // RN 环境本身就是 App，不算"H5 在 App 中打开"
  if (IS_RN) return false;

  // 非 H5 环境（小程序等）不处理
  if (!IS_H5) return false;

  try {
    // 1. URL 参数判断（最可靠，App 端可控）
    const url = (typeof window !== 'undefined' && window.location?.search) || '';
    const params = new URLSearchParams(url);
    if (
      params.get('from') === 'app' ||
      params.get('inapp') === '1' ||
      params.get('source') === 'native'
    ) {
      return true;
    }

    // 2. User-Agent 判断
    const ua =
      (typeof navigator !== 'undefined' && navigator.userAgent) || '';

    // 自定义 App 标识（App 端打包时在 WebView 中注入自定义 UA）
    if (/ApexFinance/i.test(ua)) return true;

    // 常见第三方 App 标识
    if (
      /MicroMessenger/i.test(ua) || // 微信
      /AlipayClient/i.test(ua) ||   // 支付宝
      /QQ\//i.test(ua) ||            // QQ
      /DingTalk/i.test(ua) ||        // 钉钉
      /baiduboxapp/i.test(ua) ||    // 百度
      /weibo/i.test(ua) ||           // 微博
      /Instagram/i.test(ua)          // Instagram
    ) {
      return true;
    }
  } catch (e) {
    console.error('isInApp error:', e);
  }

  return false;
}
