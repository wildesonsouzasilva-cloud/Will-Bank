"use client";

import React, { useState } from "react";
import { FinancialGoal } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Target, Plus, CheckCircle, Trophy } from "lucide-react";

interface GoalsManagerProps {
  goals: FinancialGoal[];
  onAddGoal: (goal: FinancialGoal) => void;
  onUpdateGoal: (goals: FinancialGoal[]) => void;
}

export default function GoalsManager({ goals, onAddGoal, onUpdateGoal }: GoalsManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("2027-12-31");
  const [category, setCategory] = useState("Reserva");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount) return;

    const newGoal: FinancialGoal = {
      id: `goal-${Date.now()}`,
      title,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount || "0"),
      deadline,
      category,
      color: "#10B981",
    };

    onAddGoal(newGoal);
    setShowModal(false);
    setTitle("");
    setTargetAmount("");
    setCurrentAmount("");
  };

  const handleAddContribution = (id: string, value: number) => {
    const updated = goals.map((g) =>
      g.id === id ? { ...g, currentAmount: Math.min(g.currentAmount + value, g.targetAmount) } : g
    );
    onUpdateGoal(updated);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Metas & Conquistas da Família</h3>
          <p className="text-xs text-slate-500">Planejamento de médio e longo prazo (Reserva, Viagens, Imóveis, Carro)</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Nova Meta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const percentage = (goal.currentAmount / (goal.targetAmount || 1)) * 100;
          const isCompleted = goal.currentAmount >= goal.targetAmount;

          return (
            <div key={goal.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                    {goal.category}
                  </span>
                  {isCompleted ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                      <Trophy className="w-3.5 h-3.5" /> Concluída!
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Até {formatDate(goal.deadline)}</span>
                  )}
                </div>

                <h4 className="font-bold text-slate-900 text-base mt-3">{goal.title}</h4>

                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Acumulado: <strong className="text-slate-900">{formatCurrency(goal.currentAmount)}</strong></span>
                    <span className="text-slate-500">Alvo: <strong className="text-slate-900">{formatCurrency(goal.targetAmount)}</strong></span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-slate-500 mt-2">
                    <span className="font-semibold text-emerald-600">{percentage.toFixed(1)}% atingido</span>
                    <span>Falta: {formatCurrency(Math.max(goal.targetAmount - goal.currentAmount, 0))}</span>
                  </div>
                </div>
              </div>

              {!isCompleted && (
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">Aportar:</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAddContribution(goal.id, 200)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-slate-700 font-medium transition-colors"
                    >
                      +R$200
                    </button>
                    <button
                      onClick={() => handleAddContribution(goal.id, 500)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-slate-700 font-medium transition-colors"
                    >
                      +R$500
                    </button>
                    <button
                      onClick={() => handleAddContribution(goal.id, 1000)}
                      className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-slate-700 font-medium transition-colors"
                    >
                      +R$1.000
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Nova Meta Financeira</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Título da Meta</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reforma da Casa, Reserva de Emergência..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Valor Alvo (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="50000,00"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Já Guardado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
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
                    <option value="Reserva">Reserva / Segurança</option>
                    <option value="Viagem">Viagem & Férias</option>
                    <option value="Bens">Veículo / Imóvel</option>
                    <option value="Educação">Educação Filhos</option>
                    <option value="Aposentadoria">Aposentadoria</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Data Limite</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
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
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
