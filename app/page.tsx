"use client";

import React, { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { Loader2, AlertTriangle } from "lucide-react";

import Navbar from "@/components/Navbar";
import LoginScreen from "@/components/LoginScreen";
import SummaryCards from "@/components/SummaryCards";
import ChartsDashboard from "@/components/ChartsDashboard";
import ExpenseTable from "@/components/ExpenseTable";
import IncomeTable from "@/components/IncomeTable";
import BudgetMonitor from "@/components/BudgetMonitor";
import CreditCardsManager from "@/components/CreditCardsManager";
import GoalsManager from "@/components/GoalsManager";
import FamilyMembersManager from "@/components/FamilyMembersManager";
import InvestmentSimulator from "@/components/InvestmentSimulator";
import FinFamAiAssistant from "@/components/FinFamAiAssistant";
import PendingDebtsManager from "@/components/PendingDebtsManager";
import TitheConfigPanel from "@/components/TitheConfigPanel";

import { auth, googleProvider, testFirestoreConnection } from "@/lib/firebase";
import { addMonthsIso, buildDebtSchedule, getYearMonthKey } from "@/lib/utils";
import {
  ensureWorkspaceInitialized,
  subscribeToWorkspace,
  updateReferenceMonth,
  updateTitheConfigInCloud,
  addExpenseInCloud,
  addExpensesBatchInCloud,
  updateExpenseInCloud,
  deleteExpenseInCloud,
  toggleExpenseStatusInCloud,
  payCreditCardInvoiceInCloud,
  addIncomeInCloud,
  updateIncomeInCloud,
  deleteIncomeInCloud,
  toggleIncomeStatusInCloud,
  addCardInCloud,
  deleteCardInCloud,
  syncBudgetsDiffInCloud,
  addGoalInCloud,
  syncGoalsDiffInCloud,
  addMemberInCloud,
  deleteMemberInCloud,
  addDebtInCloud,
  payDebtInstallmentInCloud,
  settleDebtInCloud,
  deleteDebtInCloud,
  clearAllCloudData,
  restoreDemoCloudData,
} from "@/lib/willbank-firestore";

import {
  Expense,
  Income,
  BudgetCategory,
  CreditCard,
  FinancialGoal,
  FamilyMember,
  DebtRecord,
  TitheConfig,
} from "@/lib/types";

const DEFAULT_TITHE_CONFIG: TitheConfig = {
  enabled: true,
  percentage: 10,
  category: "Dízimo",
};

function buildTitheExpenseId(incomeId: string, yearMonth: string): string {
  const cleanedIncomeId = incomeId.replace(/[^a-zA-Z0-9_-]/g, "");
  const cleanedYm = yearMonth.replace(/[^0-9-]/g, "");
  return `tithe-${cleanedYm}-${cleanedIncomeId}`.slice(0, 128);
}

function getIncomeReceiptDateForMonth(income: Income, activeMonth: string): string {
  const incMonth = getYearMonthKey(income.date);
  if (incMonth === activeMonth) return income.date;
  if (income.isRecurring && incMonth && incMonth < activeMonth) {
    const day = (income.date || `${activeMonth}-05`).slice(8, 10) || "05";
    return `${activeMonth}-${day}`;
  }
  return income.date;
}

function formatAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || "";
  if (code === "auth/popup-closed-by-user") {
    return "A janela de login foi fechada antes de concluir. Tente novamente.";
  }
  if (code === "auth/popup-blocked") {
    return "O navegador bloqueou o pop-up de login. Permita pop-ups para este site e tente novamente.";
  }
  if (code === "auth/unauthorized-domain") {
    return "Este domínio ainda não está autorizado no Firebase Auth. Adicione o endereço do site (ex: seu-app.vercel.app) em Authentication > Settings > Authorized domains no Console do Firebase.";
  }
  if (code === "auth/network-request-failed") {
    return "Falha de conexão com a internet ao tentar entrar com Google.";
  }
  return err instanceof Error ? err.message : "Não foi possível entrar com sua conta Google.";
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [month, setMonth] = useState("2026-11");
  const [confirmAction, setConfirmAction] = useState<"clear" | "restore" | null>(null);

  // Cloud-synced App State
  const [titheConfig, setTitheConfig] = useState<TitheConfig>(DEFAULT_TITHE_CONFIG);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);

  useEffect(() => {
    testFirestoreConnection();
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      if (!firebaseUser) {
        setTitheConfig(DEFAULT_TITHE_CONFIG);
        setFamilyMembers([]);
        setCreditCards([]);
        setIncomes([]);
        setExpenses([]);
        setBudgets([]);
        setGoals([]);
        setDebts([]);
        setIsLoadingWorkspace(false);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    let cancelled = false;
    let unsubscribeData: (() => void) | null = null;
    const uid = user.uid;

    const initAndSubscribe = async () => {
      setIsLoadingWorkspace(true);
      setSyncError(null);
      try {
        await ensureWorkspaceInitialized(uid);
        if (cancelled) return;

        unsubscribeData = subscribeToWorkspace(uid, {
          onMonth: setMonth,
          onTitheConfig: setTitheConfig,
          onFamilyMembers: setFamilyMembers,
          onCreditCards: setCreditCards,
          onIncomes: setIncomes,
          onExpenses: setExpenses,
          onBudgets: setBudgets,
          onGoals: setGoals,
          onDebts: setDebts,
          onSyncReady: () => {
            if (!cancelled) setIsLoadingWorkspace(false);
          },
        });
      } catch (err) {
        if (!cancelled) {
          console.error("Erro ao sincronizar workspace Firebase:", err);
          setSyncError(
            "Não foi possível carregar seus dados do Firebase. Verifique sua conexão ou permissões."
          );
          setIsLoadingWorkspace(false);
        }
      }
    };

    initAndSubscribe();

    return () => {
      cancelled = true;
      if (unsubscribeData) {
        unsubscribeData();
      }
    };
  }, [isAuthReady, user]);

  const handleSignIn = useCallback(async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(formatAuthErrorMessage(err));
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setConfirmAction(null);
    setSyncError(null);
    await signOut(auth);
  }, []);

  const runCloudAction = async (fn: () => Promise<void>) => {
    try {
      setSyncError(null);
      await fn();
    } catch (err) {
      console.error("Erro na operação em nuvem:", err);
      setSyncError("Erro ao salvar alteração no Firebase. Tente novamente.");
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Verificando sessão WillBank...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onSignIn={handleSignIn}
        isSigningIn={isSigningIn}
        errorMessage={authError}
      />
    );
  }

  if (isLoadingWorkspace) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-medium">Sincronizando suas finanças na nuvem...</p>
      </div>
    );
  }

  // Month-aware calculations (filters dynamically when user switches reference month/year)
  const monthExpenses = expenses.filter((e) => getYearMonthKey(e.date) === month);

  const monthDebtOutflows: Expense[] = [];
  for (const d of debts) {
    if (d.debtMode === "installment") {
      const schedule = buildDebtSchedule(d);
      for (const item of schedule) {
        if (item.yearMonth === month) {
          monthDebtOutflows.push({
            id: `debt-outflow-${d.id}-${item.installmentNumber}`,
            description: `${d.title} (Parcela ${item.installmentNumber}/${d.totalInstallments})`,
            amount: item.amount,
            date: item.dueDate,
            category: d.category,
            memberId: d.memberId,
            paymentMethod: "debit",
            installments: d.totalInstallments,
            currentInstallment: item.installmentNumber,
            status: item.isPaid ? "paid" : "pending",
          });
        }
      }
    } else if (d.debtMode === "overdue") {
      const ym = getYearMonthKey(d.dueDate);
      const matchesMonth = d.status !== "paid" ? !ym || ym <= month : ym === month;
      if (matchesMonth) {
        monthDebtOutflows.push({
          id: `debt-overdue-${d.id}`,
          description: `${d.title} (Em atraso)`,
          amount: d.totalAmount,
          date: d.dueDate,
          category: d.category,
          memberId: d.memberId,
          paymentMethod: "debit",
          status: d.status === "paid" ? "paid" : "pending",
        });
      }
    }
  }

  const monthAllOutflows = [...monthExpenses, ...monthDebtOutflows];

  const monthIncomes = incomes.filter((i) => {
    const incMonth = getYearMonthKey(i.date);
    if (incMonth === month) return true;
    return Boolean(i.isRecurring && incMonth && incMonth <= month);
  });
  const monthBudgets = budgets.map((b) => ({
    ...b,
    spent: monthAllOutflows
      .filter((e) => e.category.toLowerCase() === b.category.toLowerCase())
      .reduce((acc, e) => acc + e.amount, 0),
  }));

  const receivedIncome = monthIncomes
    .filter((i) => i.status !== "pending")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const pendingIncome = monthIncomes
    .filter((i) => i.status === "pending")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalIncome = receivedIncome + pendingIncome;
  const totalExpense = monthAllOutflows.reduce((acc, curr) => acc + curr.amount, 0);
  const installmentExpenseTotal = monthAllOutflows
    .filter((e) => Boolean(e.installments && e.installments > 1))
    .reduce((acc, curr) => acc + curr.amount, 0);
  const titheExpenseTotal = monthExpenses
    .filter(
      (e) =>
        Boolean(e.sourceIncomeId) ||
        (titheConfig.category &&
          e.category.toLowerCase() === titheConfig.category.toLowerCase() &&
          e.description.toLowerCase().startsWith("dízimo"))
    )
    .reduce((acc, curr) => acc + curr.amount, 0);
  const monthPaidOutflowsAmount = monthAllOutflows
    .filter((e) => e.status === "paid")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const monthPendingOutflowsAmount = monthAllOutflows
    .filter((e) => e.status === "pending")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const creditCardMonthTotal = monthAllOutflows
    .filter((e) => e.paymentMethod === "credit_card")
    .reduce((acc, curr) => acc + curr.amount, 0);
  const totalCardsLimit = creditCards.reduce((acc, curr) => acc + curr.limit, 0);
  const balance = totalIncome - totalExpense;
  const cashBalance = receivedIncome - monthPaidOutflowsAmount;

  const availableCategoriesForTithe = Array.from(
    new Set([
      "Dízimo",
      ...budgets.map((b) => b.category),
      "Moradia",
      "Alimentação",
      "Educação",
      "Saúde",
      "Transporte",
      "Lazer",
      "Outros",
    ])
  );

  const pendingTitheSyncCount =
    titheConfig.enabled && titheConfig.percentage > 0
      ? monthIncomes.filter((inc) => {
          if (inc.status === "pending" || inc.amount <= 0) return false;
          const targetDate = getIncomeReceiptDateForMonth(inc, month);
          const targetYm = getYearMonthKey(targetDate) || month;
          const existing = monthExpenses.find(
            (e) =>
              e.sourceIncomeId === inc.id ||
              e.id === buildTitheExpenseId(inc.id, targetYm)
          );
          const expectedAmt = Number(((inc.amount * titheConfig.percentage) / 100).toFixed(2));
          if (expectedAmt <= 0) return false;
          if (!existing) return true;
          return (
            Math.abs(existing.amount - expectedAmt) > 0.01 ||
            existing.category !== titheConfig.category
          );
        }).length
      : 0;

  // Débitos a Pagar & Endividamentos no Mês de Referência
  const pendingExpenses = monthExpenses.filter((e) => e.status === "pending");
  const pendingExpensesAmount = pendingExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const creditCardsUsedAmount = creditCards.reduce((acc, curr) => acc + curr.used, 0);
  const activeOverdueDebts = debts.filter((d) => {
    if (d.debtMode !== "overdue" || d.status === "paid") return false;
    const ym = getYearMonthKey(d.dueDate);
    return !ym || ym <= month;
  });
  const activeOverdueAmount = activeOverdueDebts.reduce((acc, d) => acc + d.totalAmount, 0);

  let monthInstallmentsDueAmount = 0;
  let monthInstallmentsDueCount = 0;
  for (const d of debts) {
    if (d.debtMode !== "installment" || d.status === "paid") continue;
    for (let k = d.paidInstallments + 1; k <= d.totalInstallments; k++) {
      const offset = k - (d.paidInstallments + 1);
      if (getYearMonthKey(addMonthsIso(d.dueDate, offset)) === month) {
        monthInstallmentsDueAmount += d.installmentAmount;
        monthInstallmentsDueCount += 1;
        break;
      }
    }
  }

  const totalPendingDebts =
    pendingExpensesAmount +
    creditCardsUsedAmount +
    activeOverdueAmount +
    monthInstallmentsDueAmount;
  const pendingDebtsCount =
    pendingExpenses.length +
    creditCards.filter((c) => c.used > 0).length +
    activeOverdueDebts.length +
    monthInstallmentsDueCount;

  const budgetAlertsCount = monthBudgets.filter(
    (b) => b.allocated > 0 && (b.spent / b.allocated) * 100 > 80
  ).length;

  // Handlers
  const handleMonthChange = (nextMonth: string) => {
    setMonth(nextMonth);
    void runCloudAction(() => updateReferenceMonth(user.uid, nextMonth));
  };

  const handleAddExpense = (newExpense: Expense) => {
    const matchingBudget = budgets.find(
      (b) => b.category.toLowerCase() === newExpense.category.toLowerCase()
    );
    const matchingCard =
      newExpense.paymentMethod === "credit_card" && newExpense.cardId
        ? creditCards.find((c) => c.id === newExpense.cardId)
        : undefined;

    setExpenses((prev) => [newExpense, ...prev]);
    if (matchingBudget) {
      setBudgets((prev) =>
        prev.map((b) =>
          b.id === matchingBudget.id ? { ...b, spent: b.spent + newExpense.amount } : b
        )
      );
    }
    if (matchingCard) {
      setCreditCards((prev) =>
        prev.map((c) =>
          c.id === matchingCard.id ? { ...c, used: c.used + newExpense.amount } : c
        )
      );
    }

    void runCloudAction(() =>
      addExpenseInCloud(user.uid, newExpense, matchingBudget, matchingCard)
    );
  };

  const handleAddExpensesBatch = (newExpenses: Expense[]) => {
    if (newExpenses.length === 0) return;
    const first = newExpenses[0];
    const totalAmount = newExpenses.reduce((acc, item) => acc + item.amount, 0);

    const matchingBudget = budgets.find(
      (b) => b.category.toLowerCase() === first.category.toLowerCase()
    );
    const matchingCard =
      first.paymentMethod === "credit_card" && first.cardId
        ? creditCards.find((c) => c.id === first.cardId)
        : undefined;

    setExpenses((prev) => [...newExpenses, ...prev]);
    if (matchingBudget) {
      setBudgets((prev) =>
        prev.map((b) =>
          b.id === matchingBudget.id ? { ...b, spent: b.spent + totalAmount } : b
        )
      );
    }
    if (matchingCard) {
      setCreditCards((prev) =>
        prev.map((c) =>
          c.id === matchingCard.id ? { ...c, used: c.used + totalAmount } : c
        )
      );
    }

    void runCloudAction(() =>
      addExpensesBatchInCloud(user.uid, newExpenses, matchingBudget, matchingCard)
    );
  };

  const handleDeleteExpense = (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;

    const matchingBudget = budgets.find(
      (b) => b.category.toLowerCase() === exp.category.toLowerCase()
    );
    const matchingCard =
      exp.paymentMethod === "credit_card" && exp.cardId
        ? creditCards.find((c) => c.id === exp.cardId)
        : undefined;

    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (matchingBudget) {
      setBudgets((prev) =>
        prev.map((b) =>
          b.id === matchingBudget.id ? { ...b, spent: Math.max(0, b.spent - exp.amount) } : b
        )
      );
    }
    if (matchingCard) {
      setCreditCards((prev) =>
        prev.map((c) =>
          c.id === matchingCard.id ? { ...c, used: Math.max(0, c.used - exp.amount) } : c
        )
      );
    }

    void runCloudAction(() => deleteExpenseInCloud(user.uid, exp, matchingBudget, matchingCard));
  };

  const handleEditExpense = (prevExpense: Expense, nextExpense: Expense) => {
    const prevBudget = budgets.find(
      (b) => b.category.toLowerCase() === prevExpense.category.toLowerCase()
    );
    const nextBudget = budgets.find(
      (b) => b.category.toLowerCase() === nextExpense.category.toLowerCase()
    );
    const prevCard =
      prevExpense.paymentMethod === "credit_card" && prevExpense.cardId
        ? creditCards.find((c) => c.id === prevExpense.cardId)
        : undefined;
    const nextCard =
      nextExpense.paymentMethod === "credit_card" && nextExpense.cardId
        ? creditCards.find((c) => c.id === nextExpense.cardId)
        : undefined;

    setExpenses((prev) => prev.map((e) => (e.id === nextExpense.id ? nextExpense : e)));

    if (prevBudget || nextBudget) {
      setBudgets((prev) =>
        prev.map((b) => {
          let spent = b.spent;
          if (prevBudget && b.id === prevBudget.id) spent -= prevExpense.amount;
          if (nextBudget && b.id === nextBudget.id) spent += nextExpense.amount;
          return { ...b, spent: Math.max(0, spent) };
        })
      );
    }

    const oldCardContrib = prevExpense.paymentMethod === "credit_card" ? prevExpense.amount : 0;
    const newCardContrib = nextExpense.paymentMethod === "credit_card" ? nextExpense.amount : 0;
    if (prevCard || nextCard) {
      setCreditCards((prev) =>
        prev.map((c) => {
          let used = c.used;
          if (prevCard && c.id === prevCard.id) used -= oldCardContrib;
          if (nextCard && c.id === nextCard.id) used += newCardContrib;
          return { ...c, used: Math.max(0, used) };
        })
      );
    }

    void runCloudAction(() =>
      updateExpenseInCloud(
        user.uid,
        prevExpense,
        nextExpense,
        prevBudget,
        nextBudget,
        prevCard,
        nextCard
      )
    );
  };

  const handleToggleExpenseStatus = (id: string) => {
    const target = expenses.find((e) => e.id === id);
    if (!target) return;

    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: e.status === "paid" ? "pending" : "paid" } : e
      )
    );
    void runCloudAction(() => toggleExpenseStatusInCloud(user.uid, target));
  };

  const handlePayCreditCardInvoice = (cardId: string) => {
    const pendingCardExpenses = expenses.filter(
      (e) => e.paymentMethod === "credit_card" && e.cardId === cardId && e.status !== "paid"
    );

    setCreditCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, used: 0 } : c))
    );
    setExpenses((prev) =>
      prev.map((e) =>
        e.paymentMethod === "credit_card" && e.cardId === cardId ? { ...e, status: "paid" } : e
      )
    );

    void runCloudAction(() =>
      payCreditCardInvoiceInCloud(user.uid, cardId, pendingCardExpenses)
    );
  };

  const syncTitheForIncome = (income: Income, nextStatus: "received" | "pending") => {
    const targetDate = getIncomeReceiptDateForMonth(income, month);
    const targetYm = getYearMonthKey(targetDate) || month;
    const titheId = buildTitheExpenseId(income.id, targetYm);
    const existingTithe = expenses.find(
      (e) =>
        e.id === titheId ||
        (e.sourceIncomeId === income.id &&
          (!income.isRecurring || getYearMonthKey(e.date) === targetYm))
    );

    const shouldHaveTithe =
      titheConfig.enabled &&
      titheConfig.percentage > 0 &&
      nextStatus === "received" &&
      income.amount > 0;

    if (shouldHaveTithe) {
      const titheAmount = Number(((income.amount * titheConfig.percentage) / 100).toFixed(2));
      if (titheAmount <= 0) {
        if (existingTithe) handleDeleteExpense(existingTithe.id);
        return;
      }
      const titheDescription = `Dízimo (${titheConfig.percentage}%) - ${income.description}`.slice(
        0,
        160
      );
      if (existingTithe) {
        const updatedTithe: Expense = {
          ...existingTithe,
          description: titheDescription,
          amount: titheAmount,
          date: targetDate,
          category: titheConfig.category,
          memberId: income.memberId,
          paymentMethod: "pix",
          status: "paid",
          sourceIncomeId: income.id,
        };
        handleEditExpense(existingTithe, updatedTithe);
      } else {
        const newTithe: Expense = {
          id: titheId,
          description: titheDescription,
          amount: titheAmount,
          date: targetDate,
          category: titheConfig.category,
          memberId: income.memberId,
          paymentMethod: "pix",
          status: "paid",
          sourceIncomeId: income.id,
        };
        handleAddExpense(newTithe);
      }
    } else if (existingTithe) {
      handleDeleteExpense(existingTithe.id);
    }
  };

  const handleSaveTitheConfig = (nextConfig: TitheConfig) => {
    setTitheConfig(nextConfig);
    void runCloudAction(() => updateTitheConfigInCloud(user.uid, nextConfig));
  };

  const handleSyncMonthTithes = () => {
    if (!titheConfig.enabled || titheConfig.percentage <= 0) return;

    const toCreate: Expense[] = [];
    const toUpdate: Array<{ prev: Expense; next: Expense }> = [];

    for (const inc of monthIncomes) {
      if (inc.status === "pending" || inc.amount <= 0) continue;
      const targetDate = getIncomeReceiptDateForMonth(inc, month);
      const targetYm = getYearMonthKey(targetDate) || month;
      const titheId = buildTitheExpenseId(inc.id, targetYm);
      const existing = expenses.find(
        (e) =>
          e.id === titheId ||
          (e.sourceIncomeId === inc.id && getYearMonthKey(e.date) === targetYm)
      );
      const titheAmount = Number(((inc.amount * titheConfig.percentage) / 100).toFixed(2));
      if (titheAmount <= 0) continue;
      const titheDescription = `Dízimo (${titheConfig.percentage}%) - ${inc.description}`.slice(
        0,
        160
      );

      if (!existing) {
        toCreate.push({
          id: titheId,
          description: titheDescription,
          amount: titheAmount,
          date: targetDate,
          category: titheConfig.category,
          memberId: inc.memberId,
          paymentMethod: "pix",
          status: "paid",
          sourceIncomeId: inc.id,
        });
      } else if (
        Math.abs(existing.amount - titheAmount) > 0.01 ||
        existing.category !== titheConfig.category ||
        existing.description !== titheDescription
      ) {
        toUpdate.push({
          prev: existing,
          next: {
            ...existing,
            description: titheDescription,
            amount: titheAmount,
            date: targetDate,
            category: titheConfig.category,
            memberId: inc.memberId,
            paymentMethod: "pix",
            status: "paid",
            sourceIncomeId: inc.id,
          },
        });
      }
    }

    if (toCreate.length > 0) {
      handleAddExpensesBatch(toCreate);
    }

    if (toUpdate.length > 0) {
      const updateMap = new Map(toUpdate.map((u) => [u.next.id, u.next]));
      setExpenses((prev) => prev.map((e) => updateMap.get(e.id) || e));
      const budgetTracker = new Map(budgets.map((b) => [b.id, { ...b }]));

      void runCloudAction(async () => {
        for (const item of toUpdate) {
          const prevBudgetMatch = Array.from(budgetTracker.values()).find(
            (b) => b.category.toLowerCase() === item.prev.category.toLowerCase()
          );
          const nextBudgetMatch = Array.from(budgetTracker.values()).find(
            (b) => b.category.toLowerCase() === item.next.category.toLowerCase()
          );
          const prevSnapshot = prevBudgetMatch ? { ...prevBudgetMatch } : undefined;
          const nextSnapshot = nextBudgetMatch ? { ...nextBudgetMatch } : undefined;

          await updateExpenseInCloud(user.uid, item.prev, item.next, prevSnapshot, nextSnapshot);

          if (prevBudgetMatch && nextBudgetMatch && prevBudgetMatch.id === nextBudgetMatch.id) {
            prevBudgetMatch.spent = Math.max(
              0,
              prevBudgetMatch.spent + (item.next.amount - item.prev.amount)
            );
          } else {
            if (prevBudgetMatch) {
              prevBudgetMatch.spent = Math.max(0, prevBudgetMatch.spent - item.prev.amount);
            }
            if (nextBudgetMatch) {
              nextBudgetMatch.spent = Math.max(0, nextBudgetMatch.spent + item.next.amount);
            }
          }
        }
      });
    }
  };

  const handleAddIncome = (newIncome: Income) => {
    setIncomes((prev) => [newIncome, ...prev]);
    void runCloudAction(() => addIncomeInCloud(user.uid, newIncome));
    syncTitheForIncome(newIncome, newIncome.status === "pending" ? "pending" : "received");
  };

  const handleEditIncome = (updatedIncome: Income) => {
    setIncomes((prev) => prev.map((i) => (i.id === updatedIncome.id ? updatedIncome : i)));
    void runCloudAction(() => updateIncomeInCloud(user.uid, updatedIncome));
    syncTitheForIncome(
      updatedIncome,
      updatedIncome.status === "pending" ? "pending" : "received"
    );
  };

  const handleDeleteIncome = (id: string) => {
    const targetIncome = incomes.find((i) => i.id === id);
    const linkedTithes = expenses.filter(
      (e) =>
        e.sourceIncomeId === id &&
        (!targetIncome?.isRecurring || getYearMonthKey(e.date) === month)
    );
    setIncomes((prev) => prev.filter((i) => i.id !== id));
    void runCloudAction(() => deleteIncomeInCloud(user.uid, id));
    for (const titheExp of linkedTithes) {
      handleDeleteExpense(titheExp.id);
    }
  };

  const handleToggleIncomeStatus = (id: string) => {
    const target = incomes.find((i) => i.id === id);
    if (!target) return;

    const nextStatus: "received" | "pending" =
      target.status === "pending" ? "received" : "pending";

    setIncomes((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: nextStatus } : i))
    );
    void runCloudAction(() => toggleIncomeStatusInCloud(user.uid, target));
    syncTitheForIncome({ ...target, status: nextStatus }, nextStatus);
  };

  const handleAddCard = (newCard: CreditCard) => {
    setCreditCards((prev) => [...prev, newCard]);
    void runCloudAction(() => addCardInCloud(user.uid, newCard));
  };

  const handleDeleteCard = (cardId: string) => {
    const linkedExpenses = expenses.filter((e) => e.cardId === cardId);
    setCreditCards((prev) => prev.filter((c) => c.id !== cardId));
    setExpenses((prev) =>
      prev.map((e) => (e.cardId === cardId ? { ...e, cardId: undefined } : e))
    );
    void runCloudAction(() => deleteCardInCloud(user.uid, cardId, linkedExpenses));
  };

  const handleUpdateBudgets = (nextBudgets: BudgetCategory[]) => {
    const prevBudgets = budgets;
    setBudgets(nextBudgets);
    void runCloudAction(() => syncBudgetsDiffInCloud(user.uid, prevBudgets, nextBudgets));
  };

  const handleAddGoal = (newGoal: FinancialGoal) => {
    setGoals((prev) => [...prev, newGoal]);
    void runCloudAction(() => addGoalInCloud(user.uid, newGoal));
  };

  const handleUpdateGoals = (nextGoals: FinancialGoal[]) => {
    const prevGoals = goals;
    setGoals(nextGoals);
    void runCloudAction(() => syncGoalsDiffInCloud(user.uid, prevGoals, nextGoals));
  };

  const handleAddMember = (newMember: FamilyMember) => {
    setFamilyMembers((prev) => [...prev, newMember]);
    void runCloudAction(() => addMemberInCloud(user.uid, newMember));
  };

  const handleDeleteMember = (id: string) => {
    const remaining = familyMembers.filter((m) => m.id !== id);
    const fallbackId = remaining[0]?.id || "";
    const affectedExpenses = expenses.filter((e) => e.memberId === id);
    const affectedIncomes = incomes.filter((i) => i.memberId === id);
    const affectedDebts = debts.filter((d) => d.memberId === id);

    setFamilyMembers(remaining);
    setExpenses((exps) => exps.map((e) => (e.memberId === id ? { ...e, memberId: fallbackId } : e)));
    setIncomes((incs) => incs.map((i) => (i.memberId === id ? { ...i, memberId: fallbackId } : i)));
    setDebts((ds) => ds.map((d) => (d.memberId === id ? { ...d, memberId: fallbackId } : d)));

    void runCloudAction(() =>
      deleteMemberInCloud(
        user.uid,
        id,
        fallbackId,
        affectedExpenses,
        affectedIncomes,
        affectedDebts
      )
    );
  };

  const handleAddDebt = (newDebt: DebtRecord) => {
    setDebts((prev) => [newDebt, ...prev]);
    void runCloudAction(() => addDebtInCloud(user.uid, newDebt));
  };

  const handlePayDebtInstallment = (id: string) => {
    const target = debts.find((d) => d.id === id);
    if (!target || target.status === "paid") return;

    setDebts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const nextPaid = Math.min(d.totalInstallments, d.paidInstallments + 1);
        const nextDueDate =
          nextPaid < d.totalInstallments ? addMonthsIso(d.dueDate, 1) : d.dueDate;
        return {
          ...d,
          paidInstallments: nextPaid,
          status: nextPaid >= d.totalInstallments ? "paid" : d.status,
          dueDate: nextDueDate,
        };
      })
    );
    void runCloudAction(() => payDebtInstallmentInCloud(user.uid, target));
  };

  const handleSettleDebt = (id: string) => {
    const target = debts.find((d) => d.id === id);
    if (!target || target.status === "paid") return;

    setDebts((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, paidInstallments: d.totalInstallments, status: "paid" } : d
      )
    );
    void runCloudAction(() => settleDebtInCloud(user.uid, target));
  };

  const handleDeleteDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
    void runCloudAction(() => deleteDebtInCloud(user.uid, id));
  };

  const handleClearAllData = () => {
    const currentBudgets = budgets;
    setCreditCards([]);
    setIncomes([]);
    setExpenses([]);
    setBudgets((prev) => prev.map((b) => ({ ...b, spent: 0 })));
    setGoals([]);
    setDebts([]);
    setConfirmAction(null);
    void runCloudAction(() => clearAllCloudData(user.uid, currentBudgets));
  };

  const handleRestoreDemoData = () => {
    setConfirmAction(null);
    void runCloudAction(() => restoreDemoCloudData(user.uid));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        month={month}
        setMonth={handleMonthChange}
        pendingDebtsCount={pendingDebtsCount}
        budgetAlertsCount={budgetAlertsCount}
        userName={user.displayName}
        userEmail={user.email}
        onSignOut={handleSignOut}
      />

      {syncError && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{syncError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncError(null)}
              className="px-2 py-0.5 rounded bg-white border border-rose-200 text-rose-700 font-medium hover:bg-rose-100"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === "dashboard" && (
          <>
            <SummaryCards
              totalIncome={totalIncome}
              receivedIncome={receivedIncome}
              pendingIncome={pendingIncome}
              totalExpense={totalExpense}
              installmentExpenseTotal={installmentExpenseTotal}
              titheExpenseTotal={titheExpenseTotal}
              balance={balance}
              cashBalance={cashBalance}
              pendingAmount={monthPendingOutflowsAmount}
              creditCardMonthTotal={creditCardMonthTotal}
              totalCardsUsed={creditCardsUsedAmount}
              totalCardsLimit={totalCardsLimit}
              cardsCount={creditCards.length}
            />

            <TitheConfigPanel
              config={titheConfig}
              availableCategories={availableCategoriesForTithe}
              receivedIncomeMonthTotal={receivedIncome}
              monthTitheTotal={titheExpenseTotal}
              pendingSyncCount={pendingTitheSyncCount}
              referenceMonth={month}
              compact
              onSaveConfig={handleSaveTitheConfig}
              onSyncMonthTithes={handleSyncMonthTithes}
            />

            <ChartsDashboard
              expenses={monthAllOutflows}
              incomes={monthIncomes}
              budgets={monthBudgets}
              familyMembers={familyMembers}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExpenseTable
                expenses={expenses}
                debts={debts}
                familyMembers={familyMembers}
                creditCards={creditCards}
                budgetCategories={budgets.map((b) => b.category)}
                referenceMonth={month}
                limitRows={5}
                onAddExpense={handleAddExpense}
                onAddExpenses={handleAddExpensesBatch}
                onEditExpense={handleEditExpense}
                onDeleteExpense={handleDeleteExpense}
                onToggleStatus={handleToggleExpenseStatus}
                onPayDebtInstallment={handlePayDebtInstallment}
                onSettleDebt={handleSettleDebt}
                onDeleteDebt={handleDeleteDebt}
              />
              <IncomeTable
                incomes={incomes}
                familyMembers={familyMembers}
                referenceMonth={month}
                limitRows={5}
                onAddIncome={handleAddIncome}
                onEditIncome={handleEditIncome}
                onDeleteIncome={handleDeleteIncome}
                onToggleStatus={handleToggleIncomeStatus}
              />
            </div>
          </>
        )}

        {activeTab === "debts" && (
          <PendingDebtsManager
            expenses={expenses}
            creditCards={creditCards}
            familyMembers={familyMembers}
            debts={debts}
            referenceMonth={month}
            onToggleStatus={handleToggleExpenseStatus}
            onPayCreditCardInvoice={handlePayCreditCardInvoice}
            onAddDebt={handleAddDebt}
            onPayDebtInstallment={handlePayDebtInstallment}
            onSettleDebt={handleSettleDebt}
            onDeleteDebt={handleDeleteDebt}
          />
        )}

        {activeTab === "expenses" && (
          <ExpenseTable
            expenses={expenses}
            debts={debts}
            familyMembers={familyMembers}
            creditCards={creditCards}
            budgetCategories={budgets.map((b) => b.category)}
            referenceMonth={month}
            onAddExpense={handleAddExpense}
            onAddExpenses={handleAddExpensesBatch}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
            onToggleStatus={handleToggleExpenseStatus}
            onPayDebtInstallment={handlePayDebtInstallment}
            onSettleDebt={handleSettleDebt}
            onDeleteDebt={handleDeleteDebt}
          />
        )}

        {activeTab === "income" && (
          <div className="space-y-6">
            <TitheConfigPanel
              config={titheConfig}
              availableCategories={availableCategoriesForTithe}
              receivedIncomeMonthTotal={receivedIncome}
              monthTitheTotal={titheExpenseTotal}
              pendingSyncCount={pendingTitheSyncCount}
              referenceMonth={month}
              onSaveConfig={handleSaveTitheConfig}
              onSyncMonthTithes={handleSyncMonthTithes}
            />
            <IncomeTable
              incomes={incomes}
              familyMembers={familyMembers}
              referenceMonth={month}
              onAddIncome={handleAddIncome}
              onEditIncome={handleEditIncome}
              onDeleteIncome={handleDeleteIncome}
              onToggleStatus={handleToggleIncomeStatus}
            />
          </div>
        )}

        {activeTab === "budget" && (
          <BudgetMonitor budgets={monthBudgets} onUpdateBudget={handleUpdateBudgets} />
        )}

        {activeTab === "cards" && (
          <CreditCardsManager
            cards={creditCards}
            onAddCard={handleAddCard}
            onDeleteCard={handleDeleteCard}
          />
        )}

        {activeTab === "goals" && (
          <GoalsManager
            goals={goals}
            onAddGoal={handleAddGoal}
            onUpdateGoal={handleUpdateGoals}
          />
        )}

        {activeTab === "family" && (
          <FamilyMembersManager
            members={familyMembers}
            expenses={monthAllOutflows}
            incomes={monthIncomes}
            onAddMember={handleAddMember}
            onDeleteMember={handleDeleteMember}
          />
        )}

        {activeTab === "simulator" && <InvestmentSimulator />}

        {activeTab === "ai" && (
          <FinFamAiAssistant
            expenses={monthAllOutflows}
            incomes={monthIncomes}
            budgets={monthBudgets}
            goals={goals}
            referenceMonth={month}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>WillBank &copy; 2026 - Gestão Financeira Familiar (Sincronizado na nuvem com Firebase)</span>
          <div className="flex items-center gap-2">
            {confirmAction === "clear" ? (
              <div className="flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                <span className="text-rose-700 font-medium">Zerar lançamentos?</span>
                <button
                  type="button"
                  onClick={handleClearAllData}
                  className="px-2 py-0.5 bg-rose-600 text-white rounded font-semibold hover:bg-rose-700"
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-2 py-0.5 bg-white text-slate-600 rounded border border-slate-200 hover:bg-slate-50"
                >
                  Não
                </button>
              </div>
            ) : confirmAction === "restore" ? (
              <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                <span className="text-blue-700 font-medium">Restaurar exemplos?</span>
                <button
                  type="button"
                  onClick={handleRestoreDemoData}
                  className="px-2 py-0.5 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700"
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-2 py-0.5 bg-white text-slate-600 rounded border border-slate-200 hover:bg-slate-50"
                >
                  Não
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmAction("clear")}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors"
                >
                  Limpar dados (Começar do zero)
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmAction("restore")}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  Restaurar exemplo
                </button>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
