// 车贷精算师 - 配置请求服务（与现有 api.ts 隔离：code:0 为成功，无登录态）
import Taro from '@tarojs/taro';
import { API_BASE_URL, REQUEST_TIMEOUT } from '../config/index';
import {
  DEFAULT_CAR_CONFIG,
  CarConfigBundle,
  FeePreset,
  MarketRate,
  KnowledgeItem,
  RepaymentType,
  CalcParam,
} from '../data/carDefaults';
import { carStorage } from '../utils/carStorage';

// 车贷配置接口统一响应信封
export interface CarApiResponse<T = any> {
  code: number; // 0 成功 / 40001 参数校验失败 / 40401 配置不存在 / 50001 计算异常 / 50002 系统错误
  message: string;
  data: T;
  timestamp: number;
}

// 独立请求封装：成功判定为 code === 0
const request = async <T = any>(url: string): Promise<T> => {
  const response = await Taro.request({
    url: `${API_BASE_URL}${url}`,
    method: 'GET',
    timeout: REQUEST_TIMEOUT,
    header: { 'Content-Type': 'application/json' },
  });

  const result = response.data as CarApiResponse<T>;
  if (!result || result.code !== 0) {
    throw new Error(result?.message || '请求失败');
  }
  return result.data;
};

// ===================== 单项配置拉取 =====================
export const getFeePresets = async (): Promise<FeePreset[]> =>
  (await request<{ presets: FeePreset[] }>('/api/config/fee-presets')).presets;

export const getMarketRates = async (): Promise<MarketRate[]> =>
  (await request<{ rates: MarketRate[] }>('/api/config/market-rates')).rates;

export const getKnowledge = async (): Promise<KnowledgeItem[]> =>
  (await request<{ items: KnowledgeItem[] }>('/api/config/knowledge')).items;

export const getRepaymentTypes = async (): Promise<RepaymentType[]> =>
  (await request<{ types: RepaymentType[] }>('/api/config/repayment-types')).types;

export const getCalcParams = async (): Promise<CalcParam> =>
  await request<CalcParam>('/api/config/calc-params');

export const getConfigVersion = async (): Promise<string> =>
  (await request<{ version: string }>('/api/config/version')).version;

// ===================== 同步读取本地缓存 =====================
export const getCachedCarConfig = (): CarConfigBundle =>
  carStorage.getConfig() || DEFAULT_CAR_CONFIG;

// ===================== 启动拉取（版本比对 + 降级） =====================
export const initCarConfig = async (): Promise<CarConfigBundle> => {
  const localVersion = carStorage.getVersion();
  const localConfig = carStorage.getConfig();

  try {
    const remoteVersion = await getConfigVersion();

    // 本地已有配置且版本一致：直接复用，避免无谓网络请求
    if (localConfig && localVersion === remoteVersion) {
      return localConfig;
    }

    const [feePresets, marketRates, knowledge, repaymentTypes, calcParams] = await Promise.all([
      getFeePresets(),
      getMarketRates(),
      getKnowledge(),
      getRepaymentTypes(),
      getCalcParams(),
    ]);

    const bundle: CarConfigBundle = {
      feePresets,
      marketRates,
      knowledge,
      repaymentTypes,
      calcParams,
      version: remoteVersion,
    };

    carStorage.setConfig(bundle);
    carStorage.setVersion(remoteVersion);
    return bundle;
  } catch (error) {
    // 后端不可用：降级到本地缓存；若无缓存则使用内置兜底配置
    console.warn('[carConfig] 配置拉取失败，降级使用本地/内置配置:', error);
    if (localConfig) return localConfig;
    return DEFAULT_CAR_CONFIG;
  }
};
