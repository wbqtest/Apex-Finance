import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import './app.less';

// NutUI 全局样式：仅 H5/小程序需要，RN 端 NutUI 组件自带样式
// #ifdef H5
import '@nutui/nutui-react-taro/dist/style.css';
// #endif
import { initTheme } from './utils/theme';
import { initCarConfig } from './services/carConfig';
import { ThemeProvider } from './context/ThemeContext';
import { getSavedCredentials, isLoggedIn, removeSavedCredentials } from './utils/storage';
import { login } from './services/api';

// NutUI 全局样式已在 app.less 中引入，H5/小程序生效；RN 使用 app.rn.less 避免引入不兼容样式

/**
 * 自动登录：用户无感知
 * 启动时检查本地是否保存了账号密码，且当前未登录（无 token），则自动调用登录接口
 * 失败则清除保存的账号密码（避免持续无效重试）
 */
async function tryAutoLogin() {
  // 已登录则跳过
  if (isLoggedIn()) {
    console.log('[AutoLogin] 已登录，跳过自动登录');
    return;
  }

  const credentials = getSavedCredentials();
  if (!credentials || !credentials.phone || !credentials.password) {
    console.log('[AutoLogin] 无保存的账号密码，跳过');
    return;
  }

  console.log('[AutoLogin] 检测到保存的账号密码，尝试自动登录...');
  try {
    await login({ phone: credentials.phone, password: credentials.password });
    console.log('[AutoLogin] 自动登录成功');
  } catch (e) {
    console.warn('[AutoLogin] 自动登录失败，清除保存的账号密码:', e);
    // 登录失败（密码已改/账号已注销等），清除凭据避免下次继续失败
    removeSavedCredentials();
  }
}

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.');
    initTheme();
    // 车贷精算师：启动预拉取配置（非阻塞，失败静默降级到内置兜底）
    initCarConfig().catch((e) => console.warn('[App] 车贷配置预热失败:', e));
    // 自动登录（非阻塞，用户无感知）
    tryAutoLogin().catch((e) => console.warn('[App] 自动登录异常:', e));
  });

  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}

export default App;
