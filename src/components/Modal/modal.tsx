import { View, Text, Button } from '@tarojs/components';
import './modal.less';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showFooter?: boolean;
}

export default function Modal({
  visible,
  title,
  onClose,
  children,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
  showFooter = true,
}: Props) {
  if (!visible) return null;

  return (
    <View className="modal">
      <View className="modal__overlay" onClick={onClose} />
      <View className="modal__content">
        <View className="modal__header">
          <Text className="modal__title">{title}</Text>
          <Button className="modal__close" onClick={onClose}>✕</Button>
        </View>
        <View className="modal__body">
          {children}
        </View>
        {showFooter && (
          <View className="modal__footer">
            <Button className="modal__btn modal__btn--cancel" onClick={onClose}>{cancelText}</Button>
            <Button className="modal__btn modal__btn--confirm" onClick={onConfirm}>{confirmText}</Button>
          </View>
        )}
      </View>
    </View>
  );
}
