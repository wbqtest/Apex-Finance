/**
 * SafeDialog - 跨端兼容的弹窗组件
 * 
 * H5/小程序：封装 NutUI Dialog 组件（完整保留样式和行为）
 * RN：使用 Taro.showModal()（简单文案）或 View 遮罩层（含自定义子元素）
 * NutUI Dialog 依赖 Popup -> react-dom createPortal + document.body，RN 不可用
 */
import React, { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import { Dialog as NutuiDialog } from '@nutui/nutui-react-taro';
import { IS_RN } from '../../utils/platform';
import './index.less';

interface SafeDialogProps {
  visible: boolean;
  title?: string;
  content?: string | React.ReactNode;
  children?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  hideCancelButton?: boolean;
  hideConfirmButton?: boolean;
  disableConfirmButton?: boolean;
  footer?: React.ReactNode;
  footerDirection?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
  onOverlayClick?: () => void;
  beforeCancel?: () => boolean;
  beforeClose?: () => boolean;
  overlay?: boolean;
  overlayStyle?: React.CSSProperties;
  overlayClassName?: string;
  zIndex?: number;
  lockScroll?: boolean;
  closeOnOverlayClick?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const SafeDialog: React.FC<SafeDialogProps> = (props) => {
  const {
    visible,
    title,
    content,
    children,
    confirmText = '确定',
    cancelText = '取消',
    hideCancelButton,
    hideConfirmButton,
    onConfirm,
    onCancel,
    onClose,
    onOverlayClick,
    overlay,
    overlayStyle,
    overlayClassName,
    zIndex,
    lockScroll,
    closeOnOverlayClick,
  } = props;

  const [loading, setLoading] = useState(false);

  // ===== RN 模式 =====
  if (IS_RN) {
    const hasComplexChildren = !!children;
    const textContent = typeof content === 'string' ? content : '';

    // 简单弹窗：使用 Taro.showModal()
    if (!hasComplexChildren) {
      useEffect(() => {
        if (!visible) return;
        const Taro = require('@tarojs/taro').default;
        Taro.showModal({
          title: title || '提示',
          content: textContent,
          confirmText,
          cancelText: hideCancelButton ? '' : cancelText,
          showCancel: !hideCancelButton,
          confirmColor: '#1A3A5C',
          cancelColor: '#999',
          success: (res: any) => {
            if (res.confirm) {
              onConfirm?.();
            } else {
              onCancel?.();
            }
            onClose?.();
          },
          fail: () => onClose?.(),
        });
      }, [visible]);
      return null;
    }

    // 复杂弹窗（含自定义 children）：使用 View 遮罩层
    // 仅在 visible 时渲染
    if (!visible) return null;

    const handleOverlayClick = () => {
      onOverlayClick?.();
      if (closeOnOverlayClick !== false) {
        onClose?.();
      }
    };

    const handleConfirm = async () => {
      setLoading(true);
      try {
        await onConfirm?.();
      } finally {
        setLoading(false);
      }
    };

    return (
      <View className="safe-dialog-rn" style={{ zIndex: zIndex || 1200 }}>
        {/* 遮罩 */}
        {overlay !== false && (
          <View
            className="safe-dialog-rn__overlay"
            style={overlayStyle}
            onClick={handleOverlayClick}
          />
        )}
        {/* 弹窗内容 */}
        <View className="safe-dialog-rn__content" style={props.style}>
          {title && (
            <View className="safe-dialog-rn__header">
              <Text className="safe-dialog-rn__title">{title}</Text>
            </View>
          )}
          <View className="safe-dialog-rn__body">
            {textContent ? <Text className="safe-dialog-rn__text">{textContent}</Text> : null}
            {children}
          </View>
          <View className="safe-dialog-rn__footer">
            {!hideCancelButton && (
              <View
                className="safe-dialog-rn__btn safe-dialog-rn__btn--cancel"
                onClick={() => { onCancel?.(); onClose?.(); }}
              >
                <Text>{cancelText}</Text>
              </View>
            )}
            {!hideConfirmButton && (
              <View
                className="safe-dialog-rn__btn safe-dialog-rn__btn--confirm"
                onClick={handleConfirm}
              >
                <Text>{loading ? '处理中...' : confirmText}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  // ===== H5 / 小程序模式：使用 NutUI Dialog（行为完全不变）=====
  return (
    <NutuiDialog
      visible={visible}
      title={title}
      content={content}
      confirmText={confirmText}
      cancelText={cancelText}
      hideCancelButton={hideCancelButton}
      hideConfirmButton={hideConfirmButton}
      onConfirm={onConfirm}
      onCancel={onCancel}
      onClose={onClose}
      onOverlayClick={onOverlayClick}
      lockScroll={lockScroll}
      closeOnOverlayClick={closeOnOverlayClick}
      overlay={overlay}
      overlayStyle={overlayStyle}
      overlayClassName={overlayClassName}
      zIndex={zIndex}
    >
      {children}
    </NutuiDialog>
  );
};

export default SafeDialog;
