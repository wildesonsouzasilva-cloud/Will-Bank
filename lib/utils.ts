import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return "R$ 0,00";
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  const fixed = absValue.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${isNegative ? "-" : ""}R$ ${formattedInt},${decPart}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return "";
  const parts = dateString.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

const MONTH_NAMES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const MONTH_SHORT_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function addMonthsIso(isoDate: string, monthOffset: number): string {
  const parts = (isoDate || "").split("-");
  if (parts.length !== 3) return isoDate;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return isoDate;
  }

  const totalMonths = year * 12 + (month - 1) + monthOffset;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonthIndex = ((totalMonths % 12) + 12) % 12;
  const targetMonth = targetMonthIndex + 1;

  const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || targetYear % 400 === 0;
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][targetMonthIndex];
  const clampedDay = Math.min(Math.max(1, day), daysInMonth);

  const mm = String(targetMonth).padStart(2, "0");
  const dd = String(clampedDay).padStart(2, "0");
  return `${targetYear}-${mm}-${dd}`;
}

export function getYearMonthKey(isoDate: string): string {
  if (!isoDate || isoDate.length < 7) return "";
  return isoDate.slice(0, 7);
}

export function formatMonthYearPt(yearMonthOrDate: string, short = false): string {
  const ym = getYearMonthKey(yearMonthOrDate);
  const parts = ym.split("-");
  if (parts.length !== 2) return yearMonthOrDate;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return yearMonthOrDate;
  const label = short ? MONTH_SHORT_PT[monthIdx] : MONTH_NAMES_PT[monthIdx];
  return `${label}/${year}`;
}

export interface DebtScheduleItem {
  installmentNumber: number;
  dueDate: string;
  yearMonth: string;
  amount: number;
  isPaid: boolean;
  isNext: boolean;
}

export function buildDebtSchedule(debt: {
  totalInstallments: number;
  paidInstallments: number;
  dueDate: string;
  installmentAmount: number;
}): DebtScheduleItem[] {
  const total = Math.max(1, debt.totalInstallments || 1);
  const paid = Math.min(total, Math.max(0, debt.paidInstallments || 0));
  const items: DebtScheduleItem[] = [];
  for (let k = 1; k <= total; k++) {
    const offsetFromNext = k - (paid + 1);
    const itemDueDate = addMonthsIso(debt.dueDate, offsetFromNext);
    items.push({
      installmentNumber: k,
      dueDate: itemDueDate,
      yearMonth: getYearMonthKey(itemDueDate),
      amount: debt.installmentAmount,
      isPaid: k <= paid,
      isNext: k === paid + 1,
    });
  }
  return items;
}
