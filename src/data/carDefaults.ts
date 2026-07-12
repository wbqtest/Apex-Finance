// 车贷精算师 - 内置兜底配置
// 后端不可用 / 未配置时使用的离线默认配置，结构与后端 /api/config/* 响应对齐。

export type FeeCycle = 'ONCE' | 'YEARLY' | 'MONTHLY';

export interface FeePreset {
  type: string;
  label: string;
  defaultAmount: number;
  cycle: FeeCycle;
  required: boolean;
  tips?: string;
}

export interface MarketRate {
  bankName: string;
  rateMin: number;
  rateMax: number;
  term: string;
  updateDate: string | null;
  source: string | null;
}

export interface KnowledgeItem {
  id: number;
  category: string;
  title: string;
  content: string;
  readTime: number;
}

export interface RepaymentType {
  type: string;
  label: string;
  description: string | null;
  applicableScenario: string | null;
  example: string | null;
}

export interface CalcParam {
  loanTermOptions: number[];
  defaultTerm: number;
  rateMin: number;
  rateMax: number;
  downPaymentMin: number;
  downPaymentMax: number;
  maxFeeAmount: number;
  maxCustomFees: number;
}

/** 本地缓存的配置包结构 */
export interface CarConfigBundle {
  feePresets: FeePreset[];
  marketRates: MarketRate[];
  knowledge: KnowledgeItem[];
  repaymentTypes: RepaymentType[];
  calcParams: CalcParam;
  version: string;
}

export const DEFAULT_CAR_CONFIG: CarConfigBundle = {
  feePresets: [
    { type: 'SERVICE_FEE', label: '金融服务费', defaultAmount: 3000, cycle: 'ONCE', required: false, tips: '部分4S店会收取，可议价' },
    { type: 'INSURANCE', label: '强制保险', defaultAmount: 5000, cycle: 'YEARLY', required: false, tips: '贷款期内通常要求在指定机构购买' },
    { type: 'GPS', label: 'GPS安装费', defaultAmount: 1500, cycle: 'ONCE', required: false, tips: '部分金融机构要求安装GPS定位' },
    { type: 'REGISTRATION', label: '上牌费', defaultAmount: 500, cycle: 'ONCE', required: false, tips: '含牌照工本及代办服务费' },
    { type: 'MORTGAGE', label: '抵押费', defaultAmount: 800, cycle: 'ONCE', required: false, tips: '车辆抵押登记相关费用' },
    { type: 'EXTENDED_WARRANTY', label: '延保费', defaultAmount: 2000, cycle: 'ONCE', required: false, tips: '延长质保服务，可按需选择' },
  ],
  marketRates: [
    { bankName: '建设银行', rateMin: 6.8, rateMax: 8.2, term: '12-60期', updateDate: '2026-07-01', source: '官网公示' },
    { bankName: '招商银行', rateMin: 7.0, rateMax: 9.0, term: '12-60期', updateDate: '2026-07-01', source: '官网公示' },
    { bankName: '工商银行', rateMin: 6.5, rateMax: 7.8, term: '12-60期', updateDate: '2026-07-01', source: '官网公示' },
    { bankName: '农业银行', rateMin: 6.6, rateMax: 7.9, term: '12-60期', updateDate: '2026-07-01', source: '官网公示' },
  ],
  knowledge: [
    { id: 1, category: 'IRR', title: 'IRR（内部收益率）是什么？', content: 'IRR 是衡量贷款真实成本的核心指标。它把所有还款现金流折现为 0 时的年化利率。\n\n由于车贷常含各项费用，名义利率会低估实际成本，IRR 能反映包含费用后的真实年化成本，是不同方案对比的公平基准。', readTime: 2 },
    { id: 2, category: '费用', title: '警惕隐藏的服务费陷阱', content: '金融服务费、GPS费、保险费等会抬高真实成本。\n\n对比方案时应把一次性费用摊到各期，用 IRR 口径衡量，避免只看"月供低"被误导。', readTime: 2 },
    { id: 3, category: '提前还款', title: '提前还款要注意什么？', content: '提前还款可节省后续利息，但需关注：\n\n1. 是否有违约金（剩余本金比例或固定金额）\n2. 已还利息不退\n3. 盈亏平衡点：通常前期还款省息最多', readTime: 3 },
    { id: 4, category: '还款方式', title: '不同还款方式怎么选？', content: '等额本息每月还款额固定，压力均衡；等额本金前期月供高、总利息少；先息后本前期只还利息、末期还本金；气球贷前期低月供、末期大额尾款。\n\n用 IRR 对比各方式真实成本。', readTime: 3 },
  ],
  repaymentTypes: [
    { type: 'EQUAL_PRINCIPAL_INTEREST', label: '等额本息', description: '每月还款额固定，包含部分本金与利息，前期利息占比高。', applicableScenario: '收入稳定的上班族，追求月供可预期。', example: '贷款15万、36期、年化7.2%：每月约还款4642元。' },
    { type: 'EQUAL_PRINCIPAL', label: '等额本金', description: '每月偿还固定本金，利息随剩余本金递减，月供逐月降低。', applicableScenario: '前期还款能力强、希望总利息更少的用户。', example: '贷款15万、36期、年化7.2%：首月约4898元，逐月递减约25元。' },
    { type: 'INTEREST_FIRST', label: '先息后本', description: '前期每月仅还利息，末期一次性归还全部本金。', applicableScenario: '短期资金周转、末期有大额回款预期的经营用户。', example: '贷款15万、12期、年化7.2%：每月还利息900元，末期还本金15万。' },
    { type: 'BALLOON', label: '气球贷', description: '前期按月供较低金额还款，末期需一次性还清大额尾款（气球款）。', applicableScenario: '希望降低前期月供、计划末期置换或 refinance 的用户。', example: '贷款15万、36期、年化7.2%、尾款50%：前期月供低，末期还7.5万尾款。' },
  ],
  calcParams: {
    loanTermOptions: [12, 24, 36, 48, 60],
    defaultTerm: 36,
    rateMin: 0,
    rateMax: 24,
    downPaymentMin: 0,
    downPaymentMax: 80,
    maxFeeAmount: 50000,
    maxCustomFees: 5,
  },
  version: '0',
};
