// 存储工具类 - 封装常用的存储操作
import Taro from '@tarojs/taro'
import { CalculationParams, CalculationResult } from './finance'

export interface UserInfo {
  id: number;
  phone: string;
  nickname: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 通用存储方法
export const setStorage = async (key: string, value: any): Promise<void> => {
  try {
    await Taro.setStorage({ key, data: value })
  } catch (error) {
    console.error(`存储${key}失败:`, error)
  }
}

export const getStorage = async (key: string): Promise<any> => {
  try {
    const result = await Taro.getStorage({ key })
    return result.data
  } catch (error) {
    console.error(`获取${key}失败:`, error)
    return null
  }
}

export const removeStorage = async (key: string): Promise<void> => {
  try {
    await Taro.removeStorage({ key })
  } catch (error) {
    console.error(`删除${key}失败:`, error)
  }
}

// Token管理
export const TOKEN_KEY = 'token'

export const setToken = (token: string) => {
  try {
    Taro.setStorageSync(TOKEN_KEY, token)
  } catch (error) {
    console.error('存储token失败:', error)
  }
}

export const getToken = (): string => {
  try {
    return Taro.getStorageSync(TOKEN_KEY) || ''
  } catch (error) {
    console.error('获取token失败:', error)
    return ''
  }
}

export const removeToken = () => {
  try {
    Taro.removeStorageSync(TOKEN_KEY)
  } catch (error) {
    console.error('删除token失败:', error)
  }
}

// 用户信息管理
export const USER_INFO_KEY = 'userInfo'

export const setUserInfo = (userInfo: any) => {
  try {
    Taro.setStorageSync(USER_INFO_KEY, userInfo)
  } catch (error) {
    console.error('存储用户信息失败:', error)
  }
}

export const getUserInfo = (): any => {
  try {
    return Taro.getStorageSync(USER_INFO_KEY) || null
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

export const removeUserInfo = () => {
  try {
    Taro.removeStorageSync(USER_INFO_KEY)
  } catch (error) {
    console.error('删除用户信息失败:', error)
  }
}

// 清除所有登录信息
export const clearLoginInfo = () => {
  removeToken()
  removeUserInfo()
  removeSavedCredentials()
}

// 记住的账号密码（用于自动登录）
export const SAVED_CREDENTIALS_KEY = 'saved_credentials'

export interface SavedCredentials {
  phone: string
  password: string
  timestamp: number
}

// 保存账号密码（登录成功后调用，用于下次自动登录）
export const setSavedCredentials = (phone: string, password: string) => {
  try {
    const credentials: SavedCredentials = {
      phone,
      password,
      timestamp: Date.now(),
    }
    Taro.setStorageSync(SAVED_CREDENTIALS_KEY, credentials)
  } catch (error) {
    console.error('保存账号密码失败:', error)
  }
}

// 获取保存的账号密码
export const getSavedCredentials = (): SavedCredentials | null => {
  try {
    return Taro.getStorageSync(SAVED_CREDENTIALS_KEY) || null
  } catch (error) {
    console.error('获取账号密码失败:', error)
    return null
  }
}

// 清除保存的账号密码
export const removeSavedCredentials = () => {
  try {
    Taro.removeStorageSync(SAVED_CREDENTIALS_KEY)
  } catch (error) {
    console.error('删除账号密码失败:', error)
  }
}

// 检查是否已登录
export const isLoggedIn = (): boolean => {
  return !!getToken()
}

// 草稿相关存储
export const DRAFT_KEY = 'calc_draft'

export interface CalcDraft {
  params: any;
  fees: any[];
  timestamp: number;
}

export const saveDraft = (params: any, fees: any[]): void => {
  try {
    const draft: CalcDraft = {
      params,
      fees,
      timestamp: Date.now(),
    }
    Taro.setStorageSync(DRAFT_KEY, draft)
  } catch (error) {
    console.error('存储草稿失败:', error)
  }
}

export const getDraft = (): CalcDraft | null => {
  try {
    const draft = Taro.getStorageSync(DRAFT_KEY)
    return draft || null
  } catch (error) {
    console.error('获取草稿失败:', error)
    return null
  }
}

export const removeDraft = (): void => {
  try {
    Taro.removeStorageSync(DRAFT_KEY)
  } catch (error) {
    console.error('删除草稿失败:', error)
  }
}

export const clearAllLocalData = (): void => {
  try {
    Taro.clearStorageSync()
  } catch (error) {
    console.error('清除所有本地数据失败:', error)
  }
}

// 计算历史相关存储
export const HISTORY_KEY = 'calc_history'

export interface CalcHistoryItem {
  id: string;
  params: any;
  fees: any[];
  result: any;
  timestamp: number;
}

export const MAX_HISTORY_COUNT = 20

export const saveHistory = (params: any, fees: any[], result: any): void => {
  try {
    const history = getHistory()
    const item: CalcHistoryItem = {
      id: Date.now().toString(),
      params,
      fees,
      result,
      timestamp: Date.now(),
    }
    history.unshift(item)
    if (history.length > MAX_HISTORY_COUNT) {
      history.pop()
    }
    Taro.setStorageSync(HISTORY_KEY, history)
  } catch (error) {
    console.error('存储历史记录失败:', error)
  }
}

export const getHistory = (): CalcHistoryItem[] => {
  try {
    const history = Taro.getStorageSync(HISTORY_KEY)
    return history || []
  } catch (error) {
    console.error('获取历史记录失败:', error)
    return []
  }
}

export const removeHistoryItem = (id: string): void => {
  try {
    const history = getHistory().filter(item => item.id !== id)
    Taro.setStorageSync(HISTORY_KEY, history)
  } catch (error) {
    console.error('删除历史记录失败:', error)
  }
}

export const clearHistory = (): void => {
  try {
    Taro.removeStorageSync(HISTORY_KEY)
  } catch (error) {
    console.error('清空历史记录失败:', error)
  }
}

// 贷款对比相关存储
export interface CompareItem {
  id: string;
  timestamp: number;
  params: CalculationParams;
  result: CalculationResult;
  platformName?: string;
}

const COMPARE_KEY = 'wangdai_compare'

export const getCompareList = (): CompareItem[] => {
  try {
    const d = Taro.getStorageSync(COMPARE_KEY)
    return d ? (typeof d === 'string' ? JSON.parse(d) : d) : []
  } catch { return [] }
}

export const saveCompareList = (list: CompareItem[]) => {
  try { Taro.setStorageSync(COMPARE_KEY, JSON.stringify(list)) } catch { /* silent */ }
}

export const addToCompare = (r: CompareItem): CompareItem[] => {
  try {
    const list = getCompareList()
    const exists = list.find(l => l.id === r.id)
    if (!exists) {
      list.unshift({ ...r, platformName: r.platformName || ('贷款' + (list.length + 1)) })
      if (list.length > 20) list.length = 20
      saveCompareList(list)
    }
    return list
  } catch { return getCompareList() }
}

export const removeFromCompare = (id: string): CompareItem[] => {
  try {
    const list = getCompareList().filter(l => l.id !== id)
    saveCompareList(list)
    return list
  } catch { return getCompareList() }
}

export const updateComparePlatformName = (id: string, name: string): CompareItem[] => {
  try {
    const list = getCompareList()
    const item = list.find(l => l.id === id)
    if (item) { item.platformName = name; saveCompareList(list) }
    return list
  } catch { return getCompareList() }
}
