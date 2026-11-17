import { parseCustomDate } from './format.js';

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

/**
 * Normalize transaction quantity into positive incoming and outgoing amounts.
 */
export const getTransactionDelta = (tx) => {
  const qty = parseInt(tx?.Quantity, 10) || 0;
  const type = tx?.Type;

  if (type === 'In' || type === 'AdjustIn') {
    return qty >= 0 ? { inQty: qty, outQty: 0 } : { inQty: 0, outQty: Math.abs(qty) };
  }
  if (type === 'Out' || type === 'AdjustOut') {
    return qty >= 0 ? { inQty: 0, outQty: qty } : { inQty: Math.abs(qty), outQty: 0 };
  }
  if (type === 'Adjust') {
    return qty >= 0 ? { inQty: qty, outQty: 0 } : { inQty: 0, outQty: Math.abs(qty) };
  }
  return { inQty: 0, outQty: 0 };
};

/**
 * Compute inclusive start and end Date objects for monthly or term modes.
 * Returns null bounds for 'all' mode.
 */
export const getReportDateRange = (config) => {
  const mode = config?.mode || 'monthly';
  if (mode === 'all') {
    return { mode: 'all', startDate: null, endDate: null };
  }

  const now = new Date();
  if (mode === 'term') {
    const startMonth = Number.isInteger(config.termStartMonth) ? config.termStartMonth : 4; // May
    const startYear = Number.isInteger(config.termStartYear) ? config.termStartYear : now.getFullYear();
    const endMonth = Number.isInteger(config.termEndMonth) ? config.termEndMonth : 9; // Oct
    const endYear = Number.isInteger(config.termEndYear) ? config.termEndYear : now.getFullYear();

    const startYM = startYear * 12 + startMonth;
    const endYM = endYear * 12 + endMonth;
    const [sY, sM, eY, eM] = startYM <= endYM
      ? [startYear, startMonth, endYear, endMonth]
      : [endYear, endMonth, startYear, startMonth];

    return {
      mode: 'term',
      startDate: new Date(sY, sM, 1, 0, 0, 0, 0),
      endDate: new Date(eY, eM + 1, 0, 23, 59, 59, 999)
    };
  }

  const targetMonth = Number.isInteger(config.reportMonth) ? config.reportMonth : now.getMonth();
  const targetYear = Number.isInteger(config.reportYear) ? config.reportYear : now.getFullYear();

  return {
    mode: 'monthly',
    startDate: new Date(targetYear, targetMonth, 1, 0, 0, 0, 0),
    endDate: new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999)
  };
};

/**
 * Format the Thai header subtitle describing the report period.
 */
export const getReportPeriodTitle = (config, now = new Date()) => {
  const mode = config?.mode || 'monthly';

  if (mode === 'all') {
    const day = now.getDate();
    const month = THAI_MONTHS[now.getMonth()];
    const yearBE = now.getFullYear() + 543;
    return `ข้อมูลสะสมทั้งหมด (ถึง ณ วันที่ ${day} ${month} พ.ศ. ${yearBE})`;
  }

  if (mode === 'term') {
    const startMonth = Number.isInteger(config.termStartMonth) ? config.termStartMonth : 4;
    const startYear = Number.isInteger(config.termStartYear) ? config.termStartYear : now.getFullYear();
    const endMonth = Number.isInteger(config.termEndMonth) ? config.termEndMonth : 9;
    const endYear = Number.isInteger(config.termEndYear) ? config.termEndYear : now.getFullYear();

    const startYM = startYear * 12 + startMonth;
    const endYM = endYear * 12 + endMonth;
    const [sY, sM, eY, eM] = startYM <= endYM
      ? [startYear, startMonth, endYear, endMonth]
      : [endYear, endMonth, startYear, startMonth];

    const sMonthName = THAI_MONTHS[sM];
    const eMonthName = THAI_MONTHS[eM];
    const sYearBE = sY + 543;
    const eYearBE = eY + 543;

    let rangeText;
    if (sY === eY && sM === eM) {
      rangeText = `เดือน ${sMonthName} พ.ศ. ${sYearBE}`;
    } else if (sY === eY) {
      rangeText = `เดือน ${sMonthName} – ${eMonthName} พ.ศ. ${sYearBE}`;
    } else {
      rangeText = `เดือน ${sMonthName} พ.ศ. ${sYearBE} – ${eMonthName} พ.ศ. ${eYearBE}`;
    }

    const label = (config.termLabel || '').trim();
    if (label) {
      const prefix = label.startsWith('ประจำ') ? '' : 'ประจำ';
      return `${prefix}${label} (${rangeText})`;
    }
    return `ตั้งแต่${rangeText}`;
  }

  const m = Number.isInteger(config.reportMonth) ? config.reportMonth : now.getMonth();
  const y = Number.isInteger(config.reportYear) ? config.reportYear : now.getFullYear();
  return `ประจำเดือน ${THAI_MONTHS[m]} พ.ศ. ${y + 543}`;
};

/**
 * Calculate beginning, incoming, outgoing, and ending balances for each item.
 */
export const calculateReportData = (items = [], transactions = [], config = {}) => {
  const { mode, startDate, endDate } = getReportDateRange(config);

  const txByItem = new Map();
  transactions.forEach((tx) => {
    if (!tx?.ItemID) return;
    if (!txByItem.has(tx.ItemID)) txByItem.set(tx.ItemID, []);
    txByItem.get(tx.ItemID).push(tx);
  });

  const sortedItems = [...items].sort((a, b) => {
    const orderA = (a.Order !== undefined && a.Order !== '' && a.Order !== null) ? Number(a.Order) : 999;
    const orderB = (b.Order !== undefined && b.Order !== '' && b.Order !== null) ? Number(b.Order) : 999;
    return orderA - orderB;
  });

  return sortedItems.map((item) => {
    let currentBal = parseInt(item.Balance, 10) || 0;
    let totalIn = 0;
    let totalOut = 0;

    const itemTxs = txByItem.get(item.ID) || [];

    itemTxs.forEach((tx) => {
      const { inQty, outQty } = getTransactionDelta(tx);

      if (mode === 'all') {
        totalIn += inQty;
        totalOut += outQty;
        return;
      }

      const txDate = parseCustomDate(tx.Date);
      if (txDate > endDate) {
        currentBal = currentBal - inQty + outQty;
      } else if (txDate >= startDate && txDate <= endDate) {
        totalIn += inQty;
        totalOut += outQty;
      }
    });

    const endingBalance = Math.max(0, currentBal);
    const beginningBalance = Math.max(0, endingBalance - totalIn + totalOut);

    return {
      ...item,
      beginningBalance,
      totalIn,
      totalOut,
      endingBalance
    };
  });
};
