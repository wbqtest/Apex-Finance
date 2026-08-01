import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import './app.less';
import { initTheme } from './utils/theme';
import { initCarConfig } from './services/carConfig';
import { ThemeProvider } from './context/ThemeContext';

// NutUI 全局样式已在 app.less 中引入，H5/小程序生效；RN 使用 app.rn.less 避免引入不兼容样式

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
