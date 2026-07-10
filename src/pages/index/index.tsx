import { View, Text, ScrollView } from '@tarojs/components';
import { useState, useEffect, useRef } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import {
  Input,
  Button,
  Dialog,
  Radio,
  RadioGroup,
  Tabs,
  TabPane,
  Cell,
  CellGroup,
  Toast,
  Popup,
  DatePicker,
} from '@nutui/nutui-react-taro';
import {
  CalculationResult,
  CalculationParams,
  parsePastedPaymentsWithInfo,
  estimatePaymentRange,
  generateCSV,
  generateReportText,
} from '../../utils/finance';
import { calculate } from '../../services/api';
import { getLatestLPR } from '../../data/lpr';
import { getToken, getUserInfo, clearLoginInfo, saveDraft, getDraft, removeDraft, saveHistory } from '../../utils/storage';
import CustomTabBar from '../../components/CustomTabBar/custom-tab-bar';

import './index.less';

const GRADIENTS = [
  ['#FF6B6B', '#FFE66D'],
  ['#4ECDC4', '#44A08D'],
  ['#667EEA', '#764BA2'],
  ['#F093FB', '#F5576C'],
  ['#43E97B', '#38F9D7'],
  ['#FA709A', '#FEE140']
];

const getGradientByNickname = (nickname: string): string => {
  let hash = 0;
  for (let i = 0; i < nickname.length; i++) {
    hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  const colors = GRADIENTS[index];
  return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
};

const QUICK_PERIODS = [6, 12, 24, 36];

const formatAnonymizedAmount = (amount: number, anonymize: boolean): string => {
  if (!anonymize) return `¥${amount.toFixed(2)}`;
  const str = amount.toFixed(2);
  if (str.length <= 4) return '¥****';
  return `¥${str[0]}****.${str.slice(-2)}`;
};

const formatAnonymizedRate = (rate: number, anonymize: boolean): string => {
  if (!anonymize) return `${rate.toFixed(2)}%`;
  return `${rate.toFixed(1)}%`;
};

const SUSPECTED_INTEREST_KEYWORDS = ['服务费', '担保费', '保险费', '管理费', '咨询费', '手续费', '砍头息', '前置利息', '风险金', '履约保证金'];

const FEE_TEMPLATES = [
  {
    name: '砍头息型', fees: [
      { name: '利息', amount: 0, chargeType: 'monthly' as const },
      { name: '砍头息', amount: 0, chargeType: 'one-time' as const },
    ]
  },
  {
    name: '服务费型', fees: [
      { name: '利息', amount: 0, chargeType: 'monthly' as const },
      { name: '服务费', amount: 0, chargeType: 'monthly' as const },
      { name: '担保费', amount: 0, chargeType: 'monthly' as const },
    ]
  },
  {
    name: '保险费型', fees: [
      { name: '利息', amount: 0, chargeType: 'monthly' as const },
      { name: '保险费', amount: 0, chargeType: 'monthly' as const },
      { name: '服务费', amount: 0, chargeType: 'one-time' as const },
    ]
  },
  {
    name: '综合型', fees: [
      { name: '利息', amount: 0, chargeType: 'monthly' as const },
      { name: '服务费', amount: 0, chargeType: 'monthly' as const },
      { name: '保险费', amount: 0, chargeType: 'monthly' as const },
      { name: '担保费', amount: 0, chargeType: 'monthly' as const },
      { name: '其他费用', amount: 0, chargeType: 'one-time' as const },
    ]
  },
];

const CALCULATION_TEMPLATES = [
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
        { name: '利息', amount: 1508.80, chargeType: 'monthly' as const },
        { name: '砍头息', amount: 3000, chargeType: 'one-time' as const },
      ],
      loanDate: '',
      paidPeriods: 0,
    },
  },
  {
    id: 11,
    name: '费用拆分-多费用型',
    type: 'fee',
    data: {
      principal: 50000,
      periods: 12,
      fees: [
        { name: '利息', amount: 1800, chargeType: 'monthly' as const },
        { name: '服务费', amount: 500, chargeType: 'monthly' as const },
        { name: '保险费', amount: 300, chargeType: 'monthly' as const },
        { name: '担保费', amount: 400, chargeType: 'monthly' as const },
      ],
      loanDate: '',
      paidPeriods: 0,
    },
  },
  {
    id: 12,
    name: '费用拆分-一次性费用',
    type: 'fee',
    data: {
      principal: 20000,
      periods: 12,
      fees: [
        { name: '利息', amount: 1200, chargeType: 'monthly' as const },
        { name: '手续费', amount: 1000, chargeType: 'one-time' as const },
        { name: '咨询费', amount: 500, chargeType: 'one-time' as const },
      ],
      loanDate: '',
      paidPeriods: 0,
    },
  },
];

const checkSuspectedInterest = (name: string): boolean => {
  return SUSPECTED_INTEREST_KEYWORDS.some(keyword => name.includes(keyword));
};

interface FeeItem {
  name: string;
  amount: number;
  chargeType: 'monthly' | 'one-time';
  isSuspectedInterest?: boolean;
}

