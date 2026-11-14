"use client";

import React, { useState } from "react";
import { FinancialGoal } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Target, Plus, Trophy, Edit2, Trash2 } from "lucide-react";

interface GoalsManagerProps {
  goals: FinancialGoal[];
  onAddGoal: (goal: FinancialGoal) => void;
  onUpdateGoal: (goals: FinancialGoal[]) => void;
}

const GOAL_CATEGORIES = [
  { value: "Reserva", label: "Reserva / Segurança" },
  { value: "Segurança", label: "Segurança" },
  { value: "Viagem", label: "Viagem & Férias" },
  { value: "Lazer", label: "Lazer" },
  { value: "Bens", label: "Veículo / Imóvel / Bens" },
  { value: "Educação", label: "Educação Filhos" },
  { value: "Aposentadoria", label: "Aposentadoria" },
];

export default function GoalsManager({ goals, onAddGoal, onUpdateGoal }: GoalsManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [deadline, setDeadline] = useState("2027-12-31");
  const [category, setCategory] = useState("Reserva");

  const openCreateModal = () => {
    setEditingGoalId(null);
    setTitle("");
    setTargetAmount("");
    setCurrentAmount("");
    setDeadline("2027-12-31");
    setCategory("Reserva");
    setShowModal(true);
  };

  const openEditModal = (goal: FinancialGoal) => {
    setEditingGoalId(goal.id);
    setTitle(goal.title);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setDeadline(goal.deadline);
    setCategory(goal.category);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingGoalId(null);
    setTitle("");
    setTargetAmount("");
    setCurrentAmount("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetAmount) return;

    const parsedTarget = parseFloat(targetAmount);
    const parsedCurrent = parseFloat(currentAmount || "0");
    if (isNaN(parsedTarget) || parsedTarget <= 0) return;

    if (editingGoalId) {
      const updated = goals.map((g) =>
        g.id === editingGoalId
          ? {
              ...g,
              title: title.trim(),
              targetAmount: parsedTarget,
              currentAmount: isNaN(parsedCurrent) ? 0 : Math.max(0, parsedCurrent),
              deadline,
              category,
            }
          : g
      );
      onUpdateGoal(updated);
    } else {
      const newGoal: FinancialGoal = {
        id: `goal-${Date.now()}`,
        title: title.trim(),
        targetAmount: parsedTarget,
        currentAmount: isNaN(parsedCurrent) ? 0 : Math.max(0, parsedCurrent),
        deadline,
        category,
        color: "#10B981",
      };
      onAddGoal(newGoal);
    }

    closeModal();
  };

  const handleAddContribution = (id: string, value: number) => {
    const updated = goals.map((g) =>
      g.id === id ? { ...g, currentAmount: Math.min(g.currentAmount + value, g.targetAmount) } : g
    );
    onUpdateGoal(updated);
  };

  const handleDeleteGoal = (id: string) => {
    onUpdateGoal(goals.filter((g) => g.id !== id));
    setConfirmDeleteId(null);
  };

  const availableCategories = GOAL_CATEGORIES.some((c) => c.value === category)
    ? GOAL_CATEGORIES
    : [...GOAL_CATEGORIES, { value: category, label: category }];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Metas & Conquistas da Família</h3>
          <p className="text-xs text-slate-500">Planejamento de médio e longo prazo (Reserva, Viagens, Imóveis, Carro)</p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Nova Meta
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-slate-200 shadow-xs text-center text-slate-500 space-y-2">
          <Target className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="text-sm font-medium text-slate-700">Nenhuma meta cadastrada ainda.</p>
          <p className="text-xs text-slate-400">Clique em &quot;Nova Meta&quot; para planejar o próximo objetivo da família.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const percentage = (goal.currentAmount / (goal.targetAmount || 1)) * 100;
            const isCompleted = goal.currentAmount >= goal.targetAmount;

            return (
              <div key={goal.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      {goal.category}
                    </span>

                    <div className="flex items-center gap-1">
                      {isCompleted ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full mr-1">
                          <Trophy className="w-3.5 h-3.5" /> Concluída!
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 mr-1">Até {formatDate(goal.deadline)}</span>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditModal(goal)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar meta"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDeleteId(confirmDeleteId === goal.id ? null : goal.id)
                        }
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Excluir meta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-900 text-base mt-3">{goal.title}</h4>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500">
                        Acumulado: <strong className="text-slate-900">{formatCurrency(goal.currentAmount)}</strong>
                      </span>
                      <span className="text-slate-500">
                        Alvo: <strong className="text-slate-900">{formatCurrency(goal.targetAmount)}</strong>
                      </span>
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

                {confirmDeleteId === goal.id ? (
                  <div className="mt-5 pt-3 border-t border-rose-100 flex items-center justify-between gap-2 text-xs">
                    <span className="text-rose-700 font-semibold">Excluir esta meta?</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors"
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                      >
                        Não
                      </button>
                    </div>
                  </div>
                ) : (
                  !isCompleted && (
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
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingGoalId ? "Editar Meta Financeira" : "Nova Meta Financeira"}
            </h3>
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
                    min="0.01"
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
                    min="0"
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
                    {availableCategories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
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
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs sm:text-sm rounded-xl font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white text-xs sm:text-sm rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
                >
                  {editingGoalId ? "Salvar Alterações" : "Salvar Meta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
