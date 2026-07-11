export interface TemplateExpected {
  irr: number;
  apr: number;
  totalPayment: number;
  totalInterest: number;
  complianceStatus: string;
  complianceLimit: number;
  excessInterest?: number;
  avgPayment?: number;
  maxPayment?: number;
  minPayment?: number;
  paymentConcentration?: number;
}

export interface TemplateInputSimple {
  principal: number;
  monthlyPayment: number;
  periods: number;
  quickButton?: number;
}

export interface TemplateInputPeriodic {
  principal: number;
  payments: number[];
}

export interface TemplateInputFee {
  principal: number;
  periods: number;
  fees: { name: string; amount: number; chargeType: 'monthly' | 'one-time' }[];
}

export type TemplateInput = TemplateInputSimple | TemplateInputPeriodic | TemplateInputFee;

export interface TemplateCase {
  id: string;
  name: string;
  description: string;
  category: string;
  type: 'simple' | 'periodic' | 'fee';
  input: TemplateInput;
  expected: TemplateExpected;
  legalStatus: string;
  legalStatusColor: 'compliant' | 'warning' | 'excessive';
}

export const TEMPLATES_DATA: Record<string, TemplateCase[]> = {
  simple: [
    {
      id: 'T01',
      name: '银行低息消费贷',
      description: '2026年交通银行惠民贷新客利率',
      category: '银行',
      type: 'simple',
      input: { principal: 50000, monthlyPayment: 4238.54, periods: 12, quickButton: 12 },
      expected: { irr: 3.10, apr: 3.10, totalPayment: 50862.48, totalInterest: 862.48, complianceStatus: 'compliant', complianceLimit: 12.4 },
      legalStatus: '🟢 合规',
      legalStatusColor: 'compliant',
    },
    {
      id: 'T02',
      name: '银行中等利率贷',
      description: '股份制银行消费贷',
      category: '银行',
      type: 'simple',
      input: { principal: 100000, monthlyPayment: 4345.82, periods: 24, quickButton: 24 },
      expected: { irr: 4.00, apr: 4.00, totalPayment: 104299.68, totalInterest: 4299.68, complianceStatus: 'compliant', complianceLimit: 12.4 },
      legalStatus: '🟢 合规',
      legalStatusColor: 'compliant',
    },
    {
      id: 'T03',
      name: '合规小贷',
      description: '持牌小贷公司合规产品',
      category: '小贷',
      type: 'simple',
      input: { principal: 10000, monthlyPayment: 872.84, periods: 12, quickButton: 12 },
      expected: { irr: 8.50, apr: 8.50, totalPayment: 10474.08, totalInterest: 474.08, complianceStatus: 'compliant', complianceLimit: 12.4 },
      legalStatus: '🟢 合规',
      legalStatusColor: 'compliant',
    },
    {
      id: 'T04',
      name: '信用卡账单分期',
      description: '股份制银行信用卡分期，宣传月费率0.67%',
      category: '信用卡',
      type: 'simple',
      input: { principal: 10000, monthlyPayment: 900.00, periods: 12, quickButton: 12 },
      expected: { irr: 14.31, apr: 8.00, totalPayment: 10800.00, totalInterest: 800.00, complianceStatus: 'warning', complianceLimit: 12.4 },
      legalStatus: '🟡 偏高',
      legalStatusColor: 'warning',
    },
    {
      id: 'T05',
      name: '助贷平台中等费率',
      description: '小象优品分期商城，商品溢价模式',
      category: '助贷',
      type: 'simple',
      input: { principal: 8000, monthlyPayment: 748.18, periods: 12, quickButton: 12 },
      expected: { irr: 23.95, apr: 13.70, totalPayment: 8978.12, totalInterest: 978.12, complianceStatus: 'warning', complianceLimit: 12.4 },
      legalStatus: '🟡 偏高',
      legalStatusColor: 'warning',
    },
  ],
  periodic: [
    {
      id: 'T06',
      name: '消费分期平台（媒体实测）',
      description: '《法治周末》实测网贷平台，6期等额还款',
      category: '媒体实测',
      type: 'periodic',
      input: { principal: 3000, payments: [554.19, 554.19, 554.19, 554.19, 554.19, 554.19] },
      expected: { irr: 35.89, apr: 30.00, totalPayment: 3325.14, totalInterest: 325.14, excessInterest: 165.00, complianceStatus: 'excessive', complianceLimit: 12.4, avgPayment: 554.19, maxPayment: 554.19, minPayment: 554.19, paymentConcentration: 50.00 },
      legalStatus: '🔴 超额',
      legalStatusColor: 'excessive',
    },
    {
      id: 'T07',
      name: '不规则前高后低（分期商城模式）',
      description: '花花有米平台用户投诉案例，前3期高额还款',
      category: '投诉案例',
      type: 'periodic',
      input: { principal: 6000, payments: [1046.32, 1046.32, 1046.32, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52] },
      expected: { irr: 72.00, apr: 45.00, totalPayment: 8156.64, totalInterest: 2156.64, excessInterest: 2156.64, complianceStatus: 'excessive', complianceLimit: 12.4, avgPayment: 679.72, maxPayment: 1046.32, minPayment: 557.52, paymentConcentration: 38.48 },
      legalStatus: '🔴 严重违法',
      legalStatusColor: 'excessive',
    },
    {
      id: 'T08',
      name: '砍头息·超短期高炮',
      description: '富益花APP，借款2000元秒扣600元担保费',
      category: '高炮',
      type: 'periodic',
      input: { principal: 1400, payments: [2008.22] },
      expected: { irr: 1132.65, apr: 500.00, totalPayment: 2008.22, totalInterest: 608.22, excessInterest: 608.22, complianceStatus: 'excessive', complianceLimit: 12.4, avgPayment: 2008.22, maxPayment: 2008.22, minPayment: 2008.22, paymentConcentration: 100.00 },
      legalStatus: '🔴 严重违法（涉嫌非法经营罪）',
      legalStatusColor: 'excessive',
    },
    {
      id: 'T08B',
      name: '砍头息·极端高炮',
      description: '好想用APP，借款3000元秒扣1050元',
      category: '高炮',
      type: 'periodic',
      input: { principal: 1950, payments: [3008.22] },
      expected: { irr: 2200.86, apr: 800.00, totalPayment: 3008.22, totalInterest: 1058.22, excessInterest: 1058.22, complianceStatus: 'excessive', complianceLimit: 12.4, avgPayment: 3008.22, maxPayment: 3008.22, minPayment: 3008.22, paymentConcentration: 100.00 },
      legalStatus: '🔴 严重违法',
      legalStatusColor: 'excessive',
    },
  ],
  fee: [
    {
      id: 'T09',
      name: '宜享花费用拆分',
      description: '助贷平台利息+担保费双轨费用结构',
      category: '助贷',
      type: 'fee',
      input: {
        principal: 34400,
        periods: 12,
        fees: [
          { name: '利息', amount: 125.73, chargeType: 'monthly' },
          { name: '担保费', amount: 194.23, chargeType: 'monthly' },
        ],
      },
      expected: { irr: 22.00, apr: 11.17, totalPayment: 38239.56, totalInterest: 3839.56, complianceStatus: 'warning', complianceLimit: 12.4 },
      legalStatus: '🟡 偏高',
      legalStatusColor: 'warning',
    },
    {
      id: 'T10',
      name: '易得花担保费拆分',
      description: '担保费是利息的1.66倍，变相利息',
      category: '助贷',
      type: 'fee',
      input: {
        principal: 5000,
        periods: 12,
        fees: [
          { name: '利息', amount: 56.12, chargeType: 'monthly' },
          { name: '担保费', amount: 93.24, chargeType: 'monthly' },
        ],
      },
      expected: { irr: 35.85, apr: 13.47, totalPayment: 6792.36, totalInterest: 1792.36, complianceStatus: 'excessive', complianceLimit: 12.4 },
      legalStatus: '🔴 超额',
      legalStatusColor: 'excessive',
    },
    {
      id: 'T09B',
      name: '复杂费用结构（四费齐全）',
      description: '利息+服务费+担保费+保险费的完整场景',
      category: '综合',
      type: 'fee',
      input: {
        principal: 20000,
        periods: 12,
        fees: [
          { name: '利息', amount: 66.67, chargeType: 'monthly' },
          { name: '服务费', amount: 50.00, chargeType: 'monthly' },
          { name: '担保费', amount: 33.33, chargeType: 'monthly' },
          { name: '其他费用', amount: 16.67, chargeType: 'monthly' },
        ],
      },
      expected: { irr: 17.00, apr: 9.00, totalPayment: 22000.00, totalInterest: 2000.00, complianceStatus: 'warning', complianceLimit: 12.4 },
      legalStatus: '🟡 偏高',
      legalStatusColor: 'warning',
    },
  ],
};