export default function Index() {
  const [isLogin, setIsLogin] = useState(false);
  const [userInfo, setUserInfoState] = useState<any>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [activePaymentIndex, setActivePaymentIndex] = useState(-1);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showAddFeeDialog, setShowAddFeeDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<number[]>([]);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showResultPopup, setShowResultPopup] = useState(false);
  const [calculatedResult, setCalculatedResult] = useState<CalculationResult | null>(null);
  const paymentRefs = useRef<(HTMLInputElement | null)[]>([]);
  const lpr = getLatestLPR();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [params, setParams] = useState<CalculationParams>({
    mode: 'fixed',
    principal: 0,
    loanDate: todayStr,
    paidPeriods: 0,
  });
  const [paymentRange, setPaymentRange] = useState<{ min: number; max: number; suggested: number } | null>(null);
  const [fees, setFees] = useState<FeeItem[]>([
    { name: '利息', amount: 0, chargeType: 'monthly' },
    { name: '服务费', amount: 0, chargeType: 'monthly', isSuspectedInterest: true },
    { name: '保险费', amount: 0, chargeType: 'monthly', isSuspectedInterest: true },
    { name: '其他费用', amount: 0, chargeType: 'one-time' },
  ]);
  const [showTemplatePopup, setShowTemplatePopup] = useState(false);
  const [recalcResult, setRecalcResult] = useState<CalculationResult | null>(null);
  const [anonymizeAmount, setAnonymizeAmount] = useState(false);

  const [addFeeForm, setAddFeeForm] = useState({
    name: '',
    amount: '',
    chargeType: 'monthly' as 'monthly' | 'one-time',
  });

  const [showDraftDialog, setShowDraftDialog] = useState(false);

  const checkLoginStatus = () => {
    const token = getToken();
    const info = getUserInfo();
    setIsLogin(!!token);
    setUserInfoState(info);
  };

  useEffect(() => {
    checkLoginStatus();

    const draft = getDraft();
    if (draft) {
      const now = Date.now();
      const diffHours = (now - draft.timestamp) / (1000 * 60 * 60);
      if (diffHours < 24) {
        setShowDraftDialog(true);
      } else {
        removeDraft();
      }
    }
  }, []);

  useDidShow(() => {
    try {
      const appliedTemplate = Taro.getStorageSync('appliedTemplate');
      console.log('index useDidShow appliedTemplate:', appliedTemplate);
      console.log('index useDidShow activeTab before:', activeTab);
      if (appliedTemplate) {
        console.log('index useDidShow template type:', appliedTemplate.type);
        if (appliedTemplate.type === 'simple') {
          setActiveTab(0);
          const templateParams = {
            principal: appliedTemplate.data.principal,
            fixedPayment: appliedTemplate.data.monthlyPayment,
            periods: appliedTemplate.data.months,
            loanDate: appliedTemplate.data.loanDate || todayStr,
            paidPeriods: appliedTemplate.data.paidPeriods || 0,
          };
          updateParams(templateParams);
          setTimeout(() => {
            handleCalculate();
          }, 100);
        } else if (appliedTemplate.type === 'periodic') {
          setActiveTab(1);
          const templateParams = {
            principal: appliedTemplate.data.principal,
            customPayments: appliedTemplate.data.payments,
            loanDate: appliedTemplate.data.loanDate || todayStr,
            paidPeriods: appliedTemplate.data.paidPeriods || 0,
          };
          updateParams(templateParams);
          setTimeout(() => {
            handleCalculate();
          }, 100);
        } else if (appliedTemplate.type === 'fee') {
          setActiveTab(2);
          const templateParams = {
            principal: appliedTemplate.data.principal,
            periods: appliedTemplate.data.periods,
            loanDate: appliedTemplate.data.loanDate || todayStr,
            paidPeriods: appliedTemplate.data.paidPeriods || 0,
          };
          updateParams(templateParams);
          const feesWithSuspected = appliedTemplate.data.fees.map(f => ({
            ...f,
            isSuspectedInterest: checkSuspectedInterest(f.name),
          }));
          setFees(feesWithSuspected);
          setTimeout(() => {
            handleCalculate();
          }, 100);
        }
        Taro.removeStorageSync('appliedTemplate');
      }
    } catch (e) {
      // ignore
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (params.principal > 0) {
        saveDraft(params, fees);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [params, fees]);

  useEffect(() => {
    if (params.principal > 0 && params.periods && params.periods > 0) {
      const range = estimatePaymentRange(params.principal, params.periods);
      setPaymentRange(range);
    } else {
      setPaymentRange(null);
    }
  }, [params.principal, params.periods]);

  useEffect(() => {
    if (params.mode === 'custom') {
      paymentRefs.current = paymentRefs.current.slice(0, (params.customPayments || []).length);
    }
  }, [params.customPayments, params.mode]);

  const updateParams = (updates: Partial<CalculationParams>) => {
    setParams({ ...params, ...updates });
  };

  const handleTabChange = (value: string | number) => {
    const tabIndex = typeof value === 'string' ? parseInt(value, 10) : value;
    setActiveTab(tabIndex);
    const modeMap: Record<number, 'fixed' | 'custom' | 'fee'> = {
      0: 'fixed',
      1: 'custom',
      2: 'fee',
    };
    const mode = modeMap[value];
    setParams({
      mode,
      principal: 0,
      loanDate: todayStr,
      paidPeriods: 0,
    });
    if (mode === 'custom') {
      setParams(p => ({ ...p, customPayments: new Array(12).fill(0) }));
    }
    if (mode === 'fee') {
      setFees([
        { name: '利息', amount: 0, chargeType: 'monthly' },
        { name: '服务费', amount: 0, chargeType: 'monthly', isSuspectedInterest: true },
        { name: '保险费', amount: 0, chargeType: 'monthly', isSuspectedInterest: true },
        { name: '其他费用', amount: 0, chargeType: 'one-time' },
      ]);
    }
    setRecalcResult(null);
  };

  const applyRandomTemplate = () => {
    const templates = CALCULATION_TEMPLATES.filter(t => {
      if (activeTab === 0) return t.type === 'simple';
      if (activeTab === 1) return t.type === 'periodic';
      if (activeTab === 2) return t.type === 'fee';
      return false;
    });

    if (templates.length === 0) {
      Taro.showToast({ title: '当前模式暂无模板', icon: 'none' });
      return;
    }

    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

    const modeMap: Record<number, 'fixed' | 'custom' | 'fee'> = {
      0: 'fixed',
      1: 'custom',
      2: 'fee',
    };

    const templateLoanDate = randomTemplate.data.loanDate || todayStr;
    const templatePaidPeriods = randomTemplate.data.paidPeriods || 0;

    if (activeTab === 0) {
      setParams({
        mode: 'fixed',
        principal: randomTemplate.data.principal,
        fixedPayment: randomTemplate.data.monthlyPayment,
        periods: randomTemplate.data.months,
        loanDate: templateLoanDate,
        paidPeriods: templatePaidPeriods,
      });
    } else if (activeTab === 1) {
      setParams({
        mode: 'custom',
        principal: randomTemplate.data.principal,
        customPayments: randomTemplate.data.payments,
        loanDate: templateLoanDate,
        paidPeriods: templatePaidPeriods,
      });
    } else if (activeTab === 2) {
      setParams({
        mode: 'fee',
        principal: randomTemplate.data.principal,
        periods: randomTemplate.data.periods,
        loanDate: templateLoanDate,
        paidPeriods: templatePaidPeriods,
      });
      const feesWithSuspected = randomTemplate.data.fees.map(f => ({
        ...f,
        isSuspectedInterest: checkSuspectedInterest(f.name),
      }));
      setFees(feesWithSuspected);
    }

    setRecalcResult(null);

    Taro.showToast({ title: `已填入「${randomTemplate.name}」`, icon: 'none' });
  };

  const updatePayment = (index: number, value: string) => {
    const numVal = parseFloat(value) || 0;
    const payments = [...(params.customPayments || [])];
    payments[index] = numVal;
    updateParams({ customPayments: payments });
  };

  const addPeriod = () => {
    const payments = [...(params.customPayments || [])];
    payments.push(0);
    updateParams({ customPayments: payments });
  };

  const removePeriod = (index: number) => {
    const payments = [...(params.customPayments || [])];
    if (payments.length <= 1) return;
    payments.splice(index, 1);
    updateParams({ customPayments: payments });
  };

  const handleBatchFill = (payments: number[]) => {
    updateParams({ customPayments: payments });
    setShowBatchDialog(false);
    Taro.showToast({ title: '填充完成', icon: 'none' });
  };

  const handlePaste = async () => {
    try {
      const text = await Taro.getClipboardData();
      if (!text || !text.data || text.data.trim() === '') {
        Taro.showToast({ title: '剪贴板为空', icon: 'none' });
        return;
      }
      const parsed = parsePastedPaymentsWithInfo(text.data);
      const numbers = parsed.numbers;
      if (numbers.length === 0) {
        Taro.showToast({ title: '未识别到有效数字，请检查数据格式', icon: 'none' });
        return;
      }
      const existingCount = customPayments.length;
      if (numbers.length !== existingCount) {
        setPendingPayments(numbers);
        setShowConfirmDialog(true);
      } else {
        updateParams({ customPayments: numbers });
        Taro.showToast({ title: `已粘贴 ${numbers.length} 期数据`, icon: 'none' });
      }
    } catch (error: any) {
      Taro.showToast({ title: error.message || '无法读取剪贴板，请重试', icon: 'none' });
    }
  };

  const updateFee = (index: number, field: 'name' | 'amount', value: string) => {
    const newFees = [...fees];
    if (field === 'name') {
      newFees[index].name = value;
    } else {
      newFees[index].amount = parseFloat(value) || 0;
    }
    setFees(newFees);
  };

  const addFee = () => {
    setShowAddFeeDialog(true);
  };

  const handleAddFeeConfirm = () => {
    if (!addFeeForm.name.trim()) {
      Taro.showToast({ title: '请输入费用名称', icon: 'none' });
      return;
    }
    const amount = parseFloat(addFeeForm.amount);
    if (!amount || amount <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }
    setFees([...fees, {
      name: addFeeForm.name.trim(),
      amount,
      chargeType: addFeeForm.chargeType,
      isSuspectedInterest: checkSuspectedInterest(addFeeForm.name.trim()),
    }]);
    setAddFeeForm({ name: '', amount: '', chargeType: 'monthly' });
    setShowAddFeeDialog(false);
    Taro.showToast({ title: '费用项已添加', icon: 'none' });
  };

  const applyFeeTemplate = (templateIndex: number) => {
    const template = FEE_TEMPLATES[templateIndex];
    if (template) {
      const newFees = template.fees.map(fee => ({
        ...fee,
        isSuspectedInterest: checkSuspectedInterest(fee.name),
      }));
      setFees(newFees);
      setShowTemplatePopup(false);
      Taro.showToast({ title: `已应用「${template.name}」模板`, icon: 'none' });
    }
  };

  const handleRecalcWithoutSuspected = () => {
    if (!params.principal || params.principal <= 0) return;

    const cleanFees = fees.filter(fee => !fee.isSuspectedInterest);
    const cleanTotalMonthly = cleanFees
      .filter(f => f.chargeType === 'monthly')
      .reduce((sum, f) => sum + f.amount, 0);
    const cleanTotalOneTime = cleanFees
      .filter(f => f.chargeType === 'one-time')
      .reduce((sum, f) => sum + f.amount, 0);

    const adjustedPrincipal = params.principal - cleanTotalOneTime;
    if (adjustedPrincipal <= 0) {
      Taro.showToast({ title: '本金不足，请检查输入', icon: 'none' });
      return;
    }

    if (params.mode === 'fixed' && params.fixedPayment) {
      const recalcParams: CalculationParams = {
        ...params,
        fixedPayment: params.fixedPayment - cleanTotalMonthly,
      };
      const result = calculate(recalcParams);
      if (result) {
        setRecalcResult(result);
        Taro.showToast({ title: '已重新测算（去除可疑费用）', icon: 'none' });
      }
    } else if (params.mode === 'custom' && params.customPayments) {
      const recalcParams: CalculationParams = {
        ...params,
        customPayments: params.customPayments.map(p => p - cleanTotalMonthly),
      };
      const result = calculate(recalcParams);
      if (result) {
        setRecalcResult(result);
        Taro.showToast({ title: '已重新测算（去除可疑费用）', icon: 'none' });
      }
    }
  };

  const removeFee = (index: number) => {
    if (fees.length <= 1) return;
    setFees(fees.filter((_, i) => i !== index));
  };

  const totalFees = fees.reduce((sum, fee) => {
    if (fee.chargeType === 'monthly' && params.periods) {
      return sum + fee.amount * params.periods;
    }
    return sum + fee.amount;
  }, 0);

  const canCalculate = (): boolean => {
    if (!params.principal || params.principal <= 0) return false;
    if (params.mode === 'fixed') {
      return !!(params.fixedPayment && params.fixedPayment > 0 && params.periods && params.periods >= 1);
    } else if (params.mode === 'custom') {
      const payments = params.customPayments || [];
      return payments.some(p => p > 0);
    } else if (params.mode === 'fee') {
      return totalFees > 0 && params.periods && params.periods >= 1;
    }
    return false;
  };

  const handleCalculate = async () => {
    if (!canCalculate()) return;

    setLoading(true);

    try {
      let cleanParams = { ...params };

      if (params.mode === 'fee') {
        const monthlyTotal = (params.principal + totalFees) / (params.periods || 1);
        const payments = new Array(params.periods || 1).fill(Math.round(monthlyTotal * 100) / 100);
        cleanParams.mode = 'custom';
        cleanParams.customPayments = payments;
        cleanParams.fixedPayment = undefined;
      } else if (cleanParams.mode === 'custom' && cleanParams.customPayments) {
        cleanParams.customPayments = cleanParams.customPayments.filter((p: number) => p > 0);
      }

      cleanParams.fees = fees;

      const response = await calculate(cleanParams);
      if (response && response.data) {
        setCalculatedResult(response.data);
        setShowResultPopup(true);
        saveHistory(params, fees, response.data);
        removeDraft();
      } else {
        Taro.showToast({ title: response?.message || '计算失败', icon: 'none' });
      }
    } catch (error: any) {
      Taro.showToast({ title: error.message || '计算失败', icon: 'none' });
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    Taro.navigateTo({ url: '/pages/login' });
  };

  const goToProfile = () => {
    Taro.navigateTo({ url: '/pages/profile' });
  };

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const handleConfirmReplace = () => {
    updateParams({ customPayments: pendingPayments });
    Taro.showToast({ title: `已粘贴 ${pendingPayments.length} 期数据`, icon: 'none' });
    setShowConfirmDialog(false);
  };

  const handleLogoutConfirm = () => {
    clearLoginInfo();
    setIsLogin(false);
    setUserInfoState(null);
    Taro.showToast({ title: '已退出登录', icon: 'none' });
    setShowLogoutDialog(false);
  };

  const handleCopyResult = async () => {
    if (!calculatedResult) return;
    try {
      const text = generateReportText(params, calculatedResult, fees);
      await Taro.setClipboardData({ data: text });
      Taro.showToast({ title: '报告已复制', icon: 'success' });
    } catch (error) {
      Taro.showToast({ title: '复制失败', icon: 'none' });
    }
  };

  const handleExportCSV = () => {
    if (!calculatedResult) return;
    try {
      const csv = generateCSV(params, calculatedResult, fees);
      Taro.setClipboardData({
        data: csv,
        success: () => {
          Taro.showToast({ title: 'CSV已复制到剪贴板', icon: 'success' });
        },
        fail: () => {
          Taro.showToast({ title: '导出失败', icon: 'none' });
        },
      });
    } catch (error) {
      Taro.showToast({ title: '导出失败', icon: 'none' });
    }
  };

  const customPayments = params.customPayments || [];
  const filledCount = customPayments.filter((p: number) => p > 0).length;
  const paymentsTotal = customPayments.reduce((a: number, b: number) => a + b, 0);

  return (
    <>
      <View className="page">
        <View className="header-container">
          <View className="header-content">
            <View className="brand-section">
              <Text className="brand-icon-text">测</Text>
              <View className="brand-info">
                <Text className="app-title">网贷利率测</Text>
                <Text className="app-subtitle">让借贷更透明</Text>
              </View>
            </View>
            <View className="lpr-container">
              <Text className="lpr-label">当前LPR</Text>
              <Text className="lpr-value">{lpr.value.toFixed(2)}%</Text>
              <Text className="lpr-date">{lpr.date}</Text>
            </View>
          </View>
          <View className="help-entry" onClick={() => setShowHelpDialog(true)}>
            <Text className="help-entry-icon">💡</Text>
            <Text className="help-entry-text">点击查看使用说明和模式详情</Text>
          </View>
        </View>

        <Tabs activeKey={String(activeTab)} onChange={handleTabChange}>
          <TabPane title="📝 简易模式" subTitle="一键测算 · 快速上手" />
          <TabPane title="📊 逐期录入" subTitle="逐期还款 · 精确计算" />
          <TabPane title="💰 费用拆分" subTitle="费用明细 · v2.0" />
        </Tabs>

        <View className="template-entry">
          <View className="template-fill-btn" onClick={applyRandomTemplate}>
            <Text>⚡ 一键填入</Text>
          </View>
          <View className="template-list-btn" onClick={() => Taro.navigateTo({ url: `/pages/templates?tab=${activeTab}` })}>
            <Text>📋 查看模板</Text>
          </View>
        </View>

        <View className="main-card">
          <CellGroup border={false}>
            <Cell title="借款本金" subTitle="⚠️ 本金为实际到账金额，非合同金额">
              <View className="input-row">
                <Input
                  type="digit"
                  placeholder="请输入实际到账金额"
                  value={params.principal > 0 ? params.principal.toString() : ''}
                  onChange={(value) => updateParams({ principal: parseFloat(value) || 0 })}
                  className="form-input"
                />
                <Text className="input-unit">元</Text>
              </View>
            </Cell>

            {params.mode === 'fixed' && (
              <>
                <Cell title="每期还款额" subTitle="含本息及所有费用">
                  <View className="input-row">
                    <Input
                      type="digit"
                      placeholder="请输入每期实际还款"
                      value={params.fixedPayment && params.fixedPayment > 0 ? params.fixedPayment.toString() : ''}
                      onChange={(value) => updateParams({ fixedPayment: parseFloat(value) || 0 })}
                      className="form-input"
                    />
                    <Text className="input-unit">元</Text>
                  </View>
                </Cell>

                {paymentRange && paymentRange.suggested > 0 && (
                  <View className="smart-fill-card">
                    <Text className="smart-fill-title">💡 智能估算</Text>
                    <View className="smart-fill-content">
                      <Text className="smart-fill-text">根据您输入的本金和期限，合理月供范围约为：</Text>
                      <View className="smart-fill-range">
                        <Text className="smart-fill-range-text">¥{paymentRange.min.toFixed(0)} - ¥{paymentRange.max.toFixed(0)}</Text>
                        <Button type="primary" size="small" shape="round" onClick={() => updateParams({ fixedPayment: paymentRange.suggested })}>
                          填充建议值 ¥{paymentRange.suggested.toFixed(0)}
                        </Button>
                      </View>
                    </View>
                  </View>
                )}

                <Cell title="借款期限" subTitle="单位：期（月）">
                  <View className="input-row">
                    <Input
                      type="number"
                      placeholder="请输入总期数"
                      value={params.periods && params.periods > 0 ? params.periods.toString() : ''}
                      onChange={(value) => updateParams({ periods: parseInt(value) || 0 })}
                      className="form-input"
                    />
                    <Text className="input-unit">期</Text>
                  </View>
                </Cell>

                <View className="quick-btns">
                  {QUICK_PERIODS.map((p) => (
                    <Button
                      key={p}
                      type={params.periods === p ? 'primary' : 'default'}
                      shape="round"
                      size="small"
                      onClick={() => updateParams({ periods: p })}
                    >
                      {p}期
                    </Button>
                  ))}
                </View>

                <Cell title="贷款时间" subTitle="选填，用于匹配当时利率标准">
                  <DatePicker
                    value={params.loanDate}
                    onChange={(value) => updateParams({ loanDate: value })}
                  />
                </Cell>

                <Cell title="已还月份" subTitle="选填，填0表示未还款">
                  <View className="input-row">
                    <Input
                      type="number"
                      placeholder="0"
                      value={params.paidPeriods && params.paidPeriods > 0 ? params.paidPeriods.toString() : ''}
                      onChange={(value) => updateParams({ paidPeriods: parseInt(value) || 0 })}
                      className="form-input"
                    />
                    <Text className="input-unit">月</Text>
                  </View>
                </Cell>
              </>
            )}

            {params.mode === 'custom' && (
              <View>
                <Cell title="逐期还款额列表" subTitle="请按还款顺序逐期填写">
                  <Text className="payment-stats">
                    已填 {filledCount}/{customPayments.length} 期，合计 ¥{paymentsTotal.toLocaleString()}
                  </Text>
                </Cell>

                <View className="payment-actions">
                  <Button type="default" size="small" onClick={addPeriod}>+ 添加期数</Button>
                  <Button type="default" size="small" onClick={() => setShowBatchDialog(true)}>📊 批量填充</Button>
                  <Button type="default" size="small" onClick={handlePaste}>📋 从剪贴板粘贴</Button>
                </View>

                <View className="payment-scroll">
                  {customPayments.map((payment, index) => (
                    <View key={index} className="payment-row">
                      <Text className="payment-row-label">第{index + 1}期</Text>
                      <Input
                        type="digit"
                        placeholder="0.00"
                        value={payment > 0 ? payment.toString() : ''}
                        onChange={(value) => updatePayment(index, value)}
                        className="payment-input"
                      />
                      <View className={`status-dot ${payment > 0 ? 'filled' : ''}`} />
                      {customPayments.length > 1 && (
                        <Button type="danger" size="mini" onClick={() => removePeriod(index)}>
                          ×
                        </Button>
                      )}
                    </View>
                  ))}
                </View>

                <Cell title="贷款时间" subTitle="选填，用于匹配当时利率标准">
                  <DatePicker
                    value={params.loanDate}
                    onChange={(value) => updateParams({ loanDate: value })}
                  />
                </Cell>

                <Cell title="已还月份" subTitle="选填，填0表示未还款">
                  <View className="input-row">
                    <Input
                      type="number"
                      placeholder="0"
                      value={params.paidPeriods && params.paidPeriods > 0 ? params.paidPeriods.toString() : ''}
                      onChange={(value) => updateParams({ paidPeriods: parseInt(value) || 0 })}
                      className="form-input"
                    />
                    <Text className="input-unit">月</Text>
                  </View>
                </Cell>
              </View>
            )}

            {params.mode === 'fee' && (
              <>
                <Cell title="借款期限" subTitle="单位：期（月）">
                  <View className="input-row">
                    <Input
                      type="number"
                      placeholder="请输入总期数"
                      value={params.periods && params.periods > 0 ? params.periods.toString() : ''}
                      onChange={(value) => updateParams({ periods: parseInt(value) || 0 })}
                      className="form-input"
                    />
                    <Text className="input-unit">期</Text>
                  </View>
                </Cell>

                <View className="quick-btns">
                  {QUICK_PERIODS.map((p) => (
                    <Button
                      key={p}
                      type={params.periods === p ? 'primary' : 'default'}
                      shape="round"
                      size="small"
                      onClick={() => updateParams({ periods: p })}
                    >
                      {p}期
                    </Button>
                  ))}
                </View>

                <Cell title="费用明细">
                  <View className="fee-list">
                    {fees.map((fee, index) => (
                      <View key={index} className={`fee-row ${fee.isSuspectedInterest ? 'suspected-interest' : ''}`}>
                        <View className="fee-name-input-wrapper">
                          <Input
                            type="text"
                            placeholder="费用名称"
                            value={fee.name}
                            onChange={(value) => updateFee(index, 'name', value)}
                            className="fee-name-input"
                          />
                        </View>
                        {fee.isSuspectedInterest && (
                          <Text className="fee-warning-tag">⚠️</Text>
                        )}
                        <View className="fee-amount-input-wrapper">
                          <Input
                            type="digit"
                            placeholder="0.00"
                            value={fee.amount > 0 ? fee.amount.toString() : ''}
                            onChange={(value) => updateFee(index, 'amount', value)}
                            className="fee-amount-input"
                          />
                        </View>
                        <Text className="fee-unit">元</Text>
                        <Text className="fee-charge-label">{fee.chargeType === 'monthly' ? '月' : '次'}</Text>
                        {fees.length > 1 && (
                          <Button type="danger" size="mini" onClick={() => removeFee(index)}>
                            ×
                          </Button>
                        )}
                      </View>
                    ))}
                    <View className="fee-actions">
                      <Button type="primary" size="small" onClick={addFee}>+ 添加费用项</Button>
                      <Button type="default" size="small" onClick={() => setShowTemplatePopup(true)}>📋 使用模板</Button>
                    </View>
                    <View className="fee-total-row">
                      <Text className="fee-total-label">总费用</Text>
                      <Text className="fee-total-value">¥{totalFees.toLocaleString()}</Text>
                    </View>
                  </View>
                </Cell>

                <Cell title="贷款时间" subTitle="选填，用于匹配当时利率标准">
                  <DatePicker
                    value={params.loanDate}
                    onChange={(value) => updateParams({ loanDate: value })}
                  />
                </Cell>

                <Cell title="已还月份" subTitle="选填，填0表示未还款">
                  <View className="input-row">
                    <Input
                      type="number"
                      placeholder="0"
                      value={params.paidPeriods && params.paidPeriods > 0 ? params.paidPeriods.toString() : ''}
                      onChange={(value) => updateParams({ paidPeriods: parseInt(value) || 0 })}
                      className="form-input"
                    />
                    <Text className="input-unit">月</Text>
                  </View>
                </Cell>
              </>
            )}
          </CellGroup>
        </View>

        <Button
          type="danger"
          size="large"
          disabled={!canCalculate() || loading}
          onClick={handleCalculate}
          className="calc-btn"
        >
          {loading ? '⏳ 计算中...' : '📊 开始测算'}
        </Button>
      </View>

      <CustomTabBar />

      <Popup
        visible={showBatchDialog}
        position="bottom"
        onClose={() => setShowBatchDialog(false)}
      >
        <View className="popup-content">
          <View className="popup-header">
            <Text className="popup-title">批量填充</Text>
            <Button className="popup-close" onClick={() => setShowBatchDialog(false)}>✕</Button>
          </View>
          <View className="popup-body">
            <BatchFillContent
              currentCount={customPayments.length}
              currentPayments={customPayments}
              onConfirm={handleBatchFill}
              onClose={() => setShowBatchDialog(false)}
            />
          </View>
        </View>
      </Popup>

      <Popup
        visible={showAddFeeDialog}
        position="bottom"
        onClose={() => setShowAddFeeDialog(false)}
      >
        <View className="add-fee-modal">
          <View className="add-fee-header">
            <Text className="add-fee-title">添加费用项</Text>
          </View>
          <View className="add-fee-body">
            <Input
              type="text"
              placeholder="如：服务费、管理费、保险费"
              value={addFeeForm.name}
              onChange={(value) => setAddFeeForm({ ...addFeeForm, name: value })}
              className="add-fee-input"
            />
            <View className="add-fee-amount-row">
              <Input
                type="digit"
                placeholder="请输入金额"
                value={addFeeForm.amount}
                onChange={(value) => setAddFeeForm({ ...addFeeForm, amount: value })}
                className="add-fee-input"
              />
              <Text className="add-fee-unit">元</Text>
            </View>
            <View className="add-fee-charge-options">
              <View
                className={`add-fee-option ${addFeeForm.chargeType === 'monthly' ? 'active' : ''}`}
                onClick={() => setAddFeeForm({ ...addFeeForm, chargeType: 'monthly' })}
              >
                <View className="add-fee-radio" />
                <Text className="add-fee-option-label">每月收取</Text>
              </View>
              <View
                className={`add-fee-option ${addFeeForm.chargeType === 'one-time' ? 'active' : ''}`}
                onClick={() => setAddFeeForm({ ...addFeeForm, chargeType: 'one-time' })}
              >
                <View className="add-fee-radio" />
                <Text className="add-fee-option-label">一次性</Text>
              </View>
            </View>
          </View>
          <View className="add-fee-footer">
            <Button type="default" size="large" onClick={() => setShowAddFeeDialog(false)} className="add-fee-btn-cancel">取消</Button>
            <Button type="primary" size="large" onClick={handleAddFeeConfirm} className="add-fee-btn-confirm">确认添加</Button>
          </View>
        </View>
      </Popup>

      <Popup
        visible={showResultPopup}
        position="bottom"
        onClose={() => setShowResultPopup(false)}
      >
        <View className="result-popup">
          <View className="result-popup-header">
            <Text className="result-popup-title">计算结果</Text>
            <Button className="result-popup-close" onClick={() => setShowResultPopup(false)}>✕</Button>
          </View>
          <View className="result-popup-body">
            {calculatedResult && (
              <>
                <View className={`result-status-card ${calculatedResult.complianceStatus}`}>
                  <View className="result-status-badge">
                    <Text className="result-status-icon">
                      {calculatedResult.complianceStatus === 'compliant' ? '🟢' :
                        calculatedResult.complianceStatus === 'warning' ? '🟡' : '🔴'}
                    </Text>
                    <Text className="result-status-label">
                      {calculatedResult.complianceStatus === 'compliant' ? '合规' :
                        calculatedResult.complianceStatus === 'warning' ? '偏高' : '超额'}
                    </Text>
                  </View>
                  <Text className="result-status-text">
                    {calculatedResult.complianceStatus === 'compliant' ? '该贷款利率在法定范围内' :
                      calculatedResult.complianceStatus === 'warning' ? '该贷款利率已超过法定上限，建议关注' : '该贷款利率已严重超过法定上限，可主张调整'}
                  </Text>
                </View>

                <View className="result-rate-card">
                  <Text className="result-rate-label">实际年化利率(IRR)</Text>
                  <Text className="result-rate-value" style={{ color: calculatedResult.complianceStatus === 'compliant' ? '#16A34A' : calculatedResult.complianceStatus === 'warning' ? '#D97706' : '#DC2626' }}>
                    {formatAnonymizedRate(calculatedResult.irr, anonymizeAmount)}
                  </Text>
                  <View className="result-rate-comparison">
                    <Text className="result-comparison-item">名义APR：{formatAnonymizedRate(calculatedResult.nominalAPR, anonymizeAmount)}</Text>
                    {calculatedResult.irr > calculatedResult.nominalAPR && (
                      <Text className="result-comparison-item">实际比名义高 {(calculatedResult.irr - calculatedResult.nominalAPR).toFixed(2)}%</Text>
                    )}
                  </View>
                </View>

                {calculatedResult.excessInterest > 0 && (
                  <View className="result-excess-card">
                    <Text className="result-excess-label">超额利息</Text>
                    <Text className="result-excess-value">{formatAnonymizedAmount(calculatedResult.excessInterest, anonymizeAmount)}</Text>
                    <Text className="result-excess-tip">该部分利息可能无需支付</Text>
                  </View>
                )}

                <CellGroup className="result-summary">
                  <Cell title="总还款额" extra={formatAnonymizedAmount(calculatedResult.totalPayment, anonymizeAmount)} border={false} />
                  <Cell title="总利息" extra={formatAnonymizedAmount(calculatedResult.totalInterest, anonymizeAmount)} border={false} />
                  <Cell title="法定上限(LPR×4)" extra={`${calculatedResult.complianceLimit.toFixed(2)}%`} border={false} />
                  <Cell title="使用LPR" extra={`${calculatedResult.lprUsed}% (${calculatedResult.lprDate})`} border={false} />
                </CellGroup>

                {calculatedResult.avgPayment !== undefined && (
                  <View className="result-stats-card">
                    <Text className="result-stats-title">还款统计</Text>
                    <View className="result-stats-grid">
                      <View className="result-stat-item">
                        <Text className="result-stat-label">平均月供</Text>
                        <Text className="result-stat-value">{formatAnonymizedAmount(calculatedResult.avgPayment, anonymizeAmount)}</Text>
                      </View>
                      <View className="result-stat-item">
                        <Text className="result-stat-label">最高月供</Text>
                        <Text className="result-stat-value">{formatAnonymizedAmount(calculatedResult.maxPayment || 0, anonymizeAmount)}</Text>
                      </View>
                      <View className="result-stat-item">
                        <Text className="result-stat-label">最低月供</Text>
                        <Text className="result-stat-value">{formatAnonymizedAmount(calculatedResult.minPayment || 0, anonymizeAmount)}</Text>
                      </View>
                      <View className="result-stat-item">
                        <Text className="result-stat-label">还款集中度</Text>
                        <Text className="result-stat-value">{(calculatedResult.paymentConcentration || 0).toFixed(2)}%</Text>
                      </View>
                    </View>
                  </View>
                )}

                {totalFees > 0 && fees.length > 0 && (
                  <View className="result-fee-card">
                    <Text className="result-fee-title">费用明细</Text>

                    <View className="fee-chart-section">
                      <View className="fee-chart">
                        {fees.map((fee, index) => {
                          const feeTotal = fee.chargeType === 'monthly' ? fee.amount * (params.periods || 1) : fee.amount;
                          const percent = totalFees > 0 ? (feeTotal / totalFees * 100).toFixed(1) : 0;
                          const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
                          const color = colors[index % colors.length];
                          return (
                            <View key={index} className="fee-chart-item">
                              <View className="fee-chart-bar" style={{ width: `${Math.min(parseFloat(percent), 100)}%`, backgroundColor: color }} />
                              <View className="fee-chart-label">
                                <Text className="fee-chart-name" style={{ color }}>{fee.name}</Text>
                                <Text className="fee-chart-value">¥{feeTotal.toFixed(0)} ({percent}%)</Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    <View className="result-fee-list">
                      {fees.map((fee, index) => {
                        const feeTotal = fee.chargeType === 'monthly' ? fee.amount * (params.periods || 1) : fee.amount;
                        const feePercent = totalFees > 0 ? (feeTotal / totalFees * 100).toFixed(1) : 0;
                        return (
                          <View key={index} className={`result-fee-row ${fee.isSuspectedInterest ? 'suspected-interest' : ''}`}>
                            <Text className="result-fee-name">{fee.name}</Text>
                            {fee.isSuspectedInterest && <Text className="fee-suspected-tag">⚠️</Text>}
                            <Text className="result-fee-amount">{formatAnonymizedAmount(feeTotal, anonymizeAmount)}</Text>
                            <Text className="result-fee-percent">({feePercent}%)</Text>
                          </View>
                        );
                      })}
                      <View className="result-fee-total">
                        <Text className="result-fee-name">费用合计</Text>
                        <Text className="result-fee-amount">{formatAnonymizedAmount(totalFees, anonymizeAmount)}</Text>
                      </View>
                    </View>

                    {fees.some(f => f.isSuspectedInterest) && (
                      <Button type="primary" size="small" onClick={handleRecalcWithoutSuspected} className="recalc-btn">
                        🔄 去除可疑费用重新测算
                      </Button>
                    )}
                  </View>
                )}

                <View className="result-law-card">
                  <Text className="result-law-title">⚖️ 法律依据</Text>
                  <Text className="result-law-item">• 《最高人民法院关于审理民间借贷案件适用法律若干问题的规定》第二十五条</Text>
                  <Text className="result-law-item">• 出借人请求借款人按照合同约定利率支付利息的，人民法院应予支持，但是双方约定的利率超过合同成立时一年期LPR四倍的除外</Text>
                </View>

                {calculatedResult.excessLevel !== 'none' && (
                  <View className={`result-action-card ${calculatedResult.excessLevel}`}>
                    <Text className="result-action-title">💡 行动建议</Text>
                    <Text className="result-action-suggestion">{calculatedResult.actionSuggestion}</Text>
                    <View className="result-action-list">
                      {calculatedResult.excessLevel === 'slight' && (
                        <>
                          <Text className="result-action-item">1. 仔细核对合同中的费用条款</Text>
                          <Text className="result-action-item">2. 通过客服渠道询问费用构成</Text>
                        </>
                      )}
                      {calculatedResult.excessLevel === 'moderate' && (
                        <>
                          <Text className="result-action-item">1. 收集完整的还款记录作为证据</Text>
                          <Text className="result-action-item">2. 与平台协商要求调整利率至合法范围</Text>
                          <Text className="result-action-item">3. 必要时咨询专业律师了解维权途径</Text>
                        </>
                      )}
                      {calculatedResult.excessLevel === 'severe' && (
                        <>
                          <Text className="result-action-item">1. 立即停止继续还款</Text>
                          <Text className="result-action-item">2. 收集所有相关证据（合同、还款记录等）</Text>
                          <Text className="result-action-item">3. 向12378金融监管热线投诉举报</Text>
                          <Text className="result-action-item">4. 咨询律师提起诉讼主张返还超额利息</Text>
                        </>
                      )}
                    </View>
                  </View>
                )}

                {calculatedResult.dataInsufficient && (
                  <View className="result-warning-card">
                    <Text className="result-warning-text">⚠️ 数据量不足（少于3期），计算结果仅供参考</Text>
                  </View>
                )}

                <View className="result-legal-notice">
                  <Text className="result-notice-icon">⚠️</Text>
                  <Text className="result-notice-text">本工具仅供参考，不构成法律意见。利率上限标准因地区和案件具体情况存在差异，具体以司法机关认定为准。</Text>
                </View>
              </>
            )}
          </View>
          <View className="result-popup-footer">
            <View className="result-anonymize-row">
              <Text className="result-anonymize-label">👤 隐藏金额（截图去敏）</Text>
              <Button
                type={anonymizeAmount ? 'primary' : 'default'}
                size="small"
                onClick={() => setAnonymizeAmount(!anonymizeAmount)}
                className="result-anonymize-btn"
              >
                {anonymizeAmount ? '已隐藏' : '显示'}
              </Button>
            </View>
            <View className="result-export-actions">
              <Button type="default" size="small" onClick={handleExportCSV} className="result-export-btn">导出CSV</Button>
              <Button type="default" size="small" onClick={handleCopyResult} className="result-copy-btn">复制报告</Button>
            </View>
            <Button type="primary" size="large" onClick={() => setShowResultPopup(false)} className="result-popup-btn">知道了</Button>
          </View>
        </View>
      </Popup>

      <Dialog
        visible={showDraftDialog}
        title="检测到草稿"
        confirmText="恢复"
        cancelText="清空"
        onConfirm={() => {
          const draft = getDraft();
          if (draft) {
            setParams(draft.params);
            setFees(draft.fees);
          }
          removeDraft();
          setShowDraftDialog(false);
        }}
        onCancel={() => {
          removeDraft();
          setShowDraftDialog(false);
        }}
      >
        检测到您上次未完成的计算，是否恢复？
      </Dialog>

      <Dialog
        visible={showConfirmDialog}
        title="期数不匹配"
        confirmText="替换"
        cancelText="取消"
        onConfirm={() => {
          handleConfirmReplace();
          setShowConfirmDialog(false);
        }}
        onCancel={() => setShowConfirmDialog(false)}
      >
        检测到 {pendingPayments.length} 条数据，当前有 {customPayments.length} 期。是否替换全部期数？
      </Dialog>

      <Dialog
        visible={showLogoutDialog}
        title="提示"
        confirmText="确定"
        cancelText="取消"
        onConfirm={() => {
          handleLogoutConfirm();
          setShowLogoutDialog(false);
        }}
        onCancel={() => setShowLogoutDialog(false)}
      >
        确定要退出登录吗？
      </Dialog>

      <Popup
        visible={showHelpDialog}
        position="bottom"
        onClose={() => setShowHelpDialog(false)}
        zIndex={1001}
      >
        <View className="help-popup-content">
          <View className="help-popup-header">
            <Text className="help-popup-title">💡 使用说明</Text>
            <Button className="help-popup-close" onClick={() => setShowHelpDialog(false)}>✕</Button>
          </View>
          <ScrollView scrollY className="help-popup-body">
            <View className="help-dialog-content">
              <Text className="help-section-title">📋 简易模式</Text>
              <Text className="help-section-desc">适合每月还款金额固定的贷款场景，只需输入本金、月供和期数，即可快速估算实际年化利率。</Text>
              <View className="help-features">
                <Text className="help-feature">• 一键输入本金、月供、期数</Text>
                <Text className="help-feature">• 智能估算合理月供范围</Text>
                <Text className="help-feature">• 快速判断利率是否合规</Text>
              </View>

              <Text className="help-section-divider" />

              <Text className="help-section-title">📊 逐期录入</Text>
              <Text className="help-section-desc">适合每月还款金额不同的贷款场景，支持逐期录入实际还款金额，也可通过批量填充或剪贴板粘贴快速导入数据。</Text>
              <View className="help-features">
                <Text className="help-feature">• 支持逐期录入不同还款金额</Text>
                <Text className="help-feature">• 批量填充：等差/等比数列生成</Text>
                <Text className="help-feature">• 剪贴板粘贴：智能识别多种格式</Text>
                <Text className="help-feature">• 还款统计：平均/最高/最低月供</Text>
              </View>

              <Text className="help-section-divider" />

              <Text className="help-section-title">💰 费用拆分</Text>
              <Text className="help-section-desc">适合需要详细了解各项费用构成的贷款场景，支持自定义费用名称和金额，系统自动标记可疑利息费用。</Text>
              <View className="help-features">
                <Text className="help-feature">• 自定义添加多项费用明细</Text>
                <Text className="help-feature">• 支持每月收取或一次性收取</Text>
                <Text className="help-feature">• 自动识别可疑利息费用（⚠️标记）</Text>
                <Text className="help-feature">• 费用占比可视化图表</Text>
                <Text className="help-feature">• 去除可疑费用重新测算</Text>
                <Text className="help-feature">• 内置常用费用模板快速选择</Text>
              </View>

              <Text className="help-section-divider" />

              <Text className="help-section-title">📝 通用说明</Text>
              <View className="help-features">
                <Text className="help-feature">• 本金为实际到账金额，非合同金额</Text>
                <Text className="help-feature">• 利息上限 = LPR × 4，超过部分可主张调整</Text>
                <Text className="help-feature">• 输入贷款时间可匹配当时的利率标准</Text>
                <Text className="help-feature">• 已还月份用于计算您已多支付的利息</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Popup>

      <Popup
        visible={showTemplatePopup}
        position="bottom"
        onClose={() => setShowTemplatePopup(false)}
        safeArea={true}
        style={{ height: '60%' }}
      >
        <View className="popup-header">
          <Text className="popup-title">选择费用模板</Text>
          <Button className="popup-close" onClick={() => setShowTemplatePopup(false)}>✕</Button>
        </View>
        <ScrollView scrollY className="template-scroll">
          <View className="template-list">
            {FEE_TEMPLATES.map((template, index) => (
              <View key={index} className="template-item" onClick={() => applyFeeTemplate(index)}>
                <Text className="template-name">{template.name}</Text>
                <Text className="template-desc">包含 {template.fees.length} 项费用</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </Popup>

      {recalcResult && (
        <Popup
          visible={!!recalcResult}
          position="bottom"
          onClose={() => setRecalcResult(null)}
          safeArea={true}
          style={{ height: '60%' }}
        >
          <View className="popup-header">
            <Text className="popup-title">🔄 去除可疑费用后测算</Text>
            <Button className="popup-close" onClick={() => setRecalcResult(null)}>✕</Button>
          </View>
          <ScrollView scrollY className="recalc-content">
            <View className="recalc-irr-card">
              <Text className="recalc-irr-label">去除可疑费用后的IRR</Text>
              <Text className={`recalc-irr-value ${recalcResult.irr > recalcResult.complianceLimit ? 'excess' : ''}`}>
                {recalcResult.irr.toFixed(2)}%
              </Text>
              <Text className="recalc-irr-compare">
                与原值相比下降 {((calculatedResult?.irr || 0) - recalcResult.irr).toFixed(2)}%
              </Text>
            </View>
            <View className="recalc-stats">
              <View className="recalc-stat-item">
                <Text className="recalc-stat-label">名义APR</Text>
                <Text className="recalc-stat-value">{recalcResult.nominalAPR.toFixed(2)}%</Text>
              </View>
              <View className="recalc-stat-item">
                <Text className="recalc-stat-label">合规状态</Text>
                <Text className={`recalc-stat-value ${recalcResult.complianceStatus}`}>
                  {recalcResult.complianceStatus === 'compliant' ? '合规' : recalcResult.complianceStatus === 'warning' ? '偏高' : '超额'}
                </Text>
              </View>
            </View>
            <View className="recalc-note">
              <Text className="recalc-note-text">
                💡 提示：去除可疑费用后的IRR更接近真实贷款利率，可作为与平台协商的参考依据。
              </Text>
            </View>
          </ScrollView>
        </Popup>
      )}
    </>
  );
}

function BatchFillContent({ currentCount, currentPayments, onConfirm, onClose }: {
  currentCount: number;
  currentPayments: number[];
  onConfirm: (payments: number[]) => void;
  onClose: () => void;
}) {
  const [fillMode, setFillMode] = useState<'uniform' | 'arithmetic' | 'geometric' | 'paste'>('uniform');
  const [fillScope, setFillScope] = useState<'replace' | 'fill_empty'>('replace');
  const [uniformAmount, setUniformAmount] = useState('');
  const [arithFirst, setArithFirst] = useState('');
  const [arithLast, setArithLast] = useState('');
  const [geoFirst, setGeoFirst] = useState('');
  const [geoLast, setGeoLast] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [preview, setPreview] = useState<number[]>([]);

  const applyFillScope = (newPayments: number[]): number[] => {
    if (fillScope === 'replace') return newPayments;
    const result = [...currentPayments];
    for (let i = 0; i < newPayments.length && i < result.length; i++) {
      if (result[i] <= 0 || result[i] === undefined) {
        result[i] = newPayments[i];
      }
    }
    return result;
  };

  const handleConfirm = () => {
    let payments: number[] = [];
    switch (fillMode) {
      case 'uniform': {
        const val = parseFloat(uniformAmount);
        if (!val || val <= 0) {
          Taro.showToast({ title: '请输入有效的每期金额', icon: 'none' });
          return;
        }
        const count = fillScope === 'replace' ? currentCount : currentPayments.filter(p => p <= 0).length || currentCount;
        payments = new Array(count).fill(Math.round(val * 100) / 100);
        break;
      }
      case 'arithmetic': {
        const first = parseFloat(arithFirst);
        const last = parseFloat(arithLast);
        if (!first || !last || first <= 0 || last <= 0) {
          Taro.showToast({ title: '请输入有效的首期和末期金额', icon: 'none' });
          return;
        }
        const count = fillScope === 'replace' ? currentCount : currentPayments.filter(p => p <= 0).length || currentCount;
        payments = generateArithmeticSequence(first, last, count);
        break;
      }
      case 'geometric': {
        const first = parseFloat(geoFirst);
        const last = parseFloat(geoLast);
        if (!first || !last || first <= 0 || last <= 0) {
          Taro.showToast({ title: '请输入有效的首期和末期金额', icon: 'none' });
          return;
        }
        const count = fillScope === 'replace' ? currentCount : currentPayments.filter(p => p <= 0).length || currentCount;
        payments = generateGeometricSequence(first, last, count);
        break;
      }
      case 'paste': {
        const parsed = parsePastedPaymentsWithInfo(pasteText);
        payments = parsed.numbers;
        if (payments.length === 0) {
          Taro.showToast({ title: '未识别到有效数字', icon: 'none' });
          return;
        }
        break;
      }
    }
    if (payments.length > 0) {
      onConfirm(applyFillScope(payments));
    }
  };

  const updatePreview = () => {
    let p: number[] = [];
    switch (fillMode) {
      case 'uniform': {
        const val = parseFloat(uniformAmount);
        if (val && val > 0 && currentCount > 0) {
          const count = fillScope === 'replace' ? currentCount : currentPayments.filter(p => p <= 0).length || currentCount;
          p = new Array(count).fill(Math.round(val * 100) / 100);
        }
        break;
      }
      case 'arithmetic': {
        const first = parseFloat(arithFirst);
        const last = parseFloat(arithLast);
        if (first && last && first > 0 && last > 0 && currentCount > 0) {
          const count = fillScope === 'replace' ? currentCount : currentPayments.filter(p => p <= 0).length || currentCount;
          p = generateArithmeticSequence(first, last, count);
        }
        break;
      }
      case 'geometric': {
        const first = parseFloat(geoFirst);
        const last = parseFloat(geoLast);
        if (first && last && first > 0 && last > 0 && currentCount > 0) {
          const count = fillScope === 'replace' ? currentCount : currentPayments.filter(p => p <= 0).length || currentCount;
          p = generateGeometricSequence(first, last, count);
        }
        break;
      }
      case 'paste': {
        const parsed = parsePastedPaymentsWithInfo(pasteText);
        p = parsed.numbers;
        break;
      }
    }
    setPreview(p);
  };

  return (
    <View className="batch-fill-content">
      <View className="batch-section">
        <Text className="batch-section-label">填充范围</Text>
        <View className="batch-section-options">
          <Button
            type={fillScope === 'replace' ? 'primary' : 'default'}
            size="small"
            onClick={() => { setFillScope('replace'); updatePreview(); }}
          >
            替换全部
          </Button>
          <Button
            type={fillScope === 'fill_empty' ? 'primary' : 'default'}
            size="small"
            onClick={() => { setFillScope('fill_empty'); updatePreview(); }}
          >
            仅填充空白
          </Button>
        </View>
      </View>

      <View className="batch-mode-list">
        <Cell title="统一金额" subTitle="所有期数填写相同金额" onClick={() => setFillMode('uniform')} className={fillMode === 'uniform' ? 'active' : ''} />
        {fillMode === 'uniform' && (
          <Cell title="每期金额" border={false}>
            <Input
              type="digit"
              placeholder="输入金额"
              value={uniformAmount}
              onChange={(value) => { setUniformAmount(value); updatePreview(); }}
            />
          </Cell>
        )}

        <Cell title="等差数列" subTitle="每期递增或递减相同金额" onClick={() => setFillMode('arithmetic')} className={fillMode === 'arithmetic' ? 'active' : ''} />
        {fillMode === 'arithmetic' && (
          <>
            <Cell title="首期金额" border={false}>
              <Input type="digit" placeholder="首期金额" value={arithFirst} onChange={(v) => { setArithFirst(v); updatePreview(); }} />
            </Cell>
            <Cell title="末期金额" border={false}>
              <Input type="digit" placeholder="末期金额" value={arithLast} onChange={(v) => { setArithLast(v); updatePreview(); }} />
            </Cell>
          </>
        )}

        <Cell title="等比数列" subTitle="每期按固定比例变化" onClick={() => setFillMode('geometric')} className={fillMode === 'geometric' ? 'active' : ''} />
        {fillMode === 'geometric' && (
          <>
            <Cell title="首期金额" border={false}>
              <Input type="digit" placeholder="首期金额" value={geoFirst} onChange={(v) => { setGeoFirst(v); updatePreview(); }} />
            </Cell>
            <Cell title="末期金额" border={false}>
              <Input type="digit" placeholder="末期金额" value={geoLast} onChange={(v) => { setGeoLast(v); updatePreview(); }} />
            </Cell>
          </>
        )}

        <Cell title="手动导入" subTitle="粘贴数据" onClick={() => setFillMode('paste')} className={fillMode === 'paste' ? 'active' : ''} />
        {fillMode === 'paste' && (
          <Cell title="" border={false}>
            <textarea
              className="batch-fill-textarea"
              placeholder="支持多种格式：逗号、空格、换行分隔、表格数据等"
              value={pasteText}
              onChange={(e: any) => { setPasteText(e.detail.value); updatePreview(); }}
            />
          </Cell>
        )}
      </View>

      {preview.length > 0 && (
        <Cell title={`预览（共 ${preview.length} 期，合计 ¥${preview.reduce((a, b) => a + b, 0).toLocaleString()}）`} border={false}>
          <Text className="batch-preview-content">
            {preview.slice(0, 8).map((v, i) => `第${i + 1}期: ¥${v}`).join(' | ')}
            {preview.length > 8 && ' ...'}
          </Text>
        </Cell>
      )}

      <View className="batch-modal-footer">
        <Button type="default" size="large" onClick={onClose}>取消</Button>
        <Button type="primary" size="large" onClick={handleConfirm}>
          {fillScope === 'replace' ? '确认替换' : '确认填充'}
        </Button>
      </View>
    </View>
  );
}

function generateArithmeticSequence(first: number, last: number, count: number): number[] {
  const payments: number[] = [];
  if (count === 1) {
    payments.push(Math.round(first * 100) / 100);
  } else {
    const diff = (last - first) / (count - 1);
    for (let i = 0; i < count; i++) {
      payments.push(Math.round((first + diff * i) * 100) / 100);
    }
  }
  return payments;
}

function generateGeometricSequence(first: number, last: number, count: number): number[] {
  const payments: number[] = [];
  if (count === 1) {
    payments.push(Math.round(first * 100) / 100);
  } else {
    const ratio = Math.pow(last / first, 1 / (count - 1));
    for (let i = 0; i < count; i++) {
      payments.push(Math.round((first * Math.pow(ratio, i)) * 100) / 100);
    }
  }
  return payments;
}
