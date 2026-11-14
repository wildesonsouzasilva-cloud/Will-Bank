import { FamilyMember, Income, Expense, CreditCard, BudgetCategory, FinancialGoal, DebtRecord } from "./types";

export const initialFamilyMembers: FamilyMember[] = [
  { id: "m1", name: "Carlos Silva", role: "Pai / Provedor", color: "#3B82F6", avatar: "👨" },
  { id: "m2", name: "Mariana Silva", role: "Mãe / Provedora", color: "#EC4899", avatar: "👩" },
  { id: "m3", name: "Lucas Silva", role: "Filho", color: "#10B981", avatar: "👦" },
  { id: "m4", name: "Beatriz Silva", role: "Filha", color: "#F59E0B", avatar: "👧" },
];

export const initialCreditCards: CreditCard[] = [
  { id: "c1", name: "Nubank Ultravioleta", holder: "Carlos", last4: "8492", color: "#8B5CF6", limit: 15000, used: 4250, closingDay: 5, dueDay: 12 },
  { id: "c2", name: "XP Visa Infinite", holder: "Mariana", last4: "3310", color: "#1E293B", limit: 20000, used: 3120, closingDay: 15, dueDay: 22 },
  { id: "c3", name: "Inter Black", holder: "Carlos", last4: "9041", color: "#F97316", limit: 10000, used: 1200, closingDay: 28, dueDay: 5 },
];

export const initialIncomes: Income[] = [
  { id: "inc-1", description: "Salário Empresa Tech", amount: 12500, date: "2026-11-05", category: "Salário", memberId: "m1", isRecurring: true },
  { id: "inc-2", description: "Salário Consultoria", amount: 9800, date: "2026-11-05", category: "Salário", memberId: "m2", isRecurring: true },
  { id: "inc-3", description: "Dividendos FIIs", amount: 850, date: "2026-11-10", category: "Investimentos", memberId: "m1", isRecurring: true },
  { id: "inc-4", description: "Projeto Freelance Design", amount: 2200, date: "2026-11-12", category: "Freelance", memberId: "m2", isRecurring: false },
];

export const initialExpenses: Expense[] = [
  { id: "exp-1", description: "Supermercado Pão de Açúcar", amount: 1850, date: "2026-11-03", category: "Alimentação", memberId: "m2", paymentMethod: "credit_card", cardId: "c1", status: "paid" },
  { id: "exp-2", description: "Mensalidade Escolar (2 filhos)", amount: 3400, date: "2026-11-08", category: "Educação", memberId: "m1", paymentMethod: "pix", status: "paid" },
  { id: "exp-3", description: "Condomínio & IPTU", amount: 1650, date: "2026-11-10", category: "Moradia", memberId: "m1", paymentMethod: "pix", status: "paid" },
  { id: "exp-4", description: "Plano de Saúde Familiar", amount: 1980, date: "2026-11-12", category: "Saúde", memberId: "m2", paymentMethod: "pix", status: "paid" },
  { id: "exp-5", description: "Combustível Carro 1 & 2", amount: 680, date: "2026-11-14", category: "Transporte", memberId: "m1", paymentMethod: "credit_card", cardId: "c2", status: "paid" },
  { id: "exp-6", description: "Jantar Aniversário Mariana", amount: 420, date: "2026-11-15", category: "Lazer", memberId: "m1", paymentMethod: "credit_card", cardId: "c1", status: "paid" },
  { id: "exp-7", description: "Contas de Luz, Água e Internet", amount: 790, date: "2026-11-16", category: "Moradia", memberId: "m2", paymentMethod: "pix", status: "paid" },
  { id: "exp-8", description: "Curso de Robótica (Lucas)", amount: 380, date: "2026-11-18", category: "Educação", memberId: "m3", paymentMethod: "pix", status: "pending" },
  { id: "exp-9", description: "Farmácia e Vitaminas", amount: 260, date: "2026-11-19", category: "Saúde", memberId: "m2", paymentMethod: "credit_card", cardId: "c3", status: "pending" },
];

export const initialBudgetCategories: BudgetCategory[] = [
  { id: "b1", category: "Moradia", allocated: 3000, spent: 2440, color: "#3B82F6" },
  { id: "b2", category: "Alimentação", allocated: 2800, spent: 1850, color: "#10B981" },
  { id: "b3", category: "Educação", allocated: 4500, spent: 3780, color: "#8B5CF6" },
  { id: "b4", category: "Saúde", allocated: 2500, spent: 2240, color: "#EC4899" },
  { id: "b5", category: "Transporte", allocated: 1200, spent: 680, color: "#F59E0B" },
  { id: "b6", category: "Lazer", allocated: 1500, spent: 420, color: "#06B6D4" },
];

export const initialGoals: FinancialGoal[] = [
  { id: "g1", title: "Reserva de Emergência (6 meses)", targetAmount: 60000, currentAmount: 48500, deadline: "2026-12-31", category: "Segurança", color: "#10B981" },
  { id: "g2", title: "Viagem em Família (Férias 2027)", targetAmount: 25000, currentAmount: 14200, deadline: "2027-01-15", category: "Lazer", color: "#3B82F6" },
  { id: "g3", title: "Troca do Carro Familiar", targetAmount: 45000, currentAmount: 18000, deadline: "2027-06-30", category: "Bens", color: "#8B5CF6" },
];

export const initialDebts: DebtRecord[] = [
  {
    id: "debt-1",
    title: "Empréstimo Pessoal (Parcela Vencida)",
    creditor: "Banco Itaú",
    debtMode: "overdue",
    category: "Empréstimo",
    totalAmount: 2450,
    originalAmount: 2100,
    installmentAmount: 2450,
    totalInstallments: 1,
    paidInstallments: 0,
    dueDate: "2026-10-15",
    daysOverdue: 30,
    interestRate: 4.5,
    memberId: "m1",
    status: "overdue",
    notes: "Negociar quitação à vista para abatimento dos juros.",
  },
  {
    id: "debt-2",
    title: "Parcelamento Geladeira Inox",
    creditor: "Magazine Luiza",
    debtMode: "installment",
    category: "Compra Parcelada",
    totalAmount: 4200,
    installmentAmount: 350,
    totalInstallments: 12,
    paidInstallments: 4,
    dueDate: "2026-11-25",
    memberId: "m2",
    status: "active",
    notes: "Carnê digital sem juros.",
  },
];
