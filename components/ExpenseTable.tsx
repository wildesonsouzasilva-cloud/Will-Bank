"use client";

import React, { useState } from "react";
import { Expense, FamilyMember, CreditCard, DebtRecord } from "@/lib/types";
import {
  formatCurrency,
  formatDate,
  addMonthsIso,
  formatMonthYearPt,
  getYearMonthKey,
  buildDebtSchedule,
  computeCreditCardInvoiceDueDate,
} from "@/lib/utils";
import { Plus, Trash2, Pencil, CreditCard as CardIcon, Layers, AlertTriangle, CalendarClock } from "lucide-react";

interface ExpenseTableProps {
  expenses: Expense[];
  debts?: DebtRecord[];
  familyMembers: FamilyMember[];
  creditCards: CreditCard[];
  budgetCategories?: string[];
  referenceMonth?: string;
  limitRows?: number;
  onAddExpense: (expense: Expense) => void;
  onAddExpenses?: (expenses: Expense[]) => void;
  onEditExpense?: (prevExpense: Expense, nextExpense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onToggleStatus?: (id: string) => void;
  onPayDebtInstallment?: (id: string) => void;
  onSettleDebt?: (id: string) => void;
  onDeleteDebt?: (id: string) => void;
}

interface UnifiedOutflowItem {
  rowKey: string;
  kind: "expense" | "debt_installment" | "debt_overdue";
  sourceExpense?: Expense;
  sourceDebt?: DebtRecord;
  status: "paid" | "pending";
  description: string;
  creditor?: string;
  category: string;
  memberId: string;
  paymentMethod?: Expense["paymentMethod"];
  cardId?: string;
  date: string;
  amount: number;
  installmentBadge?: string;
  isNextDebtInstallment?: boolean;
}

export default function ExpenseTable({
  expenses,
  debts = [],
  familyMembers,
  creditCards,
  budgetCategories = [],
  referenceMonth,
  limitRows,
  onAddExpense,
  onAddExpenses,
  onEditExpense,
  onDeleteExpense,
  onToggleStatus,
  onPayDebtInstallment,
  onSettleDebt,
  onDeleteDebt,
}: ExpenseTableProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [monthScope, setMonthScope] = useState<"selected" | "all">("selected");
  const [typeFilter, setTypeFilter] = useState<"all" | "pending" | "credit_card" | "installments" | "regular">("all");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Alimentação");
  const [memberId, setMemberId] = useState(familyMembers[0]?.id || "");
  const [date, setDate] = useState(`${referenceMonth || "2026-11"}-14`);
  const [paymentMethod, setPaymentMethod] = useState<Expense["paymentMethod"]>("pix");
  const [cardId, setCardId] = useState(creditCards[0]?.id || "");
  const [status, setStatus] = useState<Expense["status"]>("paid");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState("2");
  const [applyCardClosingRule, setApplyCardClosingRule] = useState(true);

  const openCreateModal = () => {
    setEditingExpense(null);
    setDescription("");
    setAmount("");
    setCategory(budgetCategories[0] || "Alimentação");
    setMemberId(familyMembers[0]?.id || "");
    setDate(`${referenceMonth || "2026-11"}-14`);
    setPaymentMethod("pix");
    setCardId(creditCards[0]?.id || "");
    setStatus("paid");
    setIsInstallment(false);
    setInstallments("2");
    setApplyCardClosingRule(true);
    setShowModal(true);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setCategory(expense.category || "Alimentação");
    setMemberId(expense.memberId || familyMembers[0]?.id || "");
    setDate(expense.date || `${referenceMonth || "2026-11"}-14`);
    setPaymentMethod(expense.paymentMethod || "pix");
    setCardId(expense.cardId || creditCards[0]?.id || "");
    setStatus(expense.status === "pending" ? "pending" : "paid");
    setIsInstallment(false);
    setInstallments(String(expense.installments || 2));
    // Ao editar uma despesa já lançada, não deslocar novamente a data por padrão,
    // a menos que o usuário altere a data de compra/cartão ou marque a opção manualmente.
    setApplyCardClosingRule(false);
    setShowModal(true);
  };

  const validMemberId = familyMembers.some((m) => m.id === memberId)
    ? memberId
    : familyMembers[0]?.id || "";
  const validCardId = creditCards.some((c) => c.id === cardId)
    ? cardId
    : creditCards[0]?.id || "";
  const selectedCard = creditCards.find((c) => c.id === validCardId);

  const cardInvoicePreview =
    paymentMethod === "credit_card" && selectedCard
      ? computeCreditCardInvoiceDueDate(date, selectedCard.closingDay, selectedCard.dueDay)
      : null;

  const effectiveStartDate =
    paymentMethod === "credit_card" && selectedCard && applyCardClosingRule && cardInvoicePreview
      ? cardInvoicePreview.dueDate
      : date;

  const parsedTotalAmount = parseFloat(amount) || 0;
  const parsedInstallments =
    !editingExpense && isInstallment
      ? Math.min(120, Math.max(2, parseInt(installments, 10) || 2))
      : 1;
  const installmentValue = parsedTotalAmount > 0 ? parsedTotalAmount / parsedInstallments : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || parsedTotalAmount <= 0) return;

