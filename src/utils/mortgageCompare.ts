// 房贷精算师 - 方案对比本地存储（独立命名空间）
import Taro from '@tarojs/taro';
import { MortgageInput, MortgageResult } from './mortgage';

export interface MortgageScheme {
  id: string;
  label: string;
  input: MortgageInput;
  result: MortgageResult;
  createdAt: number;
}

const KEY = 'mortgage_schemes';

export const getMortgageSchemes = (): MortgageScheme[] => {
  try {
    return Taro.getStorageSync(KEY) || [];
  } catch {
    return [];
  }
};

export const addMortgageScheme = (scheme: MortgageScheme): MortgageScheme[] => {
  try {
    const list = getMortgageSchemes();
    list.push(scheme);
    Taro.setStorageSync(KEY, list);
    return list;
  } catch {
    return getMortgageSchemes();
  }
};

export const removeMortgageScheme = (id: string): MortgageScheme[] => {
  try {
    const list = getMortgageSchemes().filter((s) => s.id !== id);
    Taro.setStorageSync(KEY, list);
    return list;
  } catch {
    return getMortgageSchemes();
  }
};

export const clearMortgageSchemes = (): void => {
  try {
    Taro.removeStorageSync(KEY);
  } catch {
    /* ignore */
  }
};
