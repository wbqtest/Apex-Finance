/**
 * SafeToast - 跨端兼容的 Toast 组件
 * 
 * H5/小程序：封装 NutUI Toast 组件
 * RN：使用 Taro.showToast() 命令式 API（NutUI Toast 依赖 react-dom createPortal 不可用）
 */
import React, { useEffect } from 'react';
import { Toast as NutuiToast } from '@nutui/nutui-react-taro';
import { IS_RN, safeShowToast, safeHideToast } from '../../utils/platform';

interface SafeToastProps {
  visible: boolean;
  content: string;
  duration?: number;
  icon?: 'success' | 'error' | 'loading' | 'none';
  onClose?: () => void;
  /** RN 模式下的 toast 类型 */
  type?: 'text' | 'success' | 'fail' | 'loading';
}

export const SafeToast: React.FC<SafeToastProps> = (props) => {
  const { visible, content, duration = 2000, icon, onClose, type } = props;

  useEffect(() => {
    if (IS_RN && visible) {
      if (content) {
        const mappedIcon = icon || (type === 'success' ? 'success' : type === 'fail' ? 'error' : type === 'loading' ? 'loading' : 'none');
        safeShowToast(content, { icon: mappedIcon, duration });
      }
      const timer = setTimeout(() => {
        safeHideToast();
        onClose?.();
      }, duration);
      return () => {
        clearTimeout(timer);
        safeHideToast();
      };
    }
    return undefined;
  }, [visible, content, duration, icon, type, onClose]);

  // H5 / 小程序：使用 NutUI Toast
  if (IS_RN) return null;

  return (
    <NutuiToast
      visible={visible}
      content={content}
      duration={duration}
      icon={icon}
      onClose={onClose}
      type={type}
    />
  );
};

export default SafeToast;
