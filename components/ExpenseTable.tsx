"use client";

import React, { useState } from "react";
import { Expense, FamilyMember, CreditCard } from "@/lib/types";
import { formatCurrency, formatDate, addMonthsIso, formatMonthYearPt } from "@/lib/utils";
import { Plus, Trash2, CreditCard as CardIcon, DollarSign, Tag, Calendar, User } from "lucide-react";

interface ExpenseTableProps {
  expenses: Expense[];
  familyMembers: FamilyMember[];
  creditCards: CreditCard[];
  budgetCategories?: string[];
  onAddExpense: (expense: Expense) => void;
  onAddExpenses?: (expenses: Expense[]) => void;
  onDeleteExpense: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

export default function ExpenseTable({
  expenses,
  familyMembers,
  creditCards,
  budgetCategories = [],
  onAddExpense,
  onAddExpenses,
  onDeleteExpense,
  onToggleStatus,
}: ExpenseTableProps) {
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Alimentação");
  const [memberId, setMemberId] = useState(familyMembers[0]?.id || "");
  const [date, setDate] = useState("2026-11-14");
  const [paymentMethod, setPaymentMethod] = useState<Expense["paymentMethod"]>("pix");
  const [cardId, setCardId] = useState(creditCards[0]?.id || "");
  const [status, setStatus] = useState<Expense["status"]>("paid");
  const [isInstallment, setIsInstallment] = useState(false);
  const [installments, setInstallments] = useState("2");

  const validMemberId = familyMembers.some((m) => m.id === memberId)
    ? memberId
    : familyMembers[0]?.id || "";
  const validCardId = creditCards.some((c) => c.id === cardId)
    ? cardId
    : creditCards[0]?.id || "";

  const parsedTotalAmount = parseFloat(amount) || 0;
  const parsedInstallments = isInstallment
    ? Math.min(120, Math.max(2, parseInt(installments, 10) || 2))
    : 1;
  const installmentValue = parsedTotalAmount > 0 ? parsedTotalAmount / parsedInstallments : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || parsedTotalAmount <= 0) return;

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
          date: addMonthsIso(date, idx),
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
        date,
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

    setShowModal(false);
    setDescription("");
    setAmount("");
    setStatus("paid");
    setIsInstallment(false);
    setInstallments("2");
  };

  const defaultCategories = ["Moradia", "Alimentação", "Educação", "Saúde", "Transporte", "Lazer", "Outros"];
  const categories = Array.from(new Set([...budgetCategories, ...defaultCategories]));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Controle de Despesas</h3>
          <p className="text-xs text-slate-500">Histórico de saídas e pagamentos da família</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-rose-700 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Nova Despesa
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
            <tr>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Descrição</th>
              <th className="px-6 py-3.5">Categoria</th>
              <th className="px-6 py-3.5">Membro</th>
              <th className="px-6 py-3.5">Forma / Cartão</th>
              <th className="px-6 py-3.5">Data</th>
              <th className="px-6 py-3.5 text-right">Valor</th>
              <th className="px-6 py-3.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((expense) => {
              const member = familyMembers.find((m) => m.id === expense.memberId);
              const card = creditCards.find((c) => c.id === expense.cardId);

              return (
                <tr key={expense.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4">
                    {onToggleStatus ? (
                      <button
                        onClick={() => onToggleStatus(expense.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                          expense.status === "paid"
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        }`}
                        title="Clique para alternar entre Pago e A Pagar"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${expense.status === "paid" ? "bg-emerald-600" : "bg-amber-600"}`} />
                        {expense.status === "paid" ? "Pago" : "A Pagar"}
                      </button>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        expense.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-100 text-amber-800"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${expense.status === "paid" ? "bg-emerald-600" : "bg-amber-600"}`} />
                        {expense.status === "paid" ? "Pago" : "A Pagar"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span>{expense.description}</span>
                    {expense.installments && expense.installments > 1 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        {expense.currentInstallment || 1}/{expense.installments}x
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
                      {member?.name || "Geral"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">
                    {expense.paymentMethod === "credit_card" ? (
                      <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                        <CardIcon className="w-3.5 h-3.5" />
                        {card ? `${card.name} (•••• ${card.last4})` : "Cartão"}
                      </span>
                    ) : expense.paymentMethod === "pix" ? (
                      <span className="text-emerald-600 font-medium">PIX</span>
                    ) : (
                      <span className="capitalize">{expense.paymentMethod}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{formatDate(expense.date)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-rose-600">
                    -{formatCurrency(expense.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onDeleteExpense(expense.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Nova Despesa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Adicionar Nova Despesa</h3>
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Data</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
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
                  onChange={(e) => setPaymentMethod(e.target.value as Expense["paymentMethod"])}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="pix">PIX / Transferência</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="debit">Cartão de Débito</option>
                  <option value="cash">Dinheiro em Espécie</option>
                </select>
              </div>

              {paymentMethod === "credit_card" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Selecione o Cartão</label>
                  <select
                    value={validCardId}
                    onChange={(e) => setCardId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {creditCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (•••• {c.last4})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                        <strong>{formatMonthYearPt(date, true)}</strong> e{" "}
                        <strong>
                          {formatMonthYearPt(addMonthsIso(date, parsedInstallments - 1), true)}
                        </strong>
                        .
                      </p>
                    )}
                  </div>
                )}
              </div>

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
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs sm:text-sm rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 text-white text-xs sm:text-sm rounded-xl font-semibold hover:bg-rose-700 transition-colors shadow-xs"
                >
                  Salvar Despesa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