export interface FeeTemplate {
  name: string;
  fees: { name: string; amount: number; chargeType: 'monthly' | 'one-time' }[];
}

export const FEE_TEMPLATES: FeeTemplate[] = [
  {
    name: '砍头息型', fees: [
      { name: '利息', amount: 0, chargeType: 'monthly' },
      { name: '砍头息', amount: 0, chargeType: 'one-time' },
    ]
  },
  {
    name: '服务费型', fees: [
      { name: '利息', amount: 0, chargeType: 'monthly' },
      { name: '服务费', amount: 0, chargeType: 'monthly' },
      { name: '担保费', amount: 0, chargeType: 'monthly' },
    ]
  },
  {
    name: '保险费型', fees: [
      { name: '利息', amount: 0, chargeType: 'monthly' },
      { name: '保险费', amount: 0, chargeType: 'monthly' },
      { name: '服务费', amount: 0, chargeType: 'one-time' },
    ]
  },
  {
    name: '综合型', fees: [
      { name: '利息', amount: 0, chargeType: 'monthly' },
      { name: '服务费', amount: 0, chargeType: 'monthly' },
      { name: '保险费', amount: 0, chargeType: 'monthly' },
      { name: '担保费', amount: 0, chargeType: 'monthly' },
      { name: '其他费用', amount: 0, chargeType: 'one-time' },
    ]
  },
];

