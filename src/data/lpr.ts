export interface LPRRecord {
  date: string;
  value: number;
}

export const LPR_HISTORY: LPRRecord[] = [
  { date: '2026-06', value: 3.10 },
  { date: '2026-05', value: 3.10 },
  { date: '2026-04', value: 3.10 },
  { date: '2026-03', value: 3.10 },
  { date: '2026-02', value: 3.10 },
  { date: '2026-01', value: 3.10 },
  { date: '2025-12', value: 3.10 },
  { date: '2025-11', value: 3.10 },
  { date: '2025-10', value: 3.10 },
  { date: '2025-09', value: 3.10 },
  { date: '2025-08', value: 3.10 },
  { date: '2025-07', value: 3.10 },
  { date: '2025-06', value: 3.10 },
  { date: '2025-05', value: 3.10 },
  { date: '2025-04', value: 3.10 },
  { date: '2025-03', value: 3.10 },
  { date: '2025-02', value: 3.10 },
  { date: '2025-01', value: 3.10 },
  { date: '2024-12', value: 3.45 },
  { date: '2024-11', value: 3.45 },
  { date: '2024-10', value: 3.45 },
  { date: '2024-09', value: 3.45 },
  { date: '2024-08', value: 3.45 },
  { date: '2024-07', value: 3.45 },
  { date: '2024-06', value: 3.45 },
  { date: '2024-05', value: 3.45 },
  { date: '2024-04', value: 3.45 },
  { date: '2024-03', value: 3.45 },
  { date: '2024-02', value: 3.45 },
  { date: '2024-01', value: 3.45 },
  { date: '2023-12', value: 3.45 },
  { date: '2023-11', value: 3.45 },
  { date: '2023-10', value: 3.45 },
  { date: '2023-09', value: 3.45 },
  { date: '2023-08', value: 3.45 },
  { date: '2023-07', value: 3.45 },
  { date: '2023-06', value: 3.55 },
  { date: '2023-05', value: 3.55 },
  { date: '2023-04', value: 3.55 },
  { date: '2023-03', value: 3.55 },
  { date: '2023-02', value: 3.55 },
  { date: '2023-01', value: 3.65 },
  { date: '2022-12', value: 3.65 },
  { date: '2022-11', value: 3.65 },
  { date: '2022-10', value: 3.65 },
  { date: '2022-09', value: 3.65 },
  { date: '2022-08', value: 3.65 },
  { date: '2022-07', value: 3.70 },
  { date: '2022-06', value: 3.70 },
  { date: '2022-05', value: 3.70 },
  { date: '2022-04', value: 3.70 },
  { date: '2022-03', value: 3.70 },
  { date: '2022-02', value: 3.70 },
  { date: '2022-01', value: 3.70 },
  { date: '2021-12', value: 3.80 },
  { date: '2021-11', value: 3.85 },
  { date: '2021-10', value: 3.85 },
  { date: '2021-09', value: 3.85 },
  { date: '2021-08', value: 3.85 },
  { date: '2021-07', value: 3.85 },
  { date: '2021-06', value: 3.85 },
  { date: '2021-05', value: 3.85 },
  { date: '2021-04', value: 3.85 },
  { date: '2021-03', value: 3.85 },
  { date: '2021-02', value: 3.85 },
  { date: '2021-01', value: 3.85 },
  { date: '2020-12', value: 3.85 },
  { date: '2020-11', value: 3.85 },
  { date: '2020-10', value: 3.85 },
  { date: '2020-09', value: 3.85 },
  { date: '2020-08', value: 3.85 },
  { date: '2020-07', value: 3.85 },
  { date: '2020-06', value: 3.85 },
  { date: '2020-05', value: 3.85 },
  { date: '2020-04', value: 3.85 },
  { date: '2020-03', value: 4.05 },
  { date: '2020-02', value: 4.05 },
  { date: '2020-01', value: 4.15 },
];

export const getLatestLPR = (): LPRRecord => {
  return LPR_HISTORY[0];
};

export const getLPRByDate = (dateStr: string): LPRRecord => {
  const targetDate = dateStr.substring(0, 7);
  const record = LPR_HISTORY.find((item) => item.date === targetDate);
  
  if (record) {
    return record;
  }
  
  const earlierRecords = LPR_HISTORY.filter((item) => item.date <= targetDate);
  if (earlierRecords.length > 0) {
    return earlierRecords[earlierRecords.length - 1];
  }
  
  return LPR_HISTORY[LPR_HISTORY.length - 1];
};

export const matchLPRByDate = (dateStr: string): { lpr: number; date: string } => {
  const record = getLPRByDate(dateStr);
  return { lpr: record.value, date: record.date };
};

export const getLegalLimit = (lprValue: number): number => {
  return lprValue * 4;
};

export type ComplianceStatus = 'compliant' | 'warning' | 'excessive';

export const checkCompliance = (irr: number, lprValue: number): ComplianceStatus => {
  const limit = getLegalLimit(lprValue);
  
  if (irr <= limit) {
    return 'compliant';
  }
  
  if (irr <= limit * 1.5) {
    return 'warning';
  }
  
  return 'excessive';
};

export const formatLPRDate = (date: string): string => {
  const [year, month] = date.split('-');
  return `${year}年${month}月`;
};