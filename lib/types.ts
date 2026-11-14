export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  color: string;
  avatar?: string;
  incomeShare?: number;
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  memberId: string;
  isRecurring?: boolean;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  memberId: string;
  paymentMethod: "credit_card" | "debit" | "pix" | "cash";
  cardId?: string;
  installments?: number;
  currentInstallment?: number;
  status: "paid" | "pending";
}

export interface CreditCard {
  id: string;
  name: string;
  holder: string;
  last4: string;
  color: string;
  limit: number;
  used: number;
  closingDay: number;
  dueDay: number;
}

export interface BudgetCategory {
  id: string;
  category: string;
  allocated: number;
  spent: number;
  color: string;
}

export interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category: string;
  color: string;
}

export interface InvestmentSimulation {
  initialAmount: number;
  monthlyContribution: number;
  annualRate: number;
  years: number;
}
