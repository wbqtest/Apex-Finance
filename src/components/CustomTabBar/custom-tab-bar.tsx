import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import { getTheme, themes } from '../../utils/theme';
import TabBarIcons from './TabBarIcons';
import './custom-tab-bar.less';

interface TabItem {
  key: string;
  path: string;
  text: string;
  icon: 'index' | 'mortgage' | 'auto' | 'prepay' | 'mine';
}

const tabs: TabItem[] = [
  { key: 'index', path: '/pages/index', text: '首页', icon: 'index' },
  { key: 'mortgage', path: '/pages/mortgage', text: '房贷计算', icon: 'mortgage' },
  { key: 'auto', path: '/pages/auto', text: '车贷计算', icon: 'auto' },
  { key: 'prepay', path: '/pages/prepay', text: '提前还贷', icon: 'prepay' },
  { key: 'mine', path: '/pages/mine', text: '我的', icon: 'mine' },
];

const getActiveKey = (): string => {
  try {
    const pages = Taro.getCurrentPages();
    if (pages.length > 0) {
      const route = pages[pages.length - 1].route || '';
      for (const tab of tabs) {
        if (route.includes(tab.path.replace('/', ''))) {
          return tab.key;
        }
      }
    }
  } catch (e) {
    console.warn('getCurrentPages error:', e);
  }

  // H5 兜底：通过 URL hash 匹配当前 tab（小程序 / RN 无 window）
  if (typeof window !== 'undefined' && window.location) {
    const hash = window.location.hash;
    for (const tab of tabs) {
      if (hash.includes(tab.path)) {
        return tab.key;
      }
    }
  }

  return tabs[0].key;
};

const getIconColor = (isActive: boolean): string => {
  const themeName = getTheme();
  const themeConfig = themes[themeName];
  if (!themeConfig) return isActive ? '#E86272' : '#9CA3AF';
  return isActive ? themeConfig.tabActive : themeConfig.tabInactive;
};

export default function CustomTabBar() {
  const [activeKey, setActiveKey] = useState<string>(tabs[0].key);

  Taro.useDidShow(() => {
    const key = getActiveKey();
    if (key !== activeKey) {
      setActiveKey(key);
    }
  });

  const handleTabClick = (tab: TabItem) => {
    if (tab.key === activeKey) return;
    setActiveKey(tab.key);
    Taro.switchTab({ url: tab.path });
  };

  return (
    <View className="custom-tab-bar">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <View
            key={tab.key}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => handleTabClick(tab)}
          >
            <View className="tab-icon">
              <TabBarIcons name={tab.icon} color={getIconColor(isActive)} />
            </View>
            <Text className="tab-text">{tab.text}</Text>
          </View>
        );
      })}
    </View>
  );
}