    if (editingExpense && onEditExpense) {
      const updatedExpense: Expense = {
        ...editingExpense,
        description: description.trim(),
        amount: parsedTotalAmount,
        date: effectiveStartDate,
        category,
        memberId: validMemberId,
        paymentMethod,
        cardId: paymentMethod === "credit_card" ? validCardId : undefined,
        status,
      };
      onEditExpense(editingExpense, updatedExpense);
    } else {
      const totalInstallments = parsedInstallments;
      const baseTimestamp = Date.now();

      if (totalInstallments > 1 && onAddExpenses) {
        const perInstallment = Number((parsedTotalAmount / totalInstallments).toFixed(2));
        const generated: Expense[] = Array.from({ length: totalInstallments }, (_, idx) => {
          const current = idx + 1;
          return {
            id: `exp-${baseTimestamp}-${current}`,
            description: `${description.trim()} (${current}/${totalInstallments})`,
            amount: perInstallment,
            date: addMonthsIso(effectiveStartDate, idx),
            category,
            memberId: validMemberId,
            paymentMethod,
            cardId: paymentMethod === "credit_card" ? validCardId : undefined,
            installments: totalInstallments,
            currentInstallment: current,
            status: current === 1 ? status : "pending",
          };
        });
        onAddExpenses(generated);
      } else {
        const newExpense: Expense = {
          id: `exp-${baseTimestamp}`,
          description: description.trim(),
          amount: parsedTotalAmount,
          date: effectiveStartDate,
          category,
          memberId: validMemberId,
          paymentMethod,
          cardId: paymentMethod === "credit_card" ? validCardId : undefined,
          installments: totalInstallments > 1 ? totalInstallments : undefined,
          currentInstallment: totalInstallments > 1 ? 1 : undefined,
          status,
        };
        onAddExpense(newExpense);
      }
    }

