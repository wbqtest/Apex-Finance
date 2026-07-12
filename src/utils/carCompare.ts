// 车贷精算师 - 方案对比本地存储（独立命名空间）
import Taro from '@tarojs/taro';
import { CarLoanInput, CarLoanResult } from './carFinance';

export interface CarScheme {
  id: string;
  label: string;
  input: CarLoanInput;
  result: CarLoanResult;
  createdAt: number;
}

const KEY = 'carloan_schemes';

export const getCarSchemes = (): CarScheme[] => {
  try {
    return Taro.getStorageSync(KEY) || [];
  } catch {
    return [];
  }
};

export const addCarScheme = (scheme: CarScheme): CarScheme[] => {
  try {
    const list = getCarSchemes();
    list.push(scheme);
    Taro.setStorageSync(KEY, list);
    return list;
  } catch {
    return getCarSchemes();
  }
};

export const removeCarScheme = (id: string): CarScheme[] => {
  try {
    const list = getCarSchemes().filter((s) => s.id !== id);
    Taro.setStorageSync(KEY, list);
    return list;
  } catch {
    return getCarSchemes();
  }
};

export const clearCarSchemes = (): void => {
  try {
    Taro.removeStorageSync(KEY);
  } catch {
    /* ignore */
  }
};
