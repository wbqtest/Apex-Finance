// 车贷精算师 - 本地配置缓存（独立 key 命名空间，与现有 storage.ts 隔离）
import Taro from '@tarojs/taro';
import { CarConfigBundle } from '../data/carDefaults';

const CONFIG_KEY = 'carloan_config';
const VERSION_KEY = 'carloan_config_version';

export const carStorage = {
  getConfig(): CarConfigBundle | null {
    try {
      return Taro.getStorageSync(CONFIG_KEY) || null;
    } catch {
      return null;
    }
  },
  setConfig(cfg: CarConfigBundle): void {
    try {
      Taro.setStorageSync(CONFIG_KEY, cfg);
    } catch {
      /* 忽略写入异常 */
    }
  },
  getVersion(): string {
    try {
      return Taro.getStorageSync(VERSION_KEY) || '0';
    } catch {
      return '0';
    }
  },
  setVersion(v: string): void {
    try {
      Taro.setStorageSync(VERSION_KEY, v);
    } catch {
      /* 忽略写入异常 */
    }
  },
  clear(): void {
    try {
      Taro.removeStorageSync(CONFIG_KEY);
      Taro.removeStorageSync(VERSION_KEY);
    } catch {
      /* 忽略异常 */
    }
  },
};
