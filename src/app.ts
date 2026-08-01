import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import './app.less';
import { initTheme } from './utils/theme';
import { initCarConfig } from './services/carConfig';
import { ThemeProvider } from './context/ThemeContext';

// NutUI 样式在各平台下由组件自动处理，无需手动导入 style.css

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.');
    initTheme();
    // 车贷精算师：启动预拉取配置（非阻塞，失败静默降级到内置兜底）
    initCarConfig().catch((e) => console.warn('[App] 车贷配置预热失败:', e));
  });

  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}

export default App;
