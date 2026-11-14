import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  where,
  serverTimestamp,
  deleteField,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handleFirestoreError, OperationType } from "@/lib/firestore-error";
import {
  FamilyMember,
  CreditCard,
  Income,
  Expense,
  BudgetCategory,
  FinancialGoal,
  DebtRecord,
} from "@/lib/types";
import {
  initialFamilyMembers,
  initialCreditCards,
  initialIncomes,
  initialExpenses,
  initialBudgetCategories,
  initialGoals,
  initialDebts,
} from "@/lib/initial-data";

const LEGACY_LOCAL_STORAGE_KEY = "willbank_financial_state_v1";

function safeId(rawId: string, prefix: string): string {
  const cleaned = (rawId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 128);
  return cleaned.length > 0 ? cleaned : `${prefix}-${Date.now()}`;
}

function clampStr(val: string | undefined, maxLen: number, fallback = "-"): string {
  const trimmed = (val ?? "").trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

function clampNum(val: number | undefined, min = 0, max?: number): number {
  const n = typeof val === "number" && Number.isFinite(val) ? val : min;
  const floored = Math.max(min, n);
  return max !== undefined ? Math.min(max, floored) : floored;
}

function toTimestampMs(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (val && typeof val === "object" && "seconds" in val) {
    return Number((val as { seconds: number }).seconds) * 1000;
  }
  return 0;
}

function toMemberDoc(m: FamilyMember, uid: string) {
  const id = safeId(m.id, "m");
  const base: Record<string, unknown> = {
    id,
    ownerId: uid,
    name: clampStr(m.name, 80, "Membro"),
    role: clampStr(m.role, 80, "Familiar"),
    color: clampStr(m.color, 20, "#3B82F6"),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (m.avatar !== undefined && m.avatar.trim() !== "") {
    base.avatar = m.avatar.trim().slice(0, 16);
  }
  if (typeof m.incomeShare === "number" && Number.isFinite(m.incomeShare)) {
    base.incomeShare = clampNum(m.incomeShare, 0, 100);
  }
  return { id, data: base };
}

function toCardDoc(c: CreditCard, uid: string) {
  const id = safeId(c.id, "card");
  return {
    id,
    data: {
      id,
      ownerId: uid,
      name: clampStr(c.name, 80, "Cartão"),
      holder: clampStr(c.holder, 80, "Titular"),
      last4: clampStr(c.last4, 8, "0000"),
      color: clampStr(c.color, 20, "#1E293B"),
      limit: clampNum(c.limit, 0),
      used: clampNum(c.used, 0),
      closingDay: clampNum(Math.round(c.closingDay || 1), 1, 31),
      dueDay: clampNum(Math.round(c.dueDay || 10), 1, 31),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  };
}

function toIncomeDoc(i: Income, uid: string) {
  const id = safeId(i.id, "inc");
  const base: Record<string, unknown> = {
    id,
    ownerId: uid,
    description: clampStr(i.description, 160, "Receita"),
    amount: clampNum(i.amount, 0),
    date: clampStr(i.date, 20, "2026-11-01"),
    category: clampStr(i.category, 60, "Outros"),
    memberId: (i.memberId || "").slice(0, 128),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (typeof i.isRecurring === "boolean") {
    base.isRecurring = i.isRecurring;
  }
  return { id, data: base };
}

function toExpenseDoc(e: Expense, uid: string) {
  const id = safeId(e.id, "exp");
  const validMethods: Expense["paymentMethod"][] = ["credit_card", "debit", "pix", "cash"];
  const paymentMethod = validMethods.includes(e.paymentMethod) ? e.paymentMethod : "pix";
  const status: Expense["status"] = e.status === "pending" ? "pending" : "paid";

  const base: Record<string, unknown> = {
    id,
    ownerId: uid,
    description: clampStr(e.description, 160, "Despesa"),
    amount: clampNum(e.amount, 0),
    date: clampStr(e.date, 20, "2026-11-01"),
    category: clampStr(e.category, 60, "Outros"),
    memberId: (e.memberId || "").slice(0, 128),
    paymentMethod,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (e.cardId && e.cardId.trim() !== "") {
    base.cardId = e.cardId.trim().slice(0, 128);
  }
  if (typeof e.installments === "number" && e.installments >= 1) {
    base.installments = clampNum(Math.round(e.installments), 1, 120);
  }
  if (typeof e.currentInstallment === "number" && e.currentInstallment >= 1) {
    base.currentInstallment = clampNum(Math.round(e.currentInstallment), 1, 120);
  }
  return { id, data: base };
}

function toBudgetDoc(b: BudgetCategory, uid: string) {
  const id = safeId(b.id, "b");
  return {
    id,
    data: {
      id,
      ownerId: uid,
      category: clampStr(b.category, 60, "Categoria"),
      allocated: clampNum(b.allocated, 0),
      spent: clampNum(b.spent, 0),
      color: clampStr(b.color, 20, "#3B82F6"),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  };
}

function toGoalDoc(g: FinancialGoal, uid: string) {
  const id = safeId(g.id, "goal");
  return {
    id,
    data: {
      id,
      ownerId: uid,
      title: clampStr(g.title, 120, "Meta"),
      targetAmount: clampNum(g.targetAmount, 0),
      currentAmount: clampNum(g.currentAmount, 0),
      deadline: clampStr(g.deadline, 20, "2027-12-31"),
      category: clampStr(g.category, 60, "Reserva"),
      color: clampStr(g.color, 20, "#10B981"),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
  };
}

const VALID_DEBT_CATEGORIES: DebtRecord["category"][] = [
  "Empréstimo",
  "Fatura de Cartão Atrasada",
  "Financiamento",
  "Boleto / Conta Atrasada",
  "Compra Parcelada",
  "Acordo / Renegociação",
  "Outro",
];

function toDebtDoc(d: DebtRecord, uid: string) {
  const id = safeId(d.id, "debt");
  const totalInstallments = clampNum(Math.round(d.totalInstallments || 1), 1, 360);
  const paidInstallments = clampNum(Math.round(d.paidInstallments || 0), 0, totalInstallments);
  const category = VALID_DEBT_CATEGORIES.includes(d.category) ? d.category : "Outro";
  const debtMode: DebtRecord["debtMode"] = d.debtMode === "overdue" ? "overdue" : "installment";
  const status: DebtRecord["status"] =
    d.status === "paid" ? "paid" : d.status === "overdue" ? "overdue" : "active";

  const base: Record<string, unknown> = {
    id,
    ownerId: uid,
    title: clampStr(d.title, 140, "Dívida"),
    creditor: clampStr(d.creditor, 100, "Credor"),
    debtMode,
    category,
    totalAmount: clampNum(d.totalAmount, 0),
    installmentAmount: clampNum(d.installmentAmount, 0),
    totalInstallments,
    paidInstallments,
    dueDate: clampStr(d.dueDate, 20, "2026-11-30"),
    memberId: (d.memberId || "").slice(0, 128),
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (typeof d.originalAmount === "number" && Number.isFinite(d.originalAmount)) {
    base.originalAmount = clampNum(d.originalAmount, 0);
  }
  if (typeof d.daysOverdue === "number" && Number.isFinite(d.daysOverdue)) {
    base.daysOverdue = clampNum(d.daysOverdue, 0);
  }
  if (typeof d.interestRate === "number" && Number.isFinite(d.interestRate)) {
    base.interestRate = clampNum(d.interestRate, 0);
  }
  if (d.notes !== undefined && d.notes.trim() !== "") {
    base.notes = d.notes.trim().slice(0, 500);
  }
  return { id, data: base };
}

interface SeedDataset {
  month: string;
  familyMembers: FamilyMember[];
  creditCards: CreditCard[];
  incomes: Income[];
  expenses: Expense[];
  budgets: BudgetCategory[];
  goals: FinancialGoal[];
  debts: DebtRecord[];
}

function getInitialSeedDataset(): SeedDataset {
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          month: typeof parsed.month === "string" && /^\d{4}-\d{2}$/.test(parsed.month) ? parsed.month : "2026-11",
          familyMembers: Array.isArray(parsed.familyMembers) ? parsed.familyMembers : initialFamilyMembers,
          creditCards: Array.isArray(parsed.creditCards) ? parsed.creditCards : initialCreditCards,
          incomes: Array.isArray(parsed.incomes) ? parsed.incomes : initialIncomes,
          expenses: Array.isArray(parsed.expenses) ? parsed.expenses : initialExpenses,
          budgets: Array.isArray(parsed.budgets) ? parsed.budgets : initialBudgetCategories,
          goals: Array.isArray(parsed.goals) ? parsed.goals : initialGoals,
          debts: Array.isArray(parsed.debts) ? parsed.debts : initialDebts,
        };
      }
    } catch {
      // Fallback to demo seed
    }
  }
  return {
    month: "2026-11",
    familyMembers: initialFamilyMembers,
    creditCards: initialCreditCards,
    incomes: initialIncomes,
    expenses: initialExpenses,
    budgets: initialBudgetCategories,
    goals: initialGoals,
    debts: initialDebts,
  };
}

async function commitBatchedWrites(
  ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }>,
  pathContext: string
): Promise<void> {
  const CHUNK_SIZE = 400;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const chunk = ops.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    for (const item of chunk) {
      batch.set(item.ref, item.data);
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, pathContext);
    }
  }
}

export async function ensureWorkspaceInitialized(uid: string): Promise<void> {
  const userPath = `users/${uid}`;
  const userRef = doc(db, "users", uid);

  let snap;
  try {
    snap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (snap.exists() && snap.data()?.initialized === true) {
    return;
  }

  const seed = getInitialSeedDataset();

  if (!snap.exists()) {
    try {
      await setDoc(userRef, {
        ownerId: uid,
        referenceMonth: seed.month,
        initialized: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }
  }

  const ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];

  for (const m of seed.familyMembers) {
    const { id, data } = toMemberDoc(m, uid);
    ops.push({ ref: doc(db, "users", uid, "familyMembers", id), data });
  }
  for (const c of seed.creditCards) {
    const { id, data } = toCardDoc(c, uid);
    ops.push({ ref: doc(db, "users", uid, "creditCards", id), data });
  }
  for (const i of seed.incomes) {
    const { id, data } = toIncomeDoc(i, uid);
    ops.push({ ref: doc(db, "users", uid, "incomes", id), data });
  }
  for (const e of seed.expenses) {
    const { id, data } = toExpenseDoc(e, uid);
    ops.push({ ref: doc(db, "users", uid, "expenses", id), data });
  }
  for (const b of seed.budgets) {
    const { id, data } = toBudgetDoc(b, uid);
    ops.push({ ref: doc(db, "users", uid, "budgets", id), data });
  }
  for (const g of seed.goals) {
    const { id, data } = toGoalDoc(g, uid);
    ops.push({ ref: doc(db, "users", uid, "goals", id), data });
  }
  for (const d of seed.debts) {
    const { id, data } = toDebtDoc(d, uid);
    ops.push({ ref: doc(db, "users", uid, "debts", id), data });
  }

  if (ops.length > 0) {
    await commitBatchedWrites(ops, `${userPath}/seed`);
  }

  try {
    await updateDoc(userRef, {
      initialized: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }
}

export interface WorkspaceCallbacks {
  onMonth: (month: string) => void;
  onFamilyMembers: (items: FamilyMember[]) => void;
  onCreditCards: (items: CreditCard[]) => void;
  onIncomes: (items: Income[]) => void;
  onExpenses: (items: Expense[]) => void;
  onBudgets: (items: BudgetCategory[]) => void;
  onGoals: (items: FinancialGoal[]) => void;
  onDebts: (items: DebtRecord[]) => void;
  onSyncReady?: () => void;
}

export function subscribeToWorkspace(uid: string, callbacks: WorkspaceCallbacks): Unsubscribe {
  const unsubscribers: Unsubscribe[] = [];
  const userPath = `users/${uid}`;

  unsubscribers.push(
    onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.referenceMonth === "string") {
            callbacks.onMonth(data.referenceMonth);
          }
        }
        callbacks.onSyncReady?.();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, userPath);
      }
    )
  );

  const subQuery = (sub: string) =>
    query(collection(db, "users", uid, sub), where("ownerId", "==", uid));

  unsubscribers.push(
    onSnapshot(
      subQuery("familyMembers"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ data: d.data(), ts: toTimestampMs(d.data().createdAt) }))
          .sort((a, b) => a.ts - b.ts)
          .map(({ data }) => ({
            id: String(data.id),
            name: String(data.name),
            role: String(data.role),
            color: String(data.color),
            ...(data.avatar ? { avatar: String(data.avatar) } : {}),
            ...(typeof data.incomeShare === "number" ? { incomeShare: data.incomeShare } : {}),
          }));
        callbacks.onFamilyMembers(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `${userPath}/familyMembers`);
      }
    )
  );

  unsubscribers.push(
    onSnapshot(
      subQuery("creditCards"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ data: d.data(), ts: toTimestampMs(d.data().createdAt) }))
          .sort((a, b) => a.ts - b.ts)
          .map(({ data }) => ({
            id: String(data.id),
            name: String(data.name),
            holder: String(data.holder),
            last4: String(data.last4),
            color: String(data.color),
            limit: Number(data.limit),
            used: Number(data.used),
            closingDay: Number(data.closingDay),
            dueDay: Number(data.dueDay),
          }));
        callbacks.onCreditCards(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `${userPath}/creditCards`);
      }
    )
  );

  unsubscribers.push(
    onSnapshot(
      subQuery("incomes"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ data: d.data(), ts: toTimestampMs(d.data().createdAt) }))
          .sort((a, b) => b.ts - a.ts)
          .map(({ data }) => ({
            id: String(data.id),
            description: String(data.description),
            amount: Number(data.amount),
            date: String(data.date),
            category: String(data.category),
            memberId: String(data.memberId ?? ""),
            ...(typeof data.isRecurring === "boolean" ? { isRecurring: data.isRecurring } : {}),
          }));
        callbacks.onIncomes(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `${userPath}/incomes`);
      }
    )
  );

  unsubscribers.push(
    onSnapshot(
      subQuery("expenses"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ data: d.data(), ts: toTimestampMs(d.data().createdAt) }))
          .sort((a, b) => b.ts - a.ts)
          .map(({ data }) => ({
            id: String(data.id),
            description: String(data.description),
            amount: Number(data.amount),
            date: String(data.date),
            category: String(data.category),
            memberId: String(data.memberId ?? ""),
            paymentMethod: data.paymentMethod as Expense["paymentMethod"],
            ...(data.cardId ? { cardId: String(data.cardId) } : {}),
            ...(typeof data.installments === "number" ? { installments: data.installments } : {}),
            ...(typeof data.currentInstallment === "number"
              ? { currentInstallment: data.currentInstallment }
              : {}),
            status: data.status as Expense["status"],
          }));
        callbacks.onExpenses(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `${userPath}/expenses`);
      }
    )
  );

  unsubscribers.push(
    onSnapshot(
      subQuery("budgets"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ data: d.data(), ts: toTimestampMs(d.data().createdAt) }))
          .sort((a, b) => a.ts - b.ts)
          .map(({ data }) => ({
            id: String(data.id),
            category: String(data.category),
            allocated: Number(data.allocated),
            spent: Number(data.spent),
            color: String(data.color),
          }));
        callbacks.onBudgets(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `${userPath}/budgets`);
      }
    )
  );

  unsubscribers.push(
    onSnapshot(
      subQuery("goals"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ data: d.data(), ts: toTimestampMs(d.data().createdAt) }))
          .sort((a, b) => a.ts - b.ts)
          .map(({ data }) => ({
            id: String(data.id),
            title: String(data.title),
            targetAmount: Number(data.targetAmount),
            currentAmount: Number(data.currentAmount),
            deadline: String(data.deadline),
            category: String(data.category),
            color: String(data.color),
          }));
        callbacks.onGoals(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `${userPath}/goals`);
      }
    )
  );

  unsubscribers.push(
    onSnapshot(
      subQuery("debts"),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ data: d.data(), ts: toTimestampMs(d.data().createdAt) }))
          .sort((a, b) => b.ts - a.ts)
          .map(({ data }) => ({
            id: String(data.id),
            title: String(data.title),
            creditor: String(data.creditor),
            debtMode: data.debtMode as DebtRecord["debtMode"],
            category: data.category as DebtRecord["category"],
            totalAmount: Number(data.totalAmount),
            ...(typeof data.originalAmount === "number"
              ? { originalAmount: data.originalAmount }
              : {}),
            installmentAmount: Number(data.installmentAmount),
            totalInstallments: Number(data.totalInstallments),
            paidInstallments: Number(data.paidInstallments),
            dueDate: String(data.dueDate),
            ...(typeof data.daysOverdue === "number" ? { daysOverdue: data.daysOverdue } : {}),
            ...(typeof data.interestRate === "number" ? { interestRate: data.interestRate } : {}),
            memberId: String(data.memberId ?? ""),
            status: data.status as DebtRecord["status"],
            ...(typeof data.notes === "string" ? { notes: data.notes } : {}),
          }));
        callbacks.onDebts(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `${userPath}/debts`);
      }
    )
  );

  return () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
  };
}