export interface CalculationTemplate {
  id: number;
  name: string;
  type: 'simple' | 'periodic' | 'fee';
  data: {
    principal: number;
    monthlyPayment?: number;
    months?: number;
    payments?: number[];
    periods?: number;
    fees?: { name: string; amount: number; chargeType: 'monthly' | 'one-time' }[];
    loanDate: string;
    paidPeriods: number;
  };
}

export const CALCULATION_TEMPLATES: CalculationTemplate[] = [
  {
    id: 1,
    name: '简易模式-等额本息',
    type: 'simple',
    data: {
      principal: 50000,
      monthlyPayment: 4387.17,
      months: 12,
      loanDate: '',
      paidPeriods: 0,
    },
  },
  {
    id: 2,
    name: '简易模式-高利率',
    type: 'simple',
    data: {
      principal: 100000,
      monthlyPayment: 5500,
      months: 24,
      loanDate: '',
      paidPeriods: 0,
    },
  },
  {
    id: 3,
    name: '简易模式-短期小额',
    type: 'simple',
    data: {
      principal: 10000,
      monthlyPayment: 900,
      months: 12,
      loanDate: '',
      paidPeriods: 0,
    },
  },
  {
    id: 4,
    name: '简易模式-3年期',
    type: 'simple',
    data: {
      principal: 150000,
      monthlyPayment: 4800,
      months: 36,
      loanDate: '',
      paidPeriods: 0,
    },
  },
  {
    id: 5,
    name: '简易模式-已还部分',
    type: 'simple',
    data: {
      principal: 80000,
      monthlyPayment: 7500,
      months: 12,
      loanDate: '',
      paidPeriods: 3,
    },
  },
  {
    id: 6,
    name: '逐期录入-6期等额',
    type: 'periodic',
    data: {
      principal: 3000,
      payments: [554.19, 554.19, 554.19, 554.19, 554.19, 554.19],
      loanDate: '',
      paidPeriods: 0,
    },
  },
  {
    id: 7,
    name: '逐期录入-12期不等额',
    type: 'periodic',
    data: {
      principal: 6000,
      payments: [1046.32, 1046.32, 1046.32, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52, 557.52],
      loanDate: '',
      paidPeriods: 0,
    },
  },
  {
    id: 8,
    name: '逐期录入-单期大额',
    type: 'periodic',
    data: {
      principal: 1400,
      payments: [2008.22],
      loanDate: '',
      paidPeriods: 0,
    },
  },
  {
    id: 9,
    name: '逐期录入-24期',
    type: 'periodic',
    data: {
      principal: 50000,
      payments: [2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500, 2500],
      loanDate: '',
      paidPeriods: 0,
    },
  },
  {
    id: 10,
    name: '费用拆分-砍头息型',
    type: 'fee',
    data: {
      principal: 34400,
      periods: 12,
      fees: [
        { name: '利息', amount: 1508.80, chargeType: 'monthly' },
        { name: '砍头息', amount: 3000, chargeType: 'one-time' },
      ],
      loanDate: '',
      paidPeriods: 0,
    },
  },
];

export const QUICK_PERIODS = [6, 12, 24, 36];

export const SUSPECTED_INTEREST_KEYWORDS = ['服务费', '担保费', '保险费', '管理费', '咨询费', '手续费', '砍头息', '前置利息', '风险金', '履约保证金'];

export const GRADIENTS = [
  ['#FF6B6B', '#FFE66D'],
  ['#4ECDC4', '#44A08D'],
  ['#667EEA', '#764BA2'],
  ['#F093FB', '#F5576C'],
  ['#43E97B', '#38F9D7'],
  ['#FA709A', '#FEE140']
];

export interface MenuItem {
  icon: string;
  title: string;
  url: string;
  action?: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { icon: '📊', title: '理财计算', url: '/pages/index' },
  { icon: '📜', title: '计算历史', url: '/pages/history' },
  { icon: '🎨', title: '主题切换', url: '', action: 'theme' },
  { icon: '📈', title: 'LPR设置', url: '/pages/settings' },
  { icon: '📋', title: '查看模板', url: '/pages/templates' },
  { icon: '👤', title: '个人中心', url: '/pages/profile' },
  { icon: '💬', title: '联系客服', url: '' },
  { icon: 'ℹ️', title: '关于我们', url: '' },
  { icon: '🔒', title: '隐私政策', url: '' },
  { icon: '📝', title: '用户协议', url: '/pages/agreement' },
];
