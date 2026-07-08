import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import '@nutui/nutui-react-taro/dist/style.css';
import './app.less';
import { initTheme } from './utils/theme';

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.');
    initTheme();
  });

  return children;
}

export default App;
