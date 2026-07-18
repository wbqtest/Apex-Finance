// 提前还贷 - 方案对比本地存储（独立命名空间）
import Taro from '@tarojs/taro';
import { PrepayInput, PrepayResult } from './prepayCalc';

export interface PrepayScheme {
  id: string;
  label: string;
  input: PrepayInput;
  result: PrepayResult;
  createdAt: number;
}

const KEY = 'prepay_schemes';

export const getPrepaySchemes = (): PrepayScheme[] => {
  try {
    return Taro.getStorageSync(KEY) || [];
  } catch {
    return [];
  }
};

export const addPrepayScheme = (scheme: PrepayScheme): PrepayScheme[] => {
  try {
    const list = getPrepaySchemes();
    list.push(scheme);
    Taro.setStorageSync(KEY, list);
    return list;
  } catch {
    return getPrepaySchemes();
  }
};

export const removePrepayScheme = (id: string): PrepayScheme[] => {
  try {
    const list = getPrepaySchemes().filter((s) => s.id !== id);
    Taro.setStorageSync(KEY, list);
    return list;
  } catch {
    return getPrepaySchemes();
  }
};

export const clearPrepaySchemes = (): void => {
  try {
    Taro.removeStorageSync(KEY);
  } catch {
    /* ignore */
  }
};