    setShowModal(false);
    setEditingExpense(null);
    setDescription("");
    setAmount("");
    setStatus("paid");
    setIsInstallment(false);
    setInstallments("2");
  };

  const defaultCategories = ["Dízimo", "Moradia", "Alimentação", "Educação", "Saúde", "Transporte", "Lazer", "Outros"];
  const categories = Array.from(new Set([...budgetCategories, ...defaultCategories]));

  // 1) Despesas padrão, cartão de crédito e parceladas da tabela expenses
  const filteredExpenses =
    referenceMonth && monthScope === "selected"
      ? expenses.filter((e) => getYearMonthKey(e.date) === referenceMonth)
      : expenses;

  const unifiedItems: UnifiedOutflowItem[] = filteredExpenses.map((e) => ({
    rowKey: `exp-${e.id}`,
    kind: "expense",
    sourceExpense: e,
    status: e.status,
    description: e.description,
    category: e.category,
    memberId: e.memberId,
    paymentMethod: e.paymentMethod,
    cardId: e.cardId,
    date: e.date,
    amount: e.amount,
    installmentBadge:
      e.installments && e.installments > 1
        ? `Parcela ${e.currentInstallment || 1}/${e.installments}`
        : undefined,
  }));

  // 2) Dívidas parceladas e endividamentos em atraso integrados nas saídas
  for (const debt of debts) {
    if (debt.debtMode === "installment") {
      const schedule = buildDebtSchedule(debt);
      if (referenceMonth && monthScope === "selected") {
        const monthItems = schedule.filter((item) => item.yearMonth === referenceMonth);
        for (const item of monthItems) {
          unifiedItems.push({
            rowKey: `debt-${debt.id}-inst-${item.installmentNumber}`,
            kind: "debt_installment",
            sourceDebt: debt,
            status: item.isPaid ? "paid" : "pending",
            description: debt.title,
            creditor: debt.creditor,
            category: debt.category,
            memberId: debt.memberId,
            date: item.dueDate,
            amount: item.amount,
            installmentBadge: `Parcela ${item.installmentNumber}/${debt.totalInstallments}`,
            isNextDebtInstallment: item.isNext,
          });
        }
      } else {
        const nextInst =
          debt.status === "paid"
            ? debt.totalInstallments
            : Math.min(debt.totalInstallments, debt.paidInstallments + 1);
        unifiedItems.push({
          rowKey: `debt-${debt.id}-summary`,
          kind: "debt_installment",
          sourceDebt: debt,
          status: debt.status === "paid" ? "paid" : "pending",
          description: debt.title,
          creditor: debt.creditor,
          category: debt.category,
          memberId: debt.memberId,
          date: debt.dueDate,
          amount: debt.installmentAmount,
          installmentBadge: `Parcela ${nextInst}/${debt.totalInstallments}`,
          isNextDebtInstallment: debt.status !== "paid",
        });
      }
    } else if (debt.debtMode === "overdue") {
      const ym = getYearMonthKey(debt.dueDate);
      const matchesSelectedMonth =
        !referenceMonth ||
        monthScope !== "selected" ||
        (debt.status !== "paid" ? !ym || ym <= referenceMonth : ym === referenceMonth);

      if (matchesSelectedMonth) {
        unifiedItems.push({
          rowKey: `debt-${debt.id}-overdue`,
          kind: "debt_overdue",
          sourceDebt: debt,
          status: debt.status === "paid" ? "paid" : "pending",
          description: debt.title,
          creditor: debt.creditor,
          category: debt.category,
          memberId: debt.memberId,
          date: debt.dueDate,
          amount: debt.totalAmount,
          installmentBadge:
            debt.totalInstallments > 1
              ? `Parcela ${Math.min(debt.totalInstallments, debt.paidInstallments + 1)}/${debt.totalInstallments}`
              : undefined,
        });
      }
    }
  }

  // Organizar todas as saídas de acordo com a data de vencimento (ordem cronológica)
  unifiedItems.sort((a, b) => {
    const dateDiff = (a.date || "").localeCompare(b.date || "");
    if (dateDiff !== 0) return dateDiff;
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return 0;
  });

  const totalOutflowsAmount = unifiedItems.reduce((acc, item) => acc + item.amount, 0);
  const paidOutflowsAmount = unifiedItems
    .filter((item) => item.status === "paid")
    .reduce((acc, item) => acc + item.amount, 0);
  const pendingOutflowsAmount = unifiedItems
    .filter((item) => item.status === "pending")
    .reduce((acc, item) => acc + item.amount, 0);

  const filteredOutflows = unifiedItems.filter((item) => {
    if (typeFilter === "pending") return item.status === "pending";
    if (typeFilter === "credit_card") return item.paymentMethod === "credit_card";
    if (typeFilter === "installments") return Boolean(item.installmentBadge) || item.kind === "debt_installment";
    if (typeFilter === "regular") {
      return item.kind === "expense" && item.paymentMethod !== "credit_card" && !item.installmentBadge;
    }
    return true;
  });

  const visibleOutflows = limitRows ? filteredOutflows.slice(0, limitRows) : filteredOutflows;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Controle de Despesas (Todas as Saídas)</h3>
            <p className="text-xs text-slate-500">
              {referenceMonth && monthScope === "selected"
                ? `Saídas ordenadas por vencimento em ${formatMonthYearPt(referenceMonth)}`
                : "Histórico completo ordenado pela data de vencimento"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {referenceMonth && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setMonthScope("selected")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    monthScope === "selected"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {formatMonthYearPt(referenceMonth, true)}
                </button>
                <button
                  type="button"
                  onClick={() => setMonthScope("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    monthScope === "all"
                      ? "bg-white text-slate-900 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Todos
                </button>
              </div>
            )}
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-rose-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Nova Despesa
            </button>
          </div>
        </div>

        {/* Filtros por tipo de saída + Resumo consolidado */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            {[
              { id: "all", label: "Todas" },
              { id: "pending", label: "A Pagar" },
              { id: "credit_card", label: "Cartão de Crédito" },
              { id: "installments", label: "Parceladas" },
              { id: "regular", label: "Contas / PIX" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTypeFilter(item.id as typeof typeFilter)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  typeFilter === item.id
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold">
              Pagas: {formatCurrency(paidOutflowsAmount)}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-semibold">
              A Pagar: {formatCurrency(pendingOutflowsAmount)}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold">
              Total Saídas: {formatCurrency(totalOutflowsAmount)}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
            <tr>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Descrição / Parcela</th>
              <th className="px-6 py-3.5">Categoria</th>
              <th className="px-6 py-3.5">Membro</th>
              <th className="px-6 py-3.5">Forma / Origem</th>
              <th className="px-6 py-3.5">Vencimento / Data</th>
              <th className="px-6 py-3.5 text-right">Valor</th>
              <th className="px-6 py-3.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleOutflows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-xs sm:text-sm text-slate-400">
                  {referenceMonth && monthScope === "selected"
                    ? `Nenhuma saída encontrada em ${formatMonthYearPt(referenceMonth)}.`
                    : "Nenhuma despesa cadastrada."}
                </td>
              </tr>
            ) : (
              visibleOutflows.map((item) => {
                const member = familyMembers.find((m) => m.id === item.memberId);
                const card = creditCards.find((c) => c.id === item.cardId);

                const handleStatusClick = () => {
                  if (item.kind === "expense" && item.sourceExpense && onToggleStatus) {
                    onToggleStatus(item.sourceExpense.id);
                  } else if (
                    item.kind === "debt_installment" &&
                    item.sourceDebt &&
                    item.status === "pending" &&
                    onPayDebtInstallment
                  ) {
                    onPayDebtInstallment(item.sourceDebt.id);
                  } else if (
                    item.kind === "debt_overdue" &&
                    item.sourceDebt &&
                    item.status === "pending" &&
                    onSettleDebt
                  ) {
                    onSettleDebt(item.sourceDebt.id);
                  }
                };

                const canClickStatus =
                  (item.kind === "expense" && Boolean(onToggleStatus)) ||
                  (item.kind === "debt_installment" && item.status === "pending" && Boolean(onPayDebtInstallment)) ||
                  (item.kind === "debt_overdue" && item.status === "pending" && Boolean(onSettleDebt));

                const handleDeleteClick = () => {
                  if (item.kind === "expense" && item.sourceExpense) {
                    onDeleteExpense(item.sourceExpense.id);
                  } else if (item.sourceDebt && onDeleteDebt) {
                    onDeleteDebt(item.sourceDebt.id);
                  }
                };

                const canDelete =
                  item.kind === "expense" || (item.sourceDebt !== undefined && Boolean(onDeleteDebt));

                return (
                  <tr key={item.rowKey} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      {canClickStatus ? (
                        <button
                          type="button"
                          onClick={handleStatusClick}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                            item.status === "paid"
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                          title={
                            item.kind === "expense"
                              ? "Clique para alternar entre Pago e A Pagar"
                              : item.kind === "debt_installment"
                                ? "Clique para dar baixa nesta parcela"
                                : "Clique para quitar esta dívida"
                          }
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === "paid" ? "bg-emerald-600" : "bg-amber-600"
                            }`}
                          />
                          {item.status === "paid" ? "Pago" : "A Pagar"}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                            item.status === "paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === "paid" ? "bg-emerald-600" : "bg-amber-600"
                            }`}
                          />
                          {item.status === "paid" ? "Pago" : "A Pagar"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            item.kind === "debt_overdue"
                              ? "bg-rose-600"
                              : item.kind === "debt_installment"
                                ? "bg-indigo-500"
                                : "bg-rose-500"
                          }`}
                        />
                        <span>{item.description}</span>
                        {item.installmentBadge && (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              item.status === "paid"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            <Layers className="w-3 h-3" />
                            {item.installmentBadge}
                            {item.status === "pending" ? " (a pagar)" : ""}
                          </span>
                        )}
                        {item.kind === "debt_overdue" && item.status === "pending" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                            <AlertTriangle className="w-3 h-3" />
                            Em atraso
                          </span>
                        )}
                        {item.kind === "expense" && item.sourceExpense?.sourceIncomeId && (
                          <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                            Dízimo Automático
                          </span>
                        )}
                      </div>
                      {item.creditor && (
                        <span className="block text-[11px] text-slate-500 pl-4 mt-0.5">
                          Credor: {item.creditor}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 whitespace-nowrap">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs text-slate-700 font-medium whitespace-nowrap">
                        <span>{member?.avatar || "👤"}</span>
                        {member?.name || "Geral"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {item.kind === "debt_installment" ? (
                        <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
                          <Layers className="w-3.5 h-3.5" />
                          Dívida Parcelada
                        </span>
                      ) : item.kind === "debt_overdue" ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Endividamento
                        </span>
                      ) : item.paymentMethod === "credit_card" ? (
                        <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                          <CardIcon className="w-3.5 h-3.5" />
                          {card ? `${card.name} (•••• ${card.last4})` : "Cartão de Crédito"}
                        </span>
                      ) : item.paymentMethod === "pix" ? (
                        <span className="text-emerald-600 font-medium">PIX</span>
                      ) : item.paymentMethod === "debit" ? (
                        <span className="text-blue-600 font-medium">Débito</span>
                      ) : item.paymentMethod === "cash" ? (
                        <span className="text-slate-700 font-medium">Dinheiro</span>
                      ) : (
                        <span className="capitalize">{item.paymentMethod}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-rose-600 whitespace-nowrap">
                      -{formatCurrency(item.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        {item.kind === "expense" && item.sourceExpense && onEditExpense && (
                          <button
                            type="button"
                            onClick={() => openEditModal(item.sourceExpense!)}
                            className="text-slate-400 hover:text-blue-600 p-1 rounded-md transition-colors"
                            title="Editar despesa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={handleDeleteClick}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nova / Editar Despesa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200 my-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingExpense ? "Editar Despesa" : "Adicionar Nova Despesa"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Supermercado, Cinema, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {paymentMethod === "credit_card" ? "Data da Compra / Venc." : "Data de Vencimento"}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      if (editingExpense && paymentMethod === "credit_card") {
                        setApplyCardClosingRule(true);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Membro</label>
                  <select
                    value={validMemberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {familyMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Forma de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    const nextMethod = e.target.value as Expense["paymentMethod"];
                    setPaymentMethod(nextMethod);
                    if (!editingExpense && nextMethod === "credit_card") {
                      setApplyCardClosingRule(true);
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="pix">PIX / Transferência</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="debit">Cartão de Débito</option>
                  <option value="cash">Dinheiro em Espécie</option>
                </select>
              </div>

              {paymentMethod === "credit_card" && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Selecione o Cartão</label>
                    <select
                      value={validCardId}
                      onChange={(e) => {
                        setCardId(e.target.value);
                        if (editingExpense) setApplyCardClosingRule(true);
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      {creditCards.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (•••• {c.last4}) — Fecha dia {c.closingDay}, Vence dia {c.dueDay}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCard && cardInvoicePreview && (
                    <div
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        applyCardClosingRule && cardInvoicePreview.shiftedAfterClosing
                          ? "bg-amber-50 border-amber-200 text-amber-900"
                          : "bg-indigo-50/60 border-indigo-200 text-indigo-900"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <CalendarClock className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          {applyCardClosingRule ? (
                            cardInvoicePreview.shiftedAfterClosing ? (
                              <span>
                                Compra após fechamento do cartão (dia{" "}
                                <strong>{selectedCard.closingDay}</strong>): lançada na{" "}
                                <strong>próxima fatura ({formatMonthYearPt(cardInvoicePreview.dueDate, true)})</strong>{" "}
                                com vencimento em <strong>{formatDate(cardInvoicePreview.dueDate)}</strong>.
                              </span>
                            ) : (
                              <span>
                                Dentro do ciclo (fecha dia <strong>{selectedCard.closingDay}</strong>):
                                vencimento na fatura de{" "}
                                <strong>{formatMonthYearPt(cardInvoicePreview.dueDate, true)}</strong> (
                                <strong>{formatDate(cardInvoicePreview.dueDate)}</strong>).
                              </span>
                            )
                          ) : (
                            <span>
                              Mantendo vencimento atual em <strong>{formatDate(date)}</strong>.
                            </span>
                          )}
                        </div>
                      </div>

                      {editingExpense && (
                        <label className="flex items-center gap-2 pt-1 text-[11px] font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={applyCardClosingRule}
                            onChange={(e) => setApplyCardClosingRule(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          Recalcular fatura automaticamente pelo fechamento (dia {selectedCard.closingDay})
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!editingExpense ? (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-600">Parcelamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsInstallment(false)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        !isInstallment
                          ? "bg-slate-900 border-slate-900 text-white"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      À vista (1x)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsInstallment(true)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        isInstallment
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Parcelado (Escolher qtd.)
                    </button>
                  </div>

                  {isInstallment && (
                    <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-semibold text-indigo-900 shrink-0">
                          Quantidade de Parcelas:
                        </label>
                        <input
                          type="number"
                          min="2"
                          max="120"
                          required
                          placeholder="Ex: 10"
                          value={installments}
                          onChange={(e) => setInstallments(e.target.value)}
                          className="w-28 px-3 py-1.5 border border-indigo-200 bg-white rounded-lg text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      {parsedTotalAmount > 0 && (
                        <p className="text-[11px] text-indigo-700 leading-relaxed">
                          Serão distribuídas <strong>{parsedInstallments} parcelas</strong> de{" "}
                          <strong>{formatCurrency(installmentValue)}</strong> entre{" "}
                          <strong>{formatMonthYearPt(effectiveStartDate, true)}</strong> e{" "}
                          <strong>
                            {formatMonthYearPt(addMonthsIso(effectiveStartDate, parsedInstallments - 1), true)}
                          </strong>
                          .
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : editingExpense.installments && editingExpense.installments > 1 ? (
                <div className="px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-800 font-medium">
                  Editando <strong>Parcela {editingExpense.currentInstallment || 1}/{editingExpense.installments}</strong> deste lançamento.
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status da Despesa</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus("paid")}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      status === "paid"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    ✓ Já Pago
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("pending")}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      status === "pending"
                        ? "bg-amber-50 border-amber-500 text-amber-800"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    ⏳ A Pagar (Pendente)
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingExpense(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs sm:text-sm rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white text-xs sm:text-sm rounded-xl font-semibold hover:bg-rose-700 transition-colors shadow-xs"
                >
                  {editingExpense ? "Salvar Alterações" : "Salvar Despesa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
