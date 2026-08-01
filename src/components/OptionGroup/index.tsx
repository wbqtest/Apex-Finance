import { View, Text } from '@tarojs/components';
import './index.less';

export interface OptionItem<T extends string | number> {
  value: T;
  label: string;
  desc?: string;
}

export interface OptionGroupProps<T extends string | number> {
  options: OptionItem<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: 'card' | 'tag' | 'segment';
  /** 是否显示左侧 radio 圆点，仅 card 生效 */
  showRadio?: boolean;
  /** 每行显示列数，仅 card 生效；默认自动 */
  columns?: 2 | 3 | 4 | 5;
  /** 是否占满父容器宽度 */
  block?: boolean;
}

export default function OptionGroup<T extends string | number>({
  options,
  value,
  onChange,
  variant = 'card',
  showRadio = false,
  columns,
  block = false,
}: OptionGroupProps<T>) {
  const rootClass = [
    'option-group',
    `option-group--${variant}`,
    block ? 'option-group--block' : '',
  ].filter(Boolean).join(' ');

  if (variant === 'segment') {
    return (
      <View className={rootClass}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <View
              key={String(opt.value)}
              className={`option-segment-item ${active ? 'active' : ''}`}
              onClick={() => onChange(opt.value)}
            >
              <Text className="option-segment-text">{opt.label}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  if (variant === 'tag') {
    return (
      <View className={rootClass}>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <View
              key={String(opt.value)}
              className={`option-tag ${active ? 'active' : ''}`}
              onClick={() => onChange(opt.value)}
            >
              <Text className="option-tag-text">{opt.label}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View
      className={[rootClass, columns ? `option-group--cols-${columns}` : ''].filter(Boolean).join(' ')}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <View
            key={String(opt.value)}
            className={`option-card ${active ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {showRadio && (
              <View className={`option-radio ${active ? 'checked' : ''}`} />
            )}
            <View className="option-card-body">
              <Text className="option-card-label">{opt.label}</Text>
              {opt.desc ? <Text className="option-card-desc">{opt.desc}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
