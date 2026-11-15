"use client";

import React, { useState } from "react";
import { Expense, FamilyMember, CreditCard, DebtRecord } from "@/lib/types";
import { formatCurrency, formatDate, addMonthsIso, getYearMonthKey, formatMonthYearPt } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard as CardIcon,
  CalendarClock,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";

interface PendingDebtsManagerProps {
  expenses: Expense[];
  creditCards: CreditCard[];
  familyMembers: FamilyMember[];
  debts: DebtRecord[];
  referenceMonth?: string;
  onToggleStatus: (id: string) => void;
  onPayCreditCardInvoice?: (cardId: string) => void;
  onAddDebt: (debt: DebtRecord) => void;
  onPayDebtInstallment: (id: string) => void;
  onSettleDebt: (id: string) => void;
  onDeleteDebt: (id: string) => void;
}

const DEBT_CATEGORIES: DebtRecord["category"][] = [
  "Empréstimo",
  "Fatura de Cartão Atrasada",
  "Financiamento",
  "Boleto / Conta Atrasada",
  "Compra Parcelada",
  "Acordo / Renegociação",
  "Outro",
];

export default function PendingDebtsManager({
  expenses,
  creditCards,
  familyMembers,
  debts,
  referenceMonth,
  onToggleStatus,
  onPayCreditCardInvoice,
  onAddDebt,
  onPayDebtInstallment,
  onSettleDebt,
  onDeleteDebt,
}: PendingDebtsManagerProps) {
  const [filterType, setFilterType] = useState<"all" | "overdue" | "installments" | "bills" | "cards">("all");
  const [monthScope, setMonthScope] = useState<"selected" | "all">("selected");
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);

  // Modal state for registering overdue or installment debts
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [debtMode, setDebtMode] = useState<"overdue" | "installment">("overdue");
  const [title, setTitle] = useState("");
  const [creditor, setCreditor] = useState("");
  const [category, setCategory] = useState<DebtRecord["category"]>("Empréstimo");
  const [totalAmount, setTotalAmount] = useState("");
  const [originalAmount, setOriginalAmount] = useState("");
  const [totalInstallments, setTotalInstallments] = useState("12");
  const [paidInstallments, setPaidInstallments] = useState("0");
  const [installmentAmount, setInstallmentAmount] = useState("");
  const [dueDate, setDueDate] = useState(`${referenceMonth || "2026-11"}-14`);
  const [daysOverdue, setDaysOverdue] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [memberId, setMemberId] = useState(familyMembers[0]?.id || "");
  const [notes, setNotes] = useState("");

  const openModalWithMode = (mode: "overdue" | "installment") => {
    setDebtMode(mode);
    setCategory(mode === "overdue" ? "Empréstimo" : "Compra Parcelada");
    setTotalInstallments(mode === "overdue" ? "1" : "12");
    setPaidInstallments("0");
    setDueDate(`${referenceMonth || "2026-11"}-15`);
    setMemberId(familyMembers[0]?.id || "");
    setShowDebtModal(true);
  };

  const handleTotalChange = (val: string) => {
    setTotalAmount(val);
    const numTotal = parseFloat(val);
    const numInst = parseInt(totalInstallments, 10);
    if (!isNaN(numTotal) && Number.isFinite(numInst) && numInst > 0) {
      setInstallmentAmount((numTotal / numInst).toFixed(2));
    }
  };

  const handleInstallmentsCountChange = (val: string) => {
    setTotalInstallments(val);
    const numInst = parseInt(val, 10);
    if (!Number.isFinite(numInst) || numInst <= 0) return;
    const numTotal = parseFloat(totalAmount);
    const numPerInst = parseFloat(installmentAmount);
    if (!isNaN(numTotal) && numTotal > 0) {
      setInstallmentAmount((numTotal / numInst).toFixed(2));
    } else if (!isNaN(numPerInst) && numPerInst > 0) {
      setTotalAmount((numPerInst * numInst).toFixed(2));
    }
  };

  const handleInstallmentAmountChange = (val: string) => {
    setInstallmentAmount(val);
    const numPerInst = parseFloat(val);
    const numInst = parseInt(totalInstallments, 10);
    if (!isNaN(numPerInst) && Number.isFinite(numInst) && numInst > 0) {
      setTotalAmount((numPerInst * numInst).toFixed(2));
    }
  };

  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTotal = parseFloat(totalAmount) || 0;
    if (!title.trim() || !creditor.trim() || parsedTotal <= 0) return;

    const instCount = debtMode === "installment" ? Math.max(2, parseInt(totalInstallments) || 2) : Math.max(1, parseInt(totalInstallments) || 1);
    const paidCount = Math.min(instCount - 1, Math.max(0, parseInt(paidInstallments) || 0));
    const perInst = parseFloat(installmentAmount) || parsedTotal / instCount;

    const newDebt: DebtRecord = {
      id: `debt-${Date.now()}`,
      title: title.trim(),
      creditor: creditor.trim(),
      debtMode,
      category,
      totalAmount: parsedTotal,
      originalAmount: originalAmount ? parseFloat(originalAmount) : undefined,
      installmentAmount: perInst,
      totalInstallments: instCount,
      paidInstallments: paidCount,
      dueDate,
      daysOverdue: debtMode === "overdue" && daysOverdue ? parseInt(daysOverdue) : undefined,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      memberId: memberId || familyMembers[0]?.id || "",
      status: debtMode === "overdue" ? "overdue" : "active",
      notes: notes.trim() || undefined,
    };

    onAddDebt(newDebt);
    setShowDebtModal(false);
    setTitle("");
    setCreditor("");
    setTotalAmount("");
    setOriginalAmount("");
    setInstallmentAmount("");
    setDaysOverdue("");
    setInterestRate("");
    setNotes("");
  };

  const buildDebtSchedule = (debt: DebtRecord) => {
    const items: Array<{
      installmentNumber: number;
      dueDate: string;
      yearMonth: string;
      amount: number;
      isPaid: boolean;
      isNext: boolean;
    }> = [];
    for (let k = 1; k <= debt.totalInstallments; k++) {
      const offsetFromNext = k - (debt.paidInstallments + 1);
      const itemDueDate = addMonthsIso(debt.dueDate, offsetFromNext);
      items.push({
        installmentNumber: k,
        dueDate: itemDueDate,
        yearMonth: getYearMonthKey(itemDueDate),
        amount: debt.installmentAmount,
        isPaid: k <= debt.paidInstallments,
        isNext: k === debt.paidInstallments + 1,
      });
    }
    return items;
  };

  // Pendências de despesas normais (respeitando mês de referência quando selecionado)
  const allPendingExpenses = expenses.filter((e) => e.status === "pending");
  const pendingExpenses =
    referenceMonth && monthScope === "selected"
      ? allPendingExpenses.filter((e) => getYearMonthKey(e.date) === referenceMonth)
      : allPendingExpenses;

  const cardsWithBalance = creditCards.filter((c) => c.used > 0);

  // Dívidas cadastradas (endividamento atrasado e parcelamentos)
  const allOverdueDebts = debts.filter(
    (d) =>
      d.debtMode === "overdue" &&
      d.status !== "paid" &&
      (selectedMember === "all" || d.memberId === selectedMember)
  );

  const overdueDebts =
    referenceMonth && monthScope === "selected"
      ? allOverdueDebts.filter((d) => {
          const ym = getYearMonthKey(d.dueDate);
          return !ym || ym <= referenceMonth;
        })
      : allOverdueDebts;

  const allInstallmentDebts = debts.filter(
    (d) =>
      d.debtMode === "installment" &&
      d.status !== "paid" &&
      (selectedMember === "all" || d.memberId === selectedMember)
  );

  const installmentDebts =
    referenceMonth && monthScope === "selected"
      ? allInstallmentDebts.filter((d) =>
          buildDebtSchedule(d).some((item) => !item.isPaid && item.yearMonth === referenceMonth)
        )
      : allInstallmentDebts;

  const paidDebts = debts.filter(
    (d) => d.status === "paid" && (selectedMember === "all" || d.memberId === selectedMember)
  );

  const getRemainingDebtAmount = (d: DebtRecord) => {
    if (d.status === "paid") return 0;
    if (d.totalInstallments <= 1) return d.totalAmount;
    const remainingInstallments = Math.max(0, d.totalInstallments - d.paidInstallments);
    return remainingInstallments * d.installmentAmount;
  };

  const getDebtMonthInstallment = (d: DebtRecord) => {
    if (!referenceMonth) return null;
    return (
      buildDebtSchedule(d).find((item) => !item.isPaid && item.yearMonth === referenceMonth) || null
    );
  };

  const totalPendingExpenses = pendingExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalCardInvoices = cardsWithBalance.reduce((acc, curr) => acc + curr.used, 0);
  const totalOverdueAmount = overdueDebts.reduce((acc, curr) => acc + getRemainingDebtAmount(curr), 0);
  const totalInstallmentsRemaining =
    referenceMonth && monthScope === "selected"
      ? installmentDebts.reduce((acc, curr) => {
          const item = getDebtMonthInstallment(curr);
          return acc + (item ? item.amount : 0);
        }, 0)
      : installmentDebts.reduce((acc, curr) => acc + getRemainingDebtAmount(curr), 0);

  const totalDebtsToPay =
    totalPendingExpenses + totalCardInvoices + totalOverdueAmount + totalInstallmentsRemaining;

  // Agrupamento mês a mês das parcelas em aberto nos meses seguintes
  const monthlyDistributionMap = new Map<
    string,
    {
      yearMonth: string;
      totalAmount: number;
      items: Array<{
        debtId: string;
        title: string;
        creditor: string;
        installmentNumber: number;
        totalInstallments: number;
        dueDate: string;
        amount: number;
        memberId: string;
      }>;
    }
  >();

  for (const debt of allInstallmentDebts) {
    const schedule = buildDebtSchedule(debt);
    for (const item of schedule) {
      if (item.isPaid || !item.yearMonth) continue;
      if (referenceMonth && monthScope === "selected" && item.yearMonth < referenceMonth) continue;
      const existingGroup = monthlyDistributionMap.get(item.yearMonth) || {
        yearMonth: item.yearMonth,
        totalAmount: 0,
        items: [],
      };
      existingGroup.totalAmount += item.amount;
      existingGroup.items.push({
        debtId: debt.id,
        title: debt.title,
        creditor: debt.creditor,
        installmentNumber: item.installmentNumber,
        totalInstallments: debt.totalInstallments,
        dueDate: item.dueDate,
        amount: item.amount,
        memberId: debt.memberId,
      });
      monthlyDistributionMap.set(item.yearMonth, existingGroup);
    }
  }

  const monthlyDistribution = Array.from(monthlyDistributionMap.values()).sort((a, b) =>
    a.yearMonth.localeCompare(b.yearMonth)
  );

  // Prévia dinâmica no modal de parcelamento
  const modalInstCount = Math.min(360, Math.max(2, parseInt(totalInstallments, 10) || 0));
  const modalPaidCount = Math.min(modalInstCount - 1, Math.max(0, parseInt(paidInstallments, 10) || 0));
  const modalPerInst =
    parseFloat(installmentAmount) ||
    ((parseFloat(totalAmount) || 0) > 0 && modalInstCount > 0 ? (parseFloat(totalAmount) || 0) / modalInstCount : 0);
  const modalPreviewItems =
    debtMode === "installment" && (parseInt(totalInstallments, 10) || 0) >= 2 && modalPerInst > 0
      ? Array.from({ length: modalInstCount - modalPaidCount }, (_, idx) => {
          const installmentNumber = modalPaidCount + idx + 1;
          const itemDate = addMonthsIso(dueDate, idx);
          return {
            installmentNumber,
            dueDate: itemDate,
            label: formatMonthYearPt(itemDate, true),
            amount: modalPerInst,
          };
        })
      : [];

  const filteredExpenses = pendingExpenses.filter((e) => {
    if (selectedMember !== "all" && e.memberId !== selectedMember) return false;
    if (filterType === "cards" && e.paymentMethod !== "credit_card") return false;
    if (filterType === "bills" && e.paymentMethod === "credit_card") return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Ações de Cadastro */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Débitos, Endividamento e Parcelamentos</h3>
              <p className="text-xs text-slate-500">
                Gerencie contas a pagar, dívidas atrasadas (empréstimos, faturas) e compras ou acordos parcelados
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openModalWithMode("overdue")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-rose-700 transition-colors shadow-xs"
            >
              <AlertTriangle className="w-4 h-4" />
              Cadastrar Endividamento (Atrasado)
            </button>
            <button
              onClick={() => openModalWithMode("installment")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Dívida Parcelada
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            {[
              { id: "all", label: "Todos" },
              { id: "overdue", label: "Em Atraso" },
              { id: "installments", label: "Parcelamentos" },
              { id: "cards", label: "Faturas Cartão" },
              { id: "bills", label: "Boletos / PIX" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setFilterType(item.id as typeof filterType)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterType === item.id
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {referenceMonth && (
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setMonthScope("selected")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    monthScope === "selected"
                      ? "bg-white text-indigo-700 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Mês ({formatMonthYearPt(referenceMonth, true)})
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
                  Todos os Meses
                </button>
              </div>
            )}

            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os Membros</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-500 to-rose-600 text-white p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between opacity-90 text-xs font-semibold uppercase tracking-wider">
            <span>
              {referenceMonth && monthScope === "selected"
                ? `A Pagar (${formatMonthYearPt(referenceMonth, true)})`
                : "Passivo Total em Aberto"}
            </span>
            <AlertCircle className="w-5 h-5 text-amber-200" />
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-extrabold tracking-tight">{formatCurrency(totalDebtsToPay)}</h4>
            <p className="text-xs text-amber-100 mt-1">
              {referenceMonth && monthScope === "selected"
                ? `Contas, parcelas e faturas em ${formatMonthYearPt(referenceMonth)}`
                : "Soma geral de tudo que falta quitar"}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Dívidas em Atraso</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(totalOverdueAmount)}</h4>
            <p className="text-xs text-slate-500 mt-1">
              {overdueDebts.length} {overdueDebts.length === 1 ? "endividamento atrasado" : "endividamentos atrasados"}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              {referenceMonth && monthScope === "selected"
                ? `Parcelas (${formatMonthYearPt(referenceMonth, true)})`
                : "Saldo Parcelado"}
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(totalInstallmentsRemaining)}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {installmentDebts.length}{" "}
              {referenceMonth && monthScope === "selected"
                ? "parcelamentos no mês"
                : "parcelamentos ativos"}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faturas & Contas</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(totalCardInvoices + totalPendingExpenses)}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {cardsWithBalance.length} faturas + {pendingExpenses.length} contas
            </p>
          </div>
        </div>
      </div>

      {/* Seção: Endividamento / Dívidas Atrasadas */}
      {(filterType === "all" || filterType === "overdue") && (
        <div className="bg-white rounded-2xl border border-rose-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-rose-100 bg-rose-50/40 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Endividamento & Dívidas Atrasadas
              </h4>
              <p className="text-xs text-slate-500">
                Empréstimos atrasados, faturas vencidas e pendências acumulando juros
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full">
              {overdueDebts.length} em atraso
            </span>
          </div>

          {overdueDebts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              Nenhuma dívida em atraso cadastrada!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
              {overdueDebts.map((debt) => {
                const member = familyMembers.find((m) => m.id === debt.memberId);
                return (
                  <div
                    key={debt.id}
                    className="p-4 rounded-xl border border-rose-200 bg-rose-50/20 flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                            {debt.category}
                          </span>
                          {debt.daysOverdue ? (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              {debt.daysOverdue} dias em atraso
                            </span>
                          ) : null}
                        </div>
                        <h5 className="font-bold text-slate-900 text-base">{debt.title}</h5>
                        <p className="text-xs text-slate-500">
                          Credor: <strong className="text-slate-700">{debt.creditor}</strong> • Venc.: {formatDate(debt.dueDate)}
                        </p>
                      </div>
                      <button
                        onClick={() => onDeleteDebt(debt.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Excluir registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rose-100 text-xs">
                      <div>
                        <span className="text-slate-500 block">Valor Atualizado</span>
                        <span className="text-lg font-extrabold text-rose-600">{formatCurrency(debt.totalAmount)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block">Responsável</span>
                        <span className="font-medium text-slate-800">
                          {member?.avatar || "👤"} {member?.name || "Família"}
                        </span>
                        {debt.interestRate ? (
                          <span className="block text-[11px] text-rose-600">Juros: {debt.interestRate}% a.m.</span>
                        ) : null}
                      </div>
                    </div>

                    {debt.notes && (
                      <p className="text-xs text-slate-500 bg-white p-2 rounded-lg border border-slate-100">
                        {debt.notes}
                      </p>
                    )}

                    <button
                      onClick={() => onSettleDebt(debt.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Quitar Dívida Atrasada
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Seção: Dívidas com Parcelamento */}
      {(filterType === "all" || filterType === "installments") && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Dívidas com Parcelamento
              </h4>
              <p className="text-xs text-slate-500">
                Acompanhe parcela por parcela e dê baixa conforme os pagamentos avançam
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
              {installmentDebts.length} em andamento
            </span>
          </div>

          {installmentDebts.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              {referenceMonth && monthScope === "selected"
                ? `Nenhuma parcela com vencimento em ${formatMonthYearPt(referenceMonth)}.`
                : "Nenhuma dívida parcelada em aberto!"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
              {installmentDebts.map((debt) => {
                const member = familyMembers.find((m) => m.id === debt.memberId);
                const remaining = getRemainingDebtAmount(debt);
                const progress = (debt.paidInstallments / (debt.totalInstallments || 1)) * 100;
                const nextInstallmentNumber = debt.paidInstallments + 1;
                const monthInstallment =
                  monthScope === "selected" ? getDebtMonthInstallment(debt) : null;

                return (
                  <div
                    key={debt.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            {debt.category}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                            Parcela {monthInstallment ? monthInstallment.installmentNumber : nextInstallmentNumber}/{debt.totalInstallments}
                          </span>
                        </div>
                        <h5 className="font-bold text-slate-900 text-base">{debt.title}</h5>
                        <p className="text-xs text-slate-500">
                          Credor: <strong className="text-slate-700">{debt.creditor}</strong> &bull;{" "}
                          {monthInstallment ? "Venc. no mês:" : "Próx. Venc.:"}{" "}
                          {formatDate(monthInstallment ? monthInstallment.dueDate : debt.dueDate)}
                        </p>
                      </div>
                      <button
                        onClick={() => onDeleteDebt(debt.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        title="Excluir parcelamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Valor da Parcela: <strong className="text-slate-900">{formatCurrency(debt.installmentAmount)}</strong>
                        </span>
                        <span className="text-slate-500">
                          Restante: <strong className="text-rose-600">{formatCurrency(remaining)}</strong>
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-indigo-600 transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>
                          {debt.paidInstallments} de {debt.totalInstallments} pagas ({progress.toFixed(0)}%)
                        </span>
                        <span>
                          {member?.avatar || "👤"} {member?.name || "Família"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedScheduleId((prev) => (prev === debt.id ? null : debt.id))
                        }
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          Ver distribuição nos meses ({debt.totalInstallments} parcelas)
                        </span>
                        {expandedScheduleId === debt.id ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {expandedScheduleId === debt.id && (
                        <div className="max-h-44 overflow-y-auto bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                          {buildDebtSchedule(debt).map((item) => (
                            <div
                              key={item.installmentNumber}
                              className={`px-3 py-2 flex items-center justify-between text-[11px] ${
                                item.isNext ? "bg-indigo-50/70 font-semibold" : ""
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-bold ${
                                    item.isPaid
                                      ? "bg-emerald-100 text-emerald-700"
                                      : item.isNext
                                        ? "bg-indigo-600 text-white"
                                        : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {item.installmentNumber}/{debt.totalInstallments}
                                </span>
                                <span className={item.isPaid ? "line-through text-slate-400" : "text-slate-800"}>
                                  {formatMonthYearPt(item.dueDate, true)} &bull; {formatDate(item.dueDate)}
                                </span>
                              </div>
                              <span className={item.isPaid ? "text-emerald-600 font-medium" : "text-slate-900 font-semibold"}>
                                {item.isPaid ? "Paga" : formatCurrency(item.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => onPayDebtInstallment(debt.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Pagar Parcela {nextInstallmentNumber}/{debt.totalInstallments}
                      </button>
                      <button
                        onClick={() => onSettleDebt(debt.id)}
                        className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors"
                      >
                        Quitar Tudo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Seção: Distribuição das Parcelas nos Meses Seguintes */}
      {(filterType === "all" || filterType === "installments") && monthlyDistribution.length > 0 && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-indigo-100 bg-indigo-50/40 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Distribuição das Parcelas nos Meses Seguintes
              </h4>
              <p className="text-xs text-slate-500">
                Visão mês a mês de todas as parcelas futuras em aberto de acordo com a quantidade informada
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full">
              {monthlyDistribution.length} {monthlyDistribution.length === 1 ? "mês comprometido" : "meses comprometidos"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {monthlyDistribution.map((monthGroup) => {
              const isSelectedRef = referenceMonth === monthGroup.yearMonth;
              return (
                <div
                  key={monthGroup.yearMonth}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                    isSelectedRef
                      ? "border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500/30"
                      : "border-slate-200 bg-slate-50/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
                    <div>
                      <span className="text-sm font-bold text-slate-900 block">
                        {formatMonthYearPt(monthGroup.yearMonth)}
                      </span>
                      {isSelectedRef && (
                        <span className="text-[10px] font-semibold text-indigo-700 uppercase tracking-wide">
                          Mês de referência selecionado
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-extrabold text-indigo-700">
                      {formatCurrency(monthGroup.totalAmount)}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {monthGroup.items.map((item) => (
                      <div
                        key={`${item.debtId}-${item.installmentNumber}`}
                        className="flex items-center justify-between gap-2 text-xs bg-white px-2.5 py-1.5 rounded-lg border border-slate-100"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{item.title}</p>
                          <p className="text-[11px] text-slate-500">
                            Parcela {item.installmentNumber}/{item.totalInstallments} &bull; Venc. {formatDate(item.dueDate)}
                          </p>
                        </div>
                        <span className="font-bold text-slate-900 shrink-0">
                          {formatCurrency(item.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Seção: Faturas de Cartão de Crédito a Pagar */}
      {(filterType === "all" || filterType === "cards") && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-base">Faturas de Cartão em Aberto</h4>
              <p className="text-xs text-slate-500">Valores acumulados até o vencimento da fatura</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
              {cardsWithBalance.length} faturas ativas
            </span>
          </div>

          {cardsWithBalance.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              Nenhum cartão com fatura em aberto! Todas as faturas estão zeradas.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
              {cardsWithBalance.map((card) => {
                const usedPercent = ((card.used / (card.limit || 1)) * 100).toFixed(0);

                return (
                  <div
                    key={card.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {card.holder}
                        </span>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                          Vence dia {card.dueDay}
                        </span>
                      </div>
                      <h5 className="font-bold text-slate-900 text-base flex items-center gap-2">
                        <CardIcon className="w-4 h-4 text-indigo-600" />
                        {card.name}
                      </h5>
                      <p className="text-xs text-slate-400">Final •••• {card.last4}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-600">Valor da Fatura:</span>
                        <span className="text-lg font-extrabold text-slate-900">
                          {formatCurrency(card.used)}
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            Number(usedPercent) > 80 ? "bg-rose-500" : "bg-indigo-500"
                          }`}
                          style={{ width: `${Math.min(Number(usedPercent), 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>{usedPercent}% do limite</span>
                        <span>Limite: {formatCurrency(card.limit)}</span>
                      </div>
                    </div>

                    {onPayCreditCardInvoice && (
                      <button
                        onClick={() => onPayCreditCardInvoice(card.id)}
                        className="w-full mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Liquidar Fatura (Zerar)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Seção: Contas e Despesas Individuais Pendentes */}
      {(filterType === "all" || filterType === "bills") && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-900 text-base">Contas Individuais Não Pagas</h4>
              <p className="text-xs text-slate-500">Despesas cadastradas que ainda necessitam de pagamento</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full">
              {filteredExpenses.length} pendentes
            </span>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              Nenhuma conta individual pendente nesta listagem!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Descrição</th>
                    <th className="px-6 py-3.5">Categoria</th>
                    <th className="px-6 py-3.5">Responsável</th>
                    <th className="px-6 py-3.5">Vencimento / Data</th>
                    <th className="px-6 py-3.5 text-right">Valor</th>
                    <th className="px-6 py-3.5 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((expense) => {
                    const member = familyMembers.find((m) => m.id === expense.memberId);
                    const card = creditCards.find((c) => c.id === expense.cardId);

                    return (
                      <tr key={expense.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 text-amber-600" />
                            A Pagar
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {expense.description}
                          {card && (
                            <span className="block text-[11px] text-slate-400 font-normal">
                              Cartão: {card.name} (•••• {card.last4})
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                            <span>{member?.avatar || "👤"}</span>
                            {member?.name || "Família"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">{formatDate(expense.date)}</td>
                        <td className="px-6 py-4 text-right font-bold text-rose-600 text-base">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => onToggleStatus(expense.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium text-xs transition-colors border border-emerald-200"
                            title="Marcar como Pago"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            Marcar Pago
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Histórico de Dívidas Quitadas */}
      {paidDebts.length > 0 && filterType === "all" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Dívidas e Parcelamentos Quitados ({paidDebts.length})
            </h4>
          </div>
          <div className="divide-y divide-slate-100">
            {paidDebts.map((debt) => (
              <div key={debt.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-700 line-through">{debt.title}</span>
                  <span className="text-slate-400 ml-2">({debt.creditor})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-600 font-semibold">{formatCurrency(debt.totalAmount)}</span>
                  <button
                    onClick={() => onDeleteDebt(debt.id)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Remover do histórico"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Endividamento / Dívida Parcelada */}
      {showDebtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl border border-slate-200 my-8">
            <h3 className="text-lg font-bold text-slate-900 mb-3">
              {debtMode === "overdue" ? "Cadastrar Endividamento (Dívida Atrasada)" : "Cadastrar Dívida com Parcelamento"}
            </h3>

            {/* Toggle de Tipo */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setDebtMode("overdue");
                  setTotalInstallments("1");
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  debtMode === "overdue"
                    ? "bg-rose-50 border-rose-500 text-rose-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Dívida Atrasada / Endividamento
              </button>
              <button
                type="button"
                onClick={() => {
                  setDebtMode("installment");
                  if (parseInt(totalInstallments) <= 1) setTotalInstallments("12");
                }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  debtMode === "installment"
                    ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                Dívida com Parcelamento
              </button>
            </div>

            <form onSubmit={handleCreateDebt} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição da Dívida</label>
                <input
                  type="text"
                  required
                  placeholder={
                    debtMode === "overdue"
                      ? "Ex: Fatura Nubank Atrasada, Empréstimo Santander..."
                      : "Ex: Acordo Cartão, Financiamento Moto, Parcelamento..."
                  }
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Credor / Banco / Loja</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Itaú, Nubank, Loja..."
                    value={creditor}
                    onChange={(e) => setCreditor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo / Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DebtRecord["category"])}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {DEBT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {debtMode === "overdue" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Valor Atualizado (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="0,00"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Valor Original (Opcional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={originalAmount}
                        onChange={(e) => setOriginalAmount(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Vencimento Orig.</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Dias em Atraso</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="Ex: 45"
                        value={daysOverdue}
                        onChange={(e) => setDaysOverdue(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Juros (% a.m.)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Ex: 8.5"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Valor Total (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="Ex: 3600,00"
                        value={totalAmount}
                        onChange={(e) => handleTotalChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Valor da Parcela (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="Ex: 300,00"
                        value={installmentAmount}
                        onChange={(e) => handleInstallmentAmountChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Qtd. Parcelas (Manual)
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="360"
                        required
                        placeholder="Ex: 12"
                        value={totalInstallments}
                        onChange={(e) => handleInstallmentsCountChange(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Já Pagas</label>
                      <input
                        type="number"
                        min="0"
                        max={Math.max(0, (parseInt(totalInstallments, 10) || 2) - 1)}
                        value={paidInstallments}
                        onChange={(e) => setPaidInstallments(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">1º / Próx. Venc.</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {modalPreviewItems.length > 0 && (
                    <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-indigo-800">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Distribuição nos meses seguintes ({modalPreviewItems.length}x):
                        </span>
                        <span>
                          {modalPreviewItems[0].label} até{" "}
                          {modalPreviewItems[modalPreviewItems.length - 1].label}
                        </span>
                      </div>
                      <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5">
                        {modalPreviewItems.map((item) => (
                          <span
                            key={item.installmentNumber}
                            className="text-[11px] px-2 py-0.5 rounded-lg bg-white border border-indigo-200 text-slate-700 font-medium"
                          >
                            {item.installmentNumber}/{modalInstCount} &bull; {item.label}:{" "}
                            <strong className="text-indigo-700">{formatCurrency(item.amount)}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Membro Responsável</label>
                  <select
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {familyMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Observações (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Acordo feito em 10x..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDebtModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs sm:text-sm rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-white text-xs sm:text-sm rounded-xl font-semibold transition-colors shadow-xs ${
                    debtMode === "overdue" ? "bg-rose-600 hover:bg-rose-700" : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {debtMode === "overdue" ? "Salvar Endividamento" : "Salvar Parcelamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
