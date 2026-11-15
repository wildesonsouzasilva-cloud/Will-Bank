"use client";

import React, { useState } from "react";
import { Income, FamilyMember } from "@/lib/types";
import { formatCurrency, formatDate, formatMonthYearPt, getYearMonthKey } from "@/lib/utils";
import { Plus, Trash2, Pencil } from "lucide-react";

interface IncomeTableProps {
  incomes: Income[];
  familyMembers: FamilyMember[];
  referenceMonth?: string;
  limitRows?: number;
  onAddIncome: (income: Income) => void;
  onEditIncome?: (income: Income) => void;
  onDeleteIncome: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

export default function IncomeTable({
  incomes,
  familyMembers,
  referenceMonth,
  limitRows,
  onAddIncome,
  onEditIncome,
  onDeleteIncome,
  onToggleStatus,
}: IncomeTableProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [monthScope, setMonthScope] = useState<"selected" | "all">("selected");
  const [statusFilter, setStatusFilter] = useState<"all" | "received" | "pending">("all");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Salário");
  const [memberId, setMemberId] = useState(familyMembers[0]?.id || "");
  const [date, setDate] = useState(`${referenceMonth || "2026-11"}-05`);
  const [isRecurring, setIsRecurring] = useState(true);
  const [status, setStatus] = useState<"received" | "pending">("received");

  const openCreateModal = () => {
    setEditingIncome(null);
    setDescription("");
    setAmount("");
    setCategory("Salário");
    setMemberId(familyMembers[0]?.id || "");
    setDate(`${referenceMonth || "2026-11"}-05`);
    setIsRecurring(true);
    setStatus("received");
    setShowModal(true);
  };

  const openEditModal = (income: Income) => {
    setEditingIncome(income);
    setDescription(income.description);
    setAmount(String(income.amount));
    setCategory(income.category || "Salário");
    setMemberId(income.memberId || familyMembers[0]?.id || "");
    setDate(income.date || `${referenceMonth || "2026-11"}-05`);
    setIsRecurring(Boolean(income.isRecurring));
    setStatus(income.status === "pending" ? "pending" : "received");
    setShowModal(true);
  };

  const validMemberId = familyMembers.some((m) => m.id === memberId)
    ? memberId
    : familyMembers[0]?.id || "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!description.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;

    if (editingIncome && onEditIncome) {
      const updatedIncome: Income = {
        ...editingIncome,
        description: description.trim(),
        amount: parsedAmount,
        date,
        category,
        memberId: validMemberId,
        isRecurring,
        status,
      };
      onEditIncome(updatedIncome);
    } else {
      const newIncome: Income = {
        id: `inc-${Date.now()}`,
        description: description.trim(),
        amount: parsedAmount,
        date,
        category,
        memberId: validMemberId,
        isRecurring,
        status,
      };
      onAddIncome(newIncome);
    }

    setShowModal(false);
    setEditingIncome(null);
    setDescription("");
    setAmount("");
    setStatus("received");
  };

  const categories = ["Salário", "Investimentos", "Freelance", "Aluguel Recebido", "Bônus", "Outros"];

  const getDisplayedDate = (income: Income) => {
    const isProjectedRecurring =
      referenceMonth &&
      monthScope === "selected" &&
      income.isRecurring &&
      getYearMonthKey(income.date) < referenceMonth;
    return isProjectedRecurring
      ? `${referenceMonth}-${(income.date || "2026-11-05").slice(8, 10) || "05"}`
      : income.date;
  };

  const monthScopedIncomes =
    referenceMonth && monthScope === "selected"
      ? incomes.filter((inc) => {
          const incMonth = getYearMonthKey(inc.date);
          if (incMonth === referenceMonth) return true;
          return Boolean(inc.isRecurring && incMonth && incMonth <= referenceMonth);
        })
      : incomes;

  const receivedTotal = monthScopedIncomes
    .filter((inc) => inc.status !== "pending")
    .reduce((acc, inc) => acc + inc.amount, 0);
  const pendingTotal = monthScopedIncomes
    .filter((inc) => inc.status === "pending")
    .reduce((acc, inc) => acc + inc.amount, 0);
  const totalScopedIncome = receivedTotal + pendingTotal;

