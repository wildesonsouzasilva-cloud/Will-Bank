"use client";

import React, { useState } from "react";
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
} from "@/lib/initial-data";
import { Expense, Income, BudgetCategory, CreditCard, FinancialGoal, FamilyMember } from "@/lib/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [month, setMonth] = useState("2026-08");

  // App State
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(initialFamilyMembers);
  const [creditCards, setCreditCards] = useState<CreditCard[]>(initialCreditCards);
  const [incomes, setIncomes] = useState<Income[]>(initialIncomes);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [budgets, setBudgets] = useState<BudgetCategory[]>(initialBudgetCategories);
  const [goals, setGoals] = useState<FinancialGoal[]>(initialGoals);

  // Calculations
  const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  // Débitos a Pagar
  const pendingExpenses = expenses.filter((e) => e.status === "pending");
  const pendingExpensesAmount = pendingExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const creditCardsUsedAmount = creditCards.reduce((acc, curr) => acc + curr.used, 0);
  const totalPendingDebts = pendingExpensesAmount + creditCardsUsedAmount;
  const pendingDebtsCount = pendingExpenses.length + creditCards.filter((c) => c.used > 0).length;

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
            onToggleStatus={handleToggleExpenseStatus}
            onPayCreditCardInvoice={handlePayCreditCardInvoice}
          />
        )}

        {activeTab === "expenses" && (
          <ExpenseTable
            expenses={expenses}
            familyMembers={familyMembers}
            creditCards={creditCards}
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
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          FinFam AI &copy; 2026 - Gestão Financeira Familiar Inteligente
        </div>
      </footer>
    </div>
  );
}
