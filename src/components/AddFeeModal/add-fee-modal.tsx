import { View, Text, Input, Button } from '@tarojs/components';
import { useState } from 'react';
import Modal from '../Modal/modal';
import './add-fee-modal.less';

type ChargeType = 'monthly' | 'one-time';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string, amount: number, chargeType: ChargeType) => void;
}

export default function AddFeeModal({ visible, onClose, onConfirm }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [chargeType, setChargeType] = useState<ChargeType>('monthly');

  const handleConfirm = () => {
    if (!name.trim()) {
      Taro.showToast({ title: '请输入费用名称', icon: 'none' });
      return;
    }
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    onConfirm(name.trim(), numAmount, chargeType);
    setName('');
    setAmount('');
    setChargeType('monthly');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      title="添加费用项"
      onClose={onClose}
      confirmText="确认添加"
      onConfirm={handleConfirm}
    >
      <View className="fee-form">
        <View className="fee-form__item">
          <Text className="fee-form__label">费用名称</Text>
          <Input
            className="fee-form__input"
            type="text"
            placeholder="如：服务费、管理费、保险费"
            value={name}
            onInput={(e: any) => setName(e.detail.value)}
          />
        </View>

        <View className="fee-form__item">
          <Text className="fee-form__label">费用金额</Text>
          <View className="fee-form__input-wrapper">
            <Input
              className="fee-form__input fee-form__input--amount"
              type="digit"
              placeholder="请输入金额"
              value={amount}
              onInput={(e: any) => setAmount(e.detail.value)}
            />
            <Text className="fee-form__unit">元</Text>
          </View>
        </View>

        <View className="fee-form__item">
          <Text className="fee-form__label">收费方式</Text>
          <View className="fee-form__charge-options">
            <View
              className={`fee-form__charge-option ${chargeType === 'monthly' ? 'fee-form__charge-option--active' : ''}`}
              onClick={() => setChargeType('monthly')}
            >
              <View className={`fee-form__radio ${chargeType === 'monthly' ? 'fee-form__radio--active' : ''}`} />
              <Text className="fee-form__charge-text">每月收取</Text>
            </View>
            <View
              className={`fee-form__charge-option ${chargeType === 'one-time' ? 'fee-form__charge-option--active' : ''}`}
              onClick={() => setChargeType('one-time')}
            >
              <View className={`fee-form__radio ${chargeType === 'one-time' ? 'fee-form__radio--active' : ''}`} />
              <Text className="fee-form__charge-text">一次性</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
