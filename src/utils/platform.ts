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
