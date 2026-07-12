// 真实API服务 - 调用后端接口
import Taro from '@tarojs/taro'
import { API_BASE_URL, REQUEST_TIMEOUT } from '../config/index'
import { getToken, setToken, setUserInfo, removeToken, removeUserInfo, getUserInfo as getStoredUserInfo } from '../utils/storage'

// 响应类型定义
interface ApiResponse<T = any> {
  code: number
  message: string
  data?: T
}

// 用户信息类型
export interface UserInfo {
  id: number
  username: string
  nickname?: string
  avatar?: string
  phone?: string
  email?: string
  created_at: string
}

// 登录响应类型
export interface LoginResponse {
  token: string
  user: UserInfo
}

// 封装请求方法
const request = async <T = any>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: any,
  needAuth: boolean = false
): Promise<ApiResponse<T>> => {
  try {
    // 获取token和用户信息
    const token = getToken()
    const userInfo = getStoredUserInfo()
    console.log('[API] 请求URL:', `${API_BASE_URL}${url}`)
    console.log('[API] Token:', token ? '存在' : '不存在')

    // 设置请求头
    const header: any = {
      'Content-Type': 'application/json'
    }

    if (needAuth && token) {
      header.Authorization = `Bearer ${token}`
    }

    // 如果已登录，将用户ID放入header，作为cookie的后备方案
    if (userInfo?.id) {
      header['X-User-Id'] = String(userInfo.id)
    }

    // 发起请求
    const response = await Taro.request({
      url: `${API_BASE_URL}${url}`,
      method,
      data,
      header,
      timeout: REQUEST_TIMEOUT
    })

    const result = response.data as ApiResponse<T>

    if (!result) {
      throw new Error('服务器响应为空')
    }

    if (result.code !== 200) {
      if (result.code === 401 && needAuth) {
        removeToken()
        removeUserInfo()
      }
      throw new Error(result.message || '请求失败')
    }

    return result
  } catch (error: any) {
    console.error('API请求错误:', error)
    const errorMessage = error.message || '请求失败，请稍后重试'
    Taro.showToast({
      title: errorMessage,
      icon: 'none',
      duration: 2500,
      mask: true
    })
    throw error
  }
}

// 登录接口
export const login = async (data: {
  phone?: string
  username?: string
  password: string
}): Promise<ApiResponse<LoginResponse>> => {
  const response = await request<LoginResponse>('/api/user/login', 'POST', data, false)

  // 保存token和用户信息
  if (response.data) {
    setToken(response.data.token)
    setUserInfo(response.data.user)
  }

  return response
}

// 注册接口
export const register = async (data: {
  phone?: string
  email?: string
  username?: string
  password: string
  nickname?: string
  securityQuestion?: string
  securityAnswer?: string
}): Promise<ApiResponse<UserInfo>> => {
  return request<UserInfo>('/api/user/register', 'POST', data, false)
}

// 获取用户信息接口
export const getUserInfo = async (): Promise<ApiResponse<UserInfo>> => {
  return request<UserInfo>('/api/user/info', 'GET', undefined, true)
}

// 修改密码接口
export const changePassword = async (data: {
  oldPassword: string
  newPassword: string
}): Promise<ApiResponse<null>> => {
  return request<null>('/api/user/password', 'PUT', data, true)
}

// 修改昵称接口
export const updateNickname = async (data: {
  nickname: string
}): Promise<ApiResponse<UserInfo>> => {
  const response = await request<UserInfo>('/api/user/nickname', 'PUT', data, true)

  // 更新本地存储的用户信息
  if (response.data) {
    setUserInfo(response.data)
  }

  return response
}

// 退出登录接口
export const logout = async (): Promise<ApiResponse<null>> => {
  const response = await request<null>('/api/user/logout', 'POST', undefined, true)

  // 清除本地存储
  removeToken()
  removeUserInfo()

  return response
}

// 发送重置密码验证码（通过邮箱）
export const sendResetEmail = async (data: {
  email: string
}): Promise<ApiResponse<{ message: string }>> => {
  return request<{ message: string }>('/api/user/reset/email', 'POST', data, false)
}

// 验证邮箱验证码
export const verifyEmailCode = async (data: {
  email: string
  code: string
}): Promise<ApiResponse<{ resetToken: string }>> => {
  return request<{ resetToken: string }>('/api/user/reset/email/verify', 'POST', data, false)
}

// 通过手机号获取安全问题
export const getSecurityQuestion = async (data: {
  phone: string
}): Promise<ApiResponse<{ securityQuestion: string }>> => {
  return request<{ securityQuestion: string }>('/api/user/reset/question', 'POST', data, false)
}

// 验证安全问题答案
export const verifySecurityAnswer = async (data: {
  phone: string
  answer: string
}): Promise<ApiResponse<{ resetToken: string }>> => {
  return request<{ resetToken: string }>('/api/user/reset/verify', 'POST', data, false)
}

// 验证重置令牌
export const verifyResetToken = async (token: string): Promise<ApiResponse<{ userId: number }>> => {
  return request<{ userId: number }>(`/api/user/reset/verify/${token}`, 'GET', undefined, false)
}

// 通过用户ID重置密码
export const resetPassword = async (data: {
  userId: number
  newPassword: string
}): Promise<ApiResponse<null>> => {
  return request<null>('/api/user/reset/password', 'POST', data, false)
}

export interface FeeItem {
  name: string;
  amount: number;
  chargeType: 'monthly' | 'one-time';
}

export interface CalculationParams {
  mode: 'fixed' | 'custom' | 'fee';
  principal: number;
  fixedPayment?: number;
  customPayments?: number[];
  periods?: number;
  loanDate?: string;
  paidPeriods?: number;
  fees?: FeeItem[];
}

export type ComplianceStatus = 'compliant' | 'warning' | 'excessive';

export interface CalculationResult {
  irr: number;
  irrCompound: number;
  monthlyIRR: number;
  nominalAPR: number;
  complianceStatus: ComplianceStatus;
  complianceLimit: number;
  lprUsed: number;
  lprDate: string;
  totalPayment: number;
  totalInterest: number;
  excessInterest: number;
  excessPaid: number;
  avgPayment?: number;
  maxPayment?: number;
  minPayment?: number;
  paymentConcentration?: number;
  periods: number;
  cashFlows: number[];
}

export const calculate = async (params: CalculationParams): Promise<ApiResponse<CalculationResult>> => {
  return request<CalculationResult>('/api/calculator/calculate', 'POST', params, false)
}

export interface LPRInfo {
  date: string;
  value: number;
}

export const getLPR = async (): Promise<ApiResponse<{ latest: LPRInfo }>> => {
  return request<{ latest: LPRInfo }>('/api/calculator/lpr', 'GET', undefined, false)
}
