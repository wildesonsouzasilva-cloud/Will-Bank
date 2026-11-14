"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
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

import {
  initialFamilyMembers,
  initialCreditCards,
  initialIncomes,
  initialExpenses,
  initialBudgetCategories,
  initialGoals,
  initialDebts,
} from "@/lib/initial-data";
import { Expense, Income, BudgetCategory, CreditCard, FinancialGoal, FamilyMember, DebtRecord } from "@/lib/types";

const STORAGE_KEY = "willbank_financial_state_v1";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [month, setMonth] = useState("2026-11");
  const [isHydrated, setIsHydrated] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"clear" | "restore" | null>(null);

  // App State
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(initialFamilyMembers);
  const [creditCards, setCreditCards] = useState<CreditCard[]>(initialCreditCards);
  const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [budgets, setBudgets] = useState<BudgetCategory[]>(initialBudgetCategories);
  const [goals, setGoals] = useState<FinancialGoal[]>(initialGoals);
  const [debts, setDebts] = useState<DebtRecord[]>(initialDebts);

  // Carrega dados salvos no navegador ao montar (evita hydration mismatch)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.month === "string") setMonth(parsed.month);
        if (Array.isArray(parsed.familyMembers)) setFamilyMembers(parsed.familyMembers);
        if (Array.isArray(parsed.creditCards)) setCreditCards(parsed.creditCards);
        if (Array.isArray(parsed.incomes)) setIncomes(parsed.incomes);
        if (Array.isArray(parsed.expenses)) setExpenses(parsed.expenses);
        if (Array.isArray(parsed.budgets)) setBudgets(parsed.budgets);
        if (Array.isArray(parsed.goals)) setGoals(parsed.goals);
        if (Array.isArray(parsed.debts)) setDebts(parsed.debts);
      }
    } catch (err) {
      console.error("Erro ao carregar dados salvos:", err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const serializedState = JSON.stringify({
    month,
    familyMembers,
    creditCards,
    incomes,
    expenses,
    budgets,
    goals,
    debts,
  });

  // Salva automaticamente no navegador sempre que houver alteração
  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, serializedState);
    } catch (err) {
      console.error("Erro ao salvar dados no navegador:", err);
    }
  }, [isHydrated, serializedState]);

  const handleClearAllData = () => {
    setCreditCards([]);
    setIncomes([]);
    setExpenses([]);
    setBudgets((prev) => prev.map((b) => ({ ...b, spent: 0 })));
    setGoals([]);
    setDebts([]);
    setConfirmAction(null);
  };

  const handleRestoreDemoData = () => {
    setMonth("2026-11");
    setFamilyMembers(initialFamilyMembers);
    setCreditCards(initialCreditCards);
    setIncomes(initialIncomes);
    setExpenses(initialExpenses);
    setBudgets(initialBudgetCategories);
    setGoals(initialGoals);
    setDebts(initialDebts);
    setConfirmAction(null);
  };

  // Calculations
  const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // Débitos a Pagar & Endividamentos
  const pendingExpenses = expenses.filter((e) => e.status === "pending");
  const pendingExpensesAmount = pendingExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const creditCardsUsedAmount = creditCards.reduce((acc, curr) => acc + curr.used, 0);
  const activeDebts = debts.filter((d) => d.status !== "paid");
  const activeDebtsAmount = activeDebts.reduce((acc, d) => {
    if (d.totalInstallments <= 1) return acc + d.totalAmount;
    return acc + Math.max(0, d.totalInstallments - d.paidInstallments) * d.installmentAmount;
  }, 0);
  const totalPendingDebts = pendingExpensesAmount + creditCardsUsedAmount + activeDebtsAmount;
  const pendingDebtsCount =
    pendingExpenses.length + creditCards.filter((c) => c.used > 0).length + activeDebts.length;

  // Handlers
  const handleAddExpense = (newExpense: Expense) => {
    setExpenses((prev) => [newExpense, ...prev]);

    // Automatically update budget category spent
    setBudgets((prev) =>
      prev.map((b) =>
        b.category.toLowerCase() === newExpense.category.toLowerCase()
          ? { ...b, spent: b.spent + newExpense.amount }
          : b
      )
    );

    // If paid by credit card, update card used amount
    if (newExpense.paymentMethod === "credit_card" && newExpense.cardId) {
      setCreditCards((prev) =>
        prev.map((c) =>
          c.id === newExpense.cardId ? { ...c, used: c.used + newExpense.amount } : c
        )
      );
    }
  };

  const handleDeleteExpense = (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    if (!exp) return;

    setExpenses((prev) => prev.filter((e) => e.id !== id));

    // Update budget category spent
    setBudgets((prev) =>
      prev.map((b) =>
        b.category.toLowerCase() === exp.category.toLowerCase()
          ? { ...b, spent: Math.max(0, b.spent - exp.amount) }
          : b
      )
    );

    // If was credit card, deduct from card
    if (exp.paymentMethod === "credit_card" && exp.cardId) {
      setCreditCards((prev) =>
        prev.map((c) =>
          c.id === exp.cardId ? { ...c, used: Math.max(0, c.used - exp.amount) } : c
        )
      );
    }
  };

  const handleToggleExpenseStatus = (id: string) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: e.status === "paid" ? "pending" : "paid" } : e
      )
    );
  };

  const handlePayCreditCardInvoice = (cardId: string) => {
    setCreditCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, used: 0 } : c))
    );
    // Mark associated pending credit card expenses as paid
    setExpenses((prev) =>
      prev.map((e) =>
        e.paymentMethod === "credit_card" && e.cardId === cardId ? { ...e, status: "paid" } : e
      )
    );
  };

  const handleAddIncome = (newIncome: Income) => {
    setIncomes((prev) => [newIncome, ...prev]);
  };

  const handleDeleteIncome = (id: string) => {
    setIncomes((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddCard = (newCard: CreditCard) => {
    setCreditCards((prev) => [...prev, newCard]);
  };

  const handleDeleteCard = (cardId: string) => {
    setCreditCards((prev) => prev.filter((c) => c.id !== cardId));
    // Remove reference from expenses or convert to other method
    setExpenses((prev) =>
      prev.map((e) => (e.cardId === cardId ? { ...e, cardId: undefined } : e))
    );
  };

  const handleAddGoal = (newGoal: FinancialGoal) => {
    setGoals((prev) => [...prev, newGoal]);
  };

  const handleAddMember = (newMember: FamilyMember) => {
    setFamilyMembers((prev) => [...prev, newMember]);
  };

  const handleDeleteMember = (id: string) => {
    const remaining = familyMembers.filter((m) => m.id !== id);
    const fallbackId = remaining[0]?.id || "";
    setFamilyMembers(remaining);
    setExpenses((exps) => exps.map((e) => (e.memberId === id ? { ...e, memberId: fallbackId } : e)));
    setIncomes((incs) => incs.map((i) => (i.memberId === id ? { ...i, memberId: fallbackId } : i)));
    setDebts((ds) => ds.map((d) => (d.memberId === id ? { ...d, memberId: fallbackId } : d)));
  };

  const handleAddDebt = (newDebt: DebtRecord) => {
    setDebts((prev) => [newDebt, ...prev]);
  };

  const handlePayDebtInstallment = (id: string) => {
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const nextPaid = Math.min(d.totalInstallments, d.paidInstallments + 1);
        return {
          ...d,
          paidInstallments: nextPaid,
          status: nextPaid >= d.totalInstallments ? "paid" : d.status,
        };
      })
    );
  };

  const handleSettleDebt = (id: string) => {
    setDebts((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, paidInstallments: d.totalInstallments, status: "paid" } : d
      )
    );
  };

  const handleDeleteDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        month={month}
        setMonth={setMonth}
        pendingDebtsCount={pendingDebtsCount}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top KPI Cards (Always visible on dashboard, or customizable) */}
        {activeTab === "dashboard" && (
          <>
            <SummaryCards
              totalIncome={totalIncome}
              totalExpense={totalExpense}
              balance={balance}
              savingsRate={savingsRate}
              pendingAmount={totalPendingDebts}
            />

            <ChartsDashboard
              expenses={expenses}
              incomes={incomes}
              budgets={budgets}
              familyMembers={familyMembers}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExpenseTable
                expenses={expenses.slice(0, 5)}
                familyMembers={familyMembers}
                creditCards={creditCards}
                budgetCategories={budgets.map((b) => b.category)}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
                onToggleStatus={handleToggleExpenseStatus}
              />
              <IncomeTable
                incomes={incomes.slice(0, 5)}
                familyMembers={familyMembers}
                onAddIncome={handleAddIncome}
                onDeleteIncome={handleDeleteIncome}
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
            familyMembers={familyMembers}
            creditCards={creditCards}
            budgetCategories={budgets.map((b) => b.category)}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onToggleStatus={handleToggleExpenseStatus}
          />
        )}

        {activeTab === "income" && (
          <IncomeTable
            incomes={incomes}
            familyMembers={familyMembers}
            onAddIncome={handleAddIncome}
            onDeleteIncome={handleDeleteIncome}
          />
        )}

        {activeTab === "budget" && (
          <BudgetMonitor budgets={budgets} onUpdateBudget={setBudgets} />
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
            onUpdateGoal={setGoals}
          />
        )}

        {activeTab === "family" && (
          <FamilyMembersManager
            members={familyMembers}
            expenses={expenses}
            incomes={incomes}
            onAddMember={handleAddMember}
            onDeleteMember={handleDeleteMember}
          />
        )}

        {activeTab === "simulator" && <InvestmentSimulator />}

        {activeTab === "ai" && (
          <FinFamAiAssistant
            expenses={expenses}
            incomes={incomes}
            budgets={budgets}
            goals={goals}
          />
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>WillBank &copy; 2026 - Gestão Financeira Familiar Inteligente (Salvo automaticamente neste navegador)</span>
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
