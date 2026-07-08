import { View, Text, Input, Button } from '@tarojs/components';
import { useState } from 'react';
import { generateArithmeticSequence, generateGeometricSequence, parsePastedPayments, parsePastedPaymentsWithInfo } from '../../utils/finance';

type FillMode = 'uniform' | 'arithmetic' | 'geometric' | 'paste';
type FillScope = 'replace' | 'fill_empty';

interface Props {
  currentCount: number;
  currentPayments: number[];
  onConfirm: (payments: number[]) => void;
  onClose: () => void;
}

export default function BatchFillModal({ currentCount, currentPayments, onConfirm, onClose }: Props) {
  const [fillMode, setFillMode] = useState<FillMode>('uniform');
  const [fillScope, setFillScope] = useState<FillScope>('replace');
  const [uniformAmount, setUniformAmount] = useState('');
  const [arithFirst, setArithFirst] = useState('');
  const [arithLast, setArithLast] = useState('');
  const [geoFirst, setGeoFirst] = useState('');
  const [geoLast, setGeoLast] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [preview, setPreview] = useState<number[]>([]);
  const [warning, setWarning] = useState('');

  const applyFillScope = (newPayments: number[]): number[] => {
    if (fillScope === 'replace') {
      return newPayments;
    }

    const result = [...currentPayments];
    for (let i = 0; i < newPayments.length && i < result.length; i++) {
      if (result[i] <= 0 || result[i] === undefined) {
        result[i] = newPayments[i];
      }
    }
    return result;
  };

  const handleConfirm = () => {
    let payments: number[] = [];

    switch (fillMode) {
      case 'uniform': {
        const val = parseFloat(uniformAmount);
        if (!val || val <= 0) {
          setWarning('请输入有效的每期金额');
          return;
        }
        const count = fillScope === 'replace' ? currentCount : currentPayments.filter(p => p <= 0).length || currentCount;
        payments = new Array(count).fill(Math.round(val * 100) / 100);
        break;
      }
      case 'arithmetic': {
        const first = parseFloat(arithFirst);
        const last = parseFloat(arithLast);
        if (!first || !last || first <= 0 || last <= 0) {
          setWarning('请输入有效的首期和末期金额');
          return;
        }
        const count = fillScope === 'replace' ? currentCount : currentPayments.filter(p => p <= 0).length || currentCount;
        payments = generateArithmeticSequence(first, last, count);
        break;
      }
      case 'geometric': {
        const first = parseFloat(geoFirst);
        const last = parseFloat(geoLast);
        if (!first || !last || first <= 0 || last <= 0) {
          setWarning('请输入有效的首期和末期金额');
          return;
        }
        const count = fillScope === 'replace' ? currentCount : currentPayments.filter(p => p <= 0).length || currentCount;
        payments = generateGeometricSequence(first, last, count);
        break;
      }
      case 'paste': {
        const parsed = parsePastedPaymentsWithInfo(pasteText);
        payments = parsed.numbers;
        if (payments.length === 0) {
          setWarning('未识别到有效数字，请检查输入格式');
          return;
        }
        break;
      }
    }

    if (payments.length > 0) {
      const finalPayments = applyFillScope(payments);
      onConfirm(finalPayments);
    }
  };

  const updatePreview = () => {
    setWarning('');
    let p: number[] = [];
    switch (fillMode) {
      case 'uniform': {
        const val = parseFloat(uniformAmount);
        if (val && val > 0 && currentCount > 0) {
          const count = fillScope === 'replace' ? currentCount : currentPayments.filter(p => p <= 0).length || currentCount;
          p = new Array(count).fill(Math.round(val * 100) / 100);
        }
        break;
      }
      case 'arithmetic': {
        const first = parseFloat(arithFirst);
        const last = parseFloat(arithLast);
        if (first && last && first > 0 && last > 0 && currentCount > 0) {
          const count = fillScope === 'replace' ? currentCount : currentPayments.filter(p => p <= 0).length || currentCount;
          p = generateArithmeticSequence(first, last, count);
        }
        break;
      }
      case 'geometric': {
        const first = parseFloat(geoFirst);
        const last = parseFloat(geoLast);
        if (first && last && first > 0 && last > 0 && currentCount > 0) {
          const count = fillScope === 'replace' ? currentCount : currentPayments.filter(p => p <= 0).length || currentCount;
          p = generateGeometricSequence(first, last, count);
        }
        break;
      }
      case 'paste': {
        const parsed = parsePastedPaymentsWithInfo(pasteText);
        p = parsed.numbers;
        if (p.length > 0 && p.length !== currentCount) {
          setWarning(`检测到 ${p.length} 条数据，当前期数为 ${currentCount} 期`);
        }
        break;
      }
    }
    setPreview(p);
  };

  return (
    <View className="batch-modal">
      <View className="batch-modal__overlay" onClick={onClose} />
      <View className="batch-modal__content">
        <View className="batch-modal__header">
          <Text className="batch-modal__title">批量填充</Text>
          <Button className="batch-modal__close" onClick={onClose}>✕</Button>
        </View>

        <View className="batch-modal__body">
          <View className="batch-section">
            <Text className="batch-section__label">填充范围</Text>
            <View className="batch-section__options">
              <View
                className={`batch-option ${fillScope === 'replace' ? 'batch-option--active' : ''}`}
                onClick={() => { setFillScope('replace'); updatePreview(); }}
              >
                <Text className="batch-option__text">替换全部</Text>
              </View>
              <View
                className={`batch-option ${fillScope === 'fill_empty' ? 'batch-option--active' : ''}`}
                onClick={() => { setFillScope('fill_empty'); updatePreview(); }}
              >
                <Text className="batch-option__text">仅填充空白</Text>
              </View>
            </View>
          </View>

          <View className="batch-divider" />

          <View className="batch-mode-list">
            <View
              className={`batch-mode-item ${fillMode === 'uniform' ? 'batch-mode-item--active' : ''}`}
              onClick={() => setFillMode('uniform')}
            >
              <View className="batch-mode-item__radio" />
              <Text className="batch-mode-item__label">统一金额</Text>
              <Text className="batch-mode-item__desc">所有期数填写相同金额</Text>
            </View>
            {fillMode === 'uniform' && (
              <View className="batch-input-row">
                <Text className="batch-input-row__label">每期金额</Text>
                <Input
                  className="batch-input-row__input"
                  type="digit"
                  placeholder="输入金额"
                  value={uniformAmount}
                  onInput={(e: any) => { setUniformAmount(e.detail.value); setTimeout(updatePreview, 0); }}
                />
              </View>
            )}

            <View
              className={`batch-mode-item ${fillMode === 'arithmetic' ? 'batch-mode-item--active' : ''}`}
              onClick={() => setFillMode('arithmetic')}
            >
              <View className="batch-mode-item__radio" />
              <Text className="batch-mode-item__label">等差数列</Text>
              <Text className="batch-mode-item__desc">每期递增或递减相同金额</Text>
            </View>
            {fillMode === 'arithmetic' && (
              <>
                <View className="batch-input-row">
                  <Text className="batch-input-row__label">首期金额</Text>
                  <Input
                    className="batch-input-row__input"
                    type="digit"
                    placeholder="首期金额"
                    value={arithFirst}
                    onInput={(e: any) => { setArithFirst(e.detail.value); setTimeout(updatePreview, 0); }}
                  />
                </View>
                <View className="batch-input-row">
                  <Text className="batch-input-row__label">末期金额</Text>
                  <Input
                    className="batch-input-row__input"
                    type="digit"
                    placeholder="末期金额"
                    value={arithLast}
                    onInput={(e: any) => { setArithLast(e.detail.value); setTimeout(updatePreview, 0); }}
                  />
                </View>
              </>
            )}

            <View
              className={`batch-mode-item ${fillMode === 'geometric' ? 'batch-mode-item--active' : ''}`}
              onClick={() => setFillMode('geometric')}
            >
              <View className="batch-mode-item__radio" />
              <Text className="batch-mode-item__label">等比数列</Text>
              <Text className="batch-mode-item__desc">每期按固定比例变化</Text>
            </View>
            {fillMode === 'geometric' && (
              <>
                <View className="batch-input-row">
                  <Text className="batch-input-row__label">首期金额</Text>
                  <Input
                    className="batch-input-row__input"
                    type="digit"
                    placeholder="首期金额"
                    value={geoFirst}
                    onInput={(e: any) => { setGeoFirst(e.detail.value); setTimeout(updatePreview, 0); }}
                  />
                </View>
                <View className="batch-input-row">
                  <Text className="batch-input-row__label">末期金额</Text>
                  <Input
                    className="batch-input-row__input"
                    type="digit"
                    placeholder="末期金额"
                    value={geoLast}
                    onInput={(e: any) => { setGeoLast(e.detail.value); setTimeout(updatePreview, 0); }}
                  />
                </View>
              </>
            )}

            <View
              className={`batch-mode-item ${fillMode === 'paste' ? 'batch-mode-item--active' : ''}`}
              onClick={() => setFillMode('paste')}
            >
              <View className="batch-mode-item__radio" />
              <Text className="batch-mode-item__label">手动导入</Text>
              <Text className="batch-mode-item__desc">粘贴数据</Text>
            </View>
            {fillMode === 'paste' && (
              <View className="batch-paste-section">
                <textarea
                  className="batch-paste-section__textarea"
                  placeholder="支持多种格式：逗号、空格、换行分隔、表格数据等"
                  value={pasteText}
                  onChange={(e: any) => { setPasteText(e.detail.value); setTimeout(updatePreview, 0); }}
                />
                {preview.length > 0 && (
                  <Text className="batch-paste-section__hint">已识别 {preview.length} 条数据</Text>
                )}
              </View>
            )}
          </View>

          {warning && (
            <View className="batch-warning">
              <Text className="batch-warning__icon">⚠️</Text>
              <Text className="batch-warning__text">{warning}</Text>
            </View>
          )}

          {preview.length > 0 && (
            <View className="batch-preview">
              <Text className="batch-preview__title">
                预览（共 {preview.length} 期，合计 ¥{preview.reduce((a, b) => a + b, 0).toLocaleString()}）
              </Text>
              <View className="batch-preview__items">
                {preview.slice(0, 8).map((v, i) => (
                  <Text key={i} className="batch-preview__item">
                    第{i + 1}期: ¥{v}
                  </Text>
                ))}
                {preview.length > 8 && (
                  <Text className="batch-preview__more">... 还有 {preview.length - 8} 期</Text>
                )}
              </View>
            </View>
          )}
        </View>

        <View className="batch-modal__footer">
          <Button className="batch-modal__btn batch-modal__btn--cancel" onClick={onClose}>取消</Button>
          <Button className="batch-modal__btn batch-modal__btn--confirm" onClick={handleConfirm}>
            {fillScope === 'replace' ? '确认替换' : '确认填充'}
          </Button>
        </View>
      </View>
    </View>
  );
}
