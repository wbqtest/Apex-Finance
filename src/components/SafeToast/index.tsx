/**
 * SafeToast - 跨端兼容的 Toast 组件
 *
 * H5/小程序：封装 NutUI Toast 组件
 * RN：使用 Taro.showToast() 命令式 API（NutUI Toast 依赖 react-dom createPortal 不可用）
 *
 * 注意：NutUI Toast 的 duration 单位是「秒」，不是「毫秒」！
 *       这里统一对外暴露毫秒接口，内部转换为秒。
 */
import React, { useEffect, useRef } from 'react';
import { Toast as NutuiToast } from '@nutui/nutui-react-taro';
import { IS_RN, safeShowToast, safeHideToast } from '../../utils/platform';

interface SafeToastProps {
  visible: boolean;
  content: string;
  /** 自动消失时长，单位毫秒，默认 2000ms */
  duration?: number;
  icon?: 'success' | 'error' | 'loading' | 'none';
  onClose?: () => void;
  type?: 'text' | 'success' | 'fail' | 'loading';
}

export const SafeToast: React.FC<SafeToastProps> = (props) => {
  const { visible, content, duration = 2000, icon, onClose, type } = props;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 统一的自动关闭逻辑（跨端通用）
  useEffect(() => {
    if (!visible) return;

    if (IS_RN) {
      // RN 端：使用 Taro.showToast，duration 为毫秒，自动关闭
      if (content) {
        const mappedIcon = icon || (type === 'success' ? 'success' : type === 'fail' ? 'error' : type === 'loading' ? 'loading' : 'none');
        safeShowToast(content, { icon: mappedIcon, duration });
      }
      timerRef.current = setTimeout(() => {
        safeHideToast();
        onClose?.();
      }, duration);
    } else {
      // H5/小程序端：NutUI Toast duration 单位是秒，需转换
      // 同时设置兜底定时器，确保一定能消失（防止 NutUI 内部 duration 计算异常）
      timerRef.current = setTimeout(() => {
        onClose?.();
      }, duration + 500); // 多留 500ms 余量
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (IS_RN) {
        safeHideToast();
      }
    };
  }, [visible, content, duration, icon, type, onClose]);

  if (IS_RN) return null;

  // NutUI Toast 的 duration 单位是秒，需要将毫秒转为秒
  const durationSeconds = Math.max(1, Math.round(duration / 1000));

  return (
    <NutuiToast
      visible={visible}
      content={content}
      duration={durationSeconds}
      icon={icon}
      onClose={onClose}
      type={type}
      lockScroll={false}
      closeOnOverlayClick={true}
    />
  );
};

export default SafeToast;
