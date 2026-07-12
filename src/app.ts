import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import '@nutui/nutui-react-taro/dist/style.css';
import './app.less';
import { initTheme } from './utils/theme';
import { initCarConfig } from './services/carConfig';

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.');
    initTheme();
    // 车贷精算师：启动预拉取配置（非阻塞，失败静默降级到内置兜底）
    initCarConfig().catch((e) => console.warn('[App] 车贷配置预热失败:', e));
  });

  return children;
}

export default App;
