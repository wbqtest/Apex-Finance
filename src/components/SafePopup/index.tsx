/**
 * SafePopup - 跨端兼容的弹出层组件
 *
 * H5/小程序：封装 NutUI Popup 组件
 * RN：使用 View + position: absolute 实现（NutUI Popup 依赖 react-dom createPortal + document.body 不可用）
 */
import React, { useState, useEffect } from 'react';
import { View, ScrollView } from '@tarojs/components';
import { Popup as NutuiPopup } from '@nutui/nutui-react-taro';
import { IS_RN } from '../../utils/platform';
import './index.less';

interface SafePopupProps {
  visible: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  title?: string;
  description?: string;
  closeable?: boolean;
  closeIcon?: React.ReactNode;
  closeIconPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  overlay?: boolean;
  overlayStyle?: React.CSSProperties;
  overlayClassName?: string;
  round?: boolean;
  zIndex?: number;
  lockScroll?: boolean;
  destroyOnClose?: boolean;
  duration?: number;
  style?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
  onOpen?: () => void;
  onClose?: () => void;
  onOverlayClick?: () => void;
  onCloseIconClick?: () => void;
  onClick?: (e: any) => void;
  portal?: any;
}

export const SafePopup: React.FC<SafePopupProps> = (props) => {
  const {
    visible,
    position = 'center',
    title,
    description,
    closeable = false,
    closeIcon,
    overlay = true,
    overlayStyle,
    round = false,
    zIndex = 1100,
    children,
    onOpen,
    onClose,
    onOverlayClick,
    onCloseIconClick,
    style,
    className = '',
  } = props;

  const [showContent, setShowContent] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShowContent(true);
      onOpen?.();
    } else {
      const timer = setTimeout(() => setShowContent(false), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [visible]);

  // H5 / 小程序：使用 NutUI Popup
  if (!IS_RN) {
    return (
      <NutuiPopup
        visible={visible}
        position={position}
        title={title}
        description={description}
        closeable={closeable}
        closeIcon={closeIcon}
        overlay={overlay}
        overlayStyle={overlayStyle}
        round={round}
        zIndex={zIndex}
        onOpen={onOpen}
        onClose={onClose}
        onOverlayClick={onOverlayClick}
        onCloseIconClick={onCloseIconClick}
        style={style}
        className={className}
      >
        {children}
      </NutuiPopup>
    );
  }

  // RN 模式：使用 View + position: absolute 实现
  if (!showContent) return null;

  const isBottom = position === 'bottom';
  const isCenter = position === 'center';
  const isTop = position === 'top';

  return (
    <View className={`safe-popup safe-popup--${position}`} style={{ zIndex }}>
      {/* 遮罩层 */}
      {overlay && (
        <View
          className="safe-popup__overlay"
          style={overlayStyle}
          onClick={() => {
            onOverlayClick?.();
            onClose?.();
          }}
        />
      )}

      {/* 内容区 */}
      <View
        className={`safe-popup__content safe-popup__content--${position} ${round ? 'safe-popup__content--round' : ''} ${className}`}
        style={style}
      >
        {/* 标题栏 */}
        {(title || closeable) && (
          <View className="safe-popup__header">
            {title && <View className="safe-popup__title">{title}</View>}
            {description && <View className="safe-popup__desc">{description}</View>}
            {closeable && (
              <View
                className="safe-popup__close"
                onClick={() => {
                  onCloseIconClick?.();
                  onClose?.();
                }}
              >
                {closeIcon || '✕'}
              </View>
            )}
          </View>
        )}

        {/* 内容 */}
        <ScrollView className="safe-popup__body" scrollY={isBottom || isCenter}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
};

export default SafePopup;
