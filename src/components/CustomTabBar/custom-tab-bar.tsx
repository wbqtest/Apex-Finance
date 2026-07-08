import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useState } from 'react';
import './custom-tab-bar.less';

interface TabItem {
  key: string;
  path: string;
  text: string;
  icon: string;
}

const tabs: TabItem[] = [
  { key: 'home', path: '/pages/index', text: '首页', icon: '🏠' },
  { key: 'settings', path: '/pages/settings', text: '设置', icon: '⚙️' },
  { key: 'mine', path: '/pages/mine', text: '我的', icon: '👤' },
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

  const hash = window.location.hash;
  for (const tab of tabs) {
    if (hash.includes(tab.path)) {
      return tab.key;
    }
  }

  return tabs[0].key;
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
      {tabs.map((tab) => (
        <View
          key={tab.key}
          className={`tab-item ${tab.key === activeKey ? 'active' : ''}`}
          onClick={() => handleTabClick(tab)}
        >
          <Text className="tab-icon">{tab.icon}</Text>
          <Text className="tab-text">{tab.text}</Text>
        </View>
      ))}
    </View>
  );
}