  // Organizar entradas de acordo com o recebimento:
  // 1) Já recebidas primeiro, seguidas pelas A Receber
  // 2) Dentro de cada grupo, em ordem cronológica da data de recebimento
  const filteredIncomes = monthScopedIncomes
    .filter((inc) => {
      const normalizedStatus = inc.status === "pending" ? "pending" : "received";
      if (statusFilter === "received") return normalizedStatus === "received";
      if (statusFilter === "pending") return normalizedStatus === "pending";
      return true;
    })
    .slice()
    .sort((a, b) => {
      const aPending = a.status === "pending" ? 1 : 0;
      const bPending = b.status === "pending" ? 1 : 0;
      if (aPending !== bPending) return aPending - bPending;
      return (getDisplayedDate(a) || "").localeCompare(getDisplayedDate(b) || "");
    });

  const visibleIncomes = limitRows ? filteredIncomes.slice(0, limitRows) : filteredIncomes;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Controle de Receitas</h3>
            <p className="text-xs text-slate-500">
              {referenceMonth && monthScope === "selected"
                ? `Entradas ordenadas por recebimento em ${formatMonthYearPt(referenceMonth)}`
                : "Fontes de renda ordenadas por recebimento"}
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Nova Receita
            </button>
          </div>
        </div>

        {/* Barra de Filtro e Totais Recebido / A Receber */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
            {[
              { id: "all", label: "Todas" },
              { id: "received", label: "Recebido" },
              { id: "pending", label: "A Receber" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatusFilter(item.id as typeof statusFilter)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  statusFilter === item.id
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
              Recebido: {formatCurrency(receivedTotal)}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-semibold">
              A Receber: {formatCurrency(pendingTotal)}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold">
              Total: {formatCurrency(totalScopedIncome)}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
            <tr>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Descrição</th>
              <th className="px-6 py-3.5">Categoria</th>
              <th className="px-6 py-3.5">Membro</th>
              <th className="px-6 py-3.5">Recorrente</th>
              <th className="px-6 py-3.5">Recebimento</th>
              <th className="px-6 py-3.5 text-right">Valor</th>
              <th className="px-6 py-3.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleIncomes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-xs sm:text-sm text-slate-400">
                  {referenceMonth && monthScope === "selected"
                    ? `Nenhuma receita encontrada em ${formatMonthYearPt(referenceMonth)}.`
                    : "Nenhuma receita cadastrada."}
                </td>
              </tr>
            ) : (
              visibleIncomes.map((income) => {
                const member = familyMembers.find((m) => m.id === income.memberId);
                const isProjectedRecurring =
                  referenceMonth &&
                  monthScope === "selected" &&
                  income.isRecurring &&
                  getYearMonthKey(income.date) < referenceMonth;
                const displayedDate = getDisplayedDate(income);
                const isReceived = income.status !== "pending";

                return (
                  <tr key={income.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      {onToggleStatus ? (
                        <button
                          type="button"
                          onClick={() => onToggleStatus(income.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                            isReceived
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          }`}
                          title="Clique para alternar entre Recebido e A Receber"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isReceived ? "bg-emerald-600" : "bg-amber-600"
                            }`}
                          />
                          {isReceived ? "Recebido" : "A Receber"}
                        </button>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                            isReceived
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isReceived ? "bg-emerald-600" : "bg-amber-600"
                            }`}
                          />
                          {isReceived ? "Recebido" : "A Receber"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          isReceived ? "bg-emerald-500" : "bg-amber-500"
                        }`}
                      />
                      {income.description}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        {income.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                        <span>{member?.avatar || "👤"}</span>
                        {member?.name || "Geral"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {income.isRecurring ? (
                        <span className="text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-md">
                          {isProjectedRecurring
                            ? `Recorrente (desde ${formatMonthYearPt(income.date, true)})`
                            : "Sim (Mensal)"}
                        </span>
                      ) : (
                        <span className="text-slate-400">Eventual</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {formatDate(displayedDate)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${
                        isReceived ? "text-emerald-600" : "text-amber-700"
                      }`}
                    >
                      +{formatCurrency(income.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        {onEditIncome && (
                          <button
                            type="button"
                            onClick={() => openEditModal(income)}
                            className="text-slate-400 hover:text-blue-600 p-1 rounded-md transition-colors"
                            title="Editar receita"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteIncome(income.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Nova / Editar Receita */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingIncome ? "Editar Receita" : "Adicionar Nova Receita"}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Salário, Rendimentos, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Data de Recebimento</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Situação da Entrada
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus("received")}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      status === "received"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    ✓ Recebido
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
                    ⏳ A Receber
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="recurring" className="text-xs font-medium text-slate-700">
                  Receita Recorrente Mensal
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingIncome(null);
                  }}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs sm:text-sm rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white text-xs sm:text-sm rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  {editingIncome ? "Salvar Alterações" : "Salvar Receita"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