export async function updateReferenceMonth(uid: string, referenceMonth: string): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, "users", uid), {
      referenceMonth,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addExpenseInCloud(
  uid: string,
  newExpense: Expense,
  matchingBudget?: BudgetCategory,
  matchingCard?: CreditCard
): Promise<void> {
  const { id, data } = toExpenseDoc(newExpense, uid);
  const expPath = `users/${uid}/expenses/${id}`;
  try {
    await setDoc(doc(db, "users", uid, "expenses", id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, expPath);
  }

  if (matchingBudget) {
    const budgetPath = `users/${uid}/budgets/${matchingBudget.id}`;
    try {
      await updateDoc(doc(db, "users", uid, "budgets", matchingBudget.id), {
        spent: clampNum(matchingBudget.spent + newExpense.amount, 0),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, budgetPath);
    }
  }

  if (newExpense.paymentMethod === "credit_card" && matchingCard) {
    const cardPath = `users/${uid}/creditCards/${matchingCard.id}`;
    try {
      await updateDoc(doc(db, "users", uid, "creditCards", matchingCard.id), {
        used: clampNum(matchingCard.used + newExpense.amount, 0),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, cardPath);
    }
  }
}

export async function deleteExpenseInCloud(
  uid: string,
  expense: Expense,
  matchingBudget?: BudgetCategory,
  matchingCard?: CreditCard
): Promise<void> {
  const expPath = `users/${uid}/expenses/${expense.id}`;
  try {
    await deleteDoc(doc(db, "users", uid, "expenses", expense.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, expPath);
  }

  if (matchingBudget) {
    const budgetPath = `users/${uid}/budgets/${matchingBudget.id}`;
    try {
      await updateDoc(doc(db, "users", uid, "budgets", matchingBudget.id), {
        spent: clampNum(matchingBudget.spent - expense.amount, 0),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, budgetPath);
    }
  }

  if (expense.paymentMethod === "credit_card" && matchingCard) {
    const cardPath = `users/${uid}/creditCards/${matchingCard.id}`;
    try {
      await updateDoc(doc(db, "users", uid, "creditCards", matchingCard.id), {
        used: clampNum(matchingCard.used - expense.amount, 0),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, cardPath);
    }
  }
}

export async function toggleExpenseStatusInCloud(uid: string, expense: Expense): Promise<void> {
  const nextStatus: Expense["status"] = expense.status === "paid" ? "pending" : "paid";
  const path = `users/${uid}/expenses/${expense.id}`;
  try {
    await updateDoc(doc(db, "users", uid, "expenses", expense.id), {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function payCreditCardInvoiceInCloud(
  uid: string,
  cardId: string,
  pendingCardExpenses: Expense[]
): Promise<void> {
  const cardPath = `users/${uid}/creditCards/${cardId}`;
  try {
    await updateDoc(doc(db, "users", uid, "creditCards", cardId), {
      used: 0,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, cardPath);
  }

  for (const exp of pendingCardExpenses) {
    const expPath = `users/${uid}/expenses/${exp.id}`;
    try {
      await updateDoc(doc(db, "users", uid, "expenses", exp.id), {
        status: "paid",
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, expPath);
    }
  }
}

export async function addIncomeInCloud(uid: string, newIncome: Income): Promise<void> {
  const { id, data } = toIncomeDoc(newIncome, uid);
  const path = `users/${uid}/incomes/${id}`;
  try {
    await setDoc(doc(db, "users", uid, "incomes", id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteIncomeInCloud(uid: string, incomeId: string): Promise<void> {
  const path = `users/${uid}/incomes/${incomeId}`;
  try {
    await deleteDoc(doc(db, "users", uid, "incomes", incomeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function addCardInCloud(uid: string, newCard: CreditCard): Promise<void> {
  const { id, data } = toCardDoc(newCard, uid);
  const path = `users/${uid}/creditCards/${id}`;
  try {
    await setDoc(doc(db, "users", uid, "creditCards", id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteCardInCloud(
  uid: string,
  cardId: string,
  linkedExpenses: Expense[]
): Promise<void> {
  const cardPath = `users/${uid}/creditCards/${cardId}`;
  try {
    await deleteDoc(doc(db, "users", uid, "creditCards", cardId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, cardPath);
  }

  for (const exp of linkedExpenses) {
    const expPath = `users/${uid}/expenses/${exp.id}`;
    try {
      await updateDoc(doc(db, "users", uid, "expenses", exp.id), {
        cardId: deleteField(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, expPath);
    }
  }
}

export async function syncBudgetsDiffInCloud(
  uid: string,
  prevBudgets: BudgetCategory[],
  nextBudgets: BudgetCategory[]
): Promise<void> {
  const prevMap = new Map(prevBudgets.map((b) => [b.id, b]));
  const nextMap = new Map(nextBudgets.map((b) => [b.id, b]));

  for (const prev of prevBudgets) {
    if (!nextMap.has(prev.id)) {
      const path = `users/${uid}/budgets/${prev.id}`;
      try {
        await deleteDoc(doc(db, "users", uid, "budgets", prev.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  }

  for (const next of nextBudgets) {
    const prev = prevMap.get(next.id);
    if (!prev) {
      const { id, data } = toBudgetDoc(next, uid);
      const path = `users/${uid}/budgets/${id}`;
      try {
        await setDoc(doc(db, "users", uid, "budgets", id), data);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    } else if (
      prev.allocated !== next.allocated ||
      prev.category !== next.category ||
      prev.color !== next.color ||
      prev.spent !== next.spent
    ) {
      const path = `users/${uid}/budgets/${next.id}`;
      try {
        await updateDoc(doc(db, "users", uid, "budgets", next.id), {
          category: clampStr(next.category, 60, "Categoria"),
          allocated: clampNum(next.allocated, 0),
          spent: clampNum(next.spent, 0),
          color: clampStr(next.color, 20, "#3B82F6"),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  }
}

export async function addGoalInCloud(uid: string, newGoal: FinancialGoal): Promise<void> {
  const { id, data } = toGoalDoc(newGoal, uid);
  const path = `users/${uid}/goals/${id}`;
  try {
    await setDoc(doc(db, "users", uid, "goals", id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function syncGoalsDiffInCloud(
  uid: string,
  prevGoals: FinancialGoal[],
  nextGoals: FinancialGoal[]
): Promise<void> {
  const prevMap = new Map(prevGoals.map((g) => [g.id, g]));
  const nextMap = new Map(nextGoals.map((g) => [g.id, g]));

  for (const prev of prevGoals) {
    if (!nextMap.has(prev.id)) {
      const path = `users/${uid}/goals/${prev.id}`;
      try {
        await deleteDoc(doc(db, "users", uid, "goals", prev.id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    }
  }

  for (const next of nextGoals) {
    const prev = prevMap.get(next.id);
    if (!prev) {
      await addGoalInCloud(uid, next);
    } else if (
      prev.title !== next.title ||
      prev.targetAmount !== next.targetAmount ||
      prev.currentAmount !== next.currentAmount ||
      prev.deadline !== next.deadline ||
      prev.category !== next.category ||
      prev.color !== next.color
    ) {
      const path = `users/${uid}/goals/${next.id}`;
      try {
        await updateDoc(doc(db, "users", uid, "goals", next.id), {
          title: clampStr(next.title, 120, "Meta"),
          targetAmount: clampNum(next.targetAmount, 0),
          currentAmount: clampNum(next.currentAmount, 0),
          deadline: clampStr(next.deadline, 20, "2027-12-31"),
          category: clampStr(next.category, 60, "Reserva"),
          color: clampStr(next.color, 20, "#10B981"),
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    }
  }
}

export async function addMemberInCloud(uid: string, newMember: FamilyMember): Promise<void> {
  const { id, data } = toMemberDoc(newMember, uid);
  const path = `users/${uid}/familyMembers/${id}`;
  try {
    await setDoc(doc(db, "users", uid, "familyMembers", id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteMemberInCloud(
  uid: string,
  memberId: string,
  fallbackId: string,
  affectedExpenses: Expense[],
  affectedIncomes: Income[],
  affectedDebts: DebtRecord[]
): Promise<void> {
  const memberPath = `users/${uid}/familyMembers/${memberId}`;
  try {
    await deleteDoc(doc(db, "users", uid, "familyMembers", memberId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, memberPath);
  }

  for (const exp of affectedExpenses) {
    const path = `users/${uid}/expenses/${exp.id}`;
    try {
      await updateDoc(doc(db, "users", uid, "expenses", exp.id), {
        memberId: fallbackId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  for (const inc of affectedIncomes) {
    const path = `users/${uid}/incomes/${inc.id}`;
    try {
      await updateDoc(doc(db, "users", uid, "incomes", inc.id), {
        memberId: fallbackId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  for (const debt of affectedDebts) {
    if (debt.status === "paid") continue;
    const path = `users/${uid}/debts/${debt.id}`;
    try {
      await updateDoc(doc(db, "users", uid, "debts", debt.id), {
        memberId: fallbackId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

export async function addDebtInCloud(uid: string, newDebt: DebtRecord): Promise<void> {
  const { id, data } = toDebtDoc(newDebt, uid);
  const path = `users/${uid}/debts/${id}`;
  try {
    await setDoc(doc(db, "users", uid, "debts", id), data);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function payDebtInstallmentInCloud(uid: string, debt: DebtRecord): Promise<void> {
  if (debt.status === "paid") return;
  const nextPaid = Math.min(debt.totalInstallments, debt.paidInstallments + 1);
  const nextStatus: DebtRecord["status"] = nextPaid >= debt.totalInstallments ? "paid" : debt.status;
  const path = `users/${uid}/debts/${debt.id}`;
  try {
    await updateDoc(doc(db, "users", uid, "debts", debt.id), {
      paidInstallments: nextPaid,
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function settleDebtInCloud(uid: string, debt: DebtRecord): Promise<void> {
  if (debt.status === "paid") return;
  const path = `users/${uid}/debts/${debt.id}`;
  try {
    await updateDoc(doc(db, "users", uid, "debts", debt.id), {
      paidInstallments: debt.totalInstallments,
      status: "paid",
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDebtInCloud(uid: string, debtId: string): Promise<void> {
  const path = `users/${uid}/debts/${debtId}`;
  try {
    await deleteDoc(doc(db, "users", uid, "debts", debtId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

async function deleteAllInSubcollection(uid: string, sub: string): Promise<void> {
  const path = `users/${uid}/${sub}`;
  let snap;
  try {
    snap = await getDocs(query(collection(db, "users", uid, sub), where("ownerId", "==", uid)));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }

  const docs = snap.docs;
  const CHUNK_SIZE = 400;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    for (const d of docs.slice(i, i + CHUNK_SIZE)) {
      batch.delete(d.ref);
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
}

export async function clearAllCloudData(uid: string, currentBudgets: BudgetCategory[]): Promise<void> {
  await Promise.all([
    deleteAllInSubcollection(uid, "creditCards"),
    deleteAllInSubcollection(uid, "incomes"),
    deleteAllInSubcollection(uid, "expenses"),
    deleteAllInSubcollection(uid, "goals"),
    deleteAllInSubcollection(uid, "debts"),
  ]);

  for (const b of currentBudgets) {
    const path = `users/${uid}/budgets/${b.id}`;
    try {
      await updateDoc(doc(db, "users", uid, "budgets", b.id), {
        spent: 0,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

export async function restoreDemoCloudData(uid: string): Promise<void> {
  await Promise.all([
    deleteAllInSubcollection(uid, "familyMembers"),
    deleteAllInSubcollection(uid, "creditCards"),
    deleteAllInSubcollection(uid, "incomes"),
    deleteAllInSubcollection(uid, "expenses"),
    deleteAllInSubcollection(uid, "budgets"),
    deleteAllInSubcollection(uid, "goals"),
    deleteAllInSubcollection(uid, "debts"),
  ]);

  const ops: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];
  for (const m of initialFamilyMembers) {
    const { id, data } = toMemberDoc(m, uid);
    ops.push({ ref: doc(db, "users", uid, "familyMembers", id), data });
  }
  for (const c of initialCreditCards) {
    const { id, data } = toCardDoc(c, uid);
    ops.push({ ref: doc(db, "users", uid, "creditCards", id), data });
  }
  for (const i of initialIncomes) {
    const { id, data } = toIncomeDoc(i, uid);
    ops.push({ ref: doc(db, "users", uid, "incomes", id), data });
  }
  for (const e of initialExpenses) {
    const { id, data } = toExpenseDoc(e, uid);
    ops.push({ ref: doc(db, "users", uid, "expenses", id), data });
  }
  for (const b of initialBudgetCategories) {
    const { id, data } = toBudgetDoc(b, uid);
    ops.push({ ref: doc(db, "users", uid, "budgets", id), data });
  }
  for (const g of initialGoals) {
    const { id, data } = toGoalDoc(g, uid);
    ops.push({ ref: doc(db, "users", uid, "goals", id), data });
  }
  for (const d of initialDebts) {
    const { id, data } = toDebtDoc(d, uid);
    ops.push({ ref: doc(db, "users", uid, "debts", id), data });
  }

  await commitBatchedWrites(ops, `users/${uid}/restore`);
  await updateReferenceMonth(uid, "2026-11");
}
