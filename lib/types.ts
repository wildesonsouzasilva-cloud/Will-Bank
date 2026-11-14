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

export interface DebtRecord {
  id: string;
  title: string;
  creditor: string;
  debtMode: "overdue" | "installment";
  category:
    | "Empréstimo"
    | "Fatura de Cartão Atrasada"
    | "Financiamento"
    | "Boleto / Conta Atrasada"
    | "Compra Parcelada"
    | "Acordo / Renegociação"
    | "Outro";
  totalAmount: number;
  originalAmount?: number;
  installmentAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  dueDate: string;
  daysOverdue?: number;
  interestRate?: number;
  memberId: string;
  status: "overdue" | "active" | "paid";
  notes?: string;
}
