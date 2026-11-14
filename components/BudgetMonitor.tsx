"use client";

import React, { useState } from "react";
import { BudgetCategory } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Plus, Edit2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface BudgetMonitorProps {
  budgets: BudgetCategory[];
  onUpdateBudget: (budgets: BudgetCategory[]) => void;
}

export default function BudgetMonitor({ budgets, onUpdateBudget }: BudgetMonitorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAllocated, setNewAllocated] = useState("");

  const handleSave = (id: string) => {
    if (!newAllocated) return;
    const updated = budgets.map((b) =>
      b.id === id ? { ...b, allocated: parseFloat(newAllocated) } : b
    );
    onUpdateBudget(updated);
    setEditingId(null);
    setNewAllocated("");
  };

  const totalAllocated = budgets.reduce((acc, b) => acc + b.allocated, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Monitoramento de Tetos Orçamentários</h3>
          <p className="text-xs text-slate-500">Defina limites por categoria e evite surpresas no final do mês</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium block">Total Orçado</span>
            <span className="text-base font-bold text-slate-900">{formatCurrency(totalAllocated)}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium block">Total Consumido</span>
            <span className={`text-base font-bold ${totalSpent > totalAllocated ? "text-rose-600" : "text-emerald-600"}`}>
              {formatCurrency(totalSpent)}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {budgets.map((b) => {
          const percentage = (b.spent / (b.allocated || 1)) * 100;
          const isOver = b.spent > b.allocated;
          const isWarning = percentage >= 80 && !isOver;

          return (
            <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                  {b.category}
                </span>
                <button
                  onClick={() => {
                    setEditingId(b.id);
                    setNewAllocated(b.allocated.toString());
                  }}
                  className="text-slate-400 hover:text-blue-600 p-1 transition-colors"
                  title="Editar limite"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-500">Gasto: <strong className="text-slate-800">{formatCurrency(b.spent)}</strong></span>
                  <span className="text-slate-500">Limite: <strong className="text-slate-800">{formatCurrency(b.allocated)}</strong></span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      isOver ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="font-semibold text-slate-700">{percentage.toFixed(0)}% usado</span>
                  {isOver ? (
                    <span className="text-rose-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Estourou +{formatCurrency(b.spent - b.allocated)}
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Resta {formatCurrency(b.allocated - b.spent)}
                    </span>
                  )}
                </div>
              </div>

              {editingId === b.id && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <input
                    type="number"
                    value={newAllocated}
                    onChange={(e) => setNewAllocated(e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Novo valor"
                  />
                  <button
                    onClick={() => handleSave(b.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    X
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
