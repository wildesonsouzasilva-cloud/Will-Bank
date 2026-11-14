"use client";

import React, { useState } from "react";
import { Income, FamilyMember } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

interface IncomeTableProps {
  incomes: Income[];
  familyMembers: FamilyMember[];
  onAddIncome: (income: Income) => void;
  onDeleteIncome: (id: string) => void;
}

export default function IncomeTable({
  incomes,
  familyMembers,
  onAddIncome,
  onDeleteIncome,
}: IncomeTableProps) {
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Salário");
  const [memberId, setMemberId] = useState(familyMembers[0]?.id || "");
  const [date, setDate] = useState("2026-11-14");
  const [isRecurring, setIsRecurring] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;

    const newIncome: Income = {
      id: `inc-${Date.now()}`,
      description,
      amount: parseFloat(amount),
      date,
      category,
      memberId,
      isRecurring,
    };

    onAddIncome(newIncome);
    setShowModal(false);
    setDescription("");
    setAmount("");
  };

  const categories = ["Salário", "Investimentos", "Freelance", "Aluguel Recebido", "Bônus", "Outros"];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Controle de Receitas</h3>
          <p className="text-xs text-slate-500">Fontes de renda e entradas da família</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Nova Receita
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-100">
            <tr>
              <th className="px-6 py-3.5">Descrição</th>
              <th className="px-6 py-3.5">Categoria</th>
              <th className="px-6 py-3.5">Membro</th>
              <th className="px-6 py-3.5">Recorrente</th>
              <th className="px-6 py-3.5">Data</th>
              <th className="px-6 py-3.5 text-right">Valor</th>
              <th className="px-6 py-3.5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {incomes.map((income) => {
              const member = familyMembers.find((m) => m.id === income.memberId);

              return (
                <tr key={income.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
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
                      <span className="text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-md">Sim (Mensal)</span>
                    ) : (
                      <span className="text-slate-400">Eventual</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{formatDate(income.date)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                    +{formatCurrency(income.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => onDeleteIncome(income.id)}
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

      {/* Modal Nova Receita */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Adicionar Nova Receita</h3>
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Data</label>
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
                    value={memberId}
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

              <div className="flex items-center gap-2 pt-2">
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

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs sm:text-sm rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white text-xs sm:text-sm rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  Salvar Receita
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
