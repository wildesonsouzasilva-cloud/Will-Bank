"use client";

import React, { useState } from "react";
import { FamilyMember, Expense, Income } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { Users, Plus, Shield, Award } from "lucide-react";

interface FamilyMembersManagerProps {
  members: FamilyMember[];
  expenses: Expense[];
  incomes: Income[];
  onAddMember: (member: FamilyMember) => void;
}

export default function FamilyMembersManager({
  members,
  expenses,
  incomes,
  onAddMember,
}: FamilyMembersManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Filho(a)");
  const [avatar, setAvatar] = useState("🧑");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newMember: FamilyMember = {
      id: `m-${Date.now()}`,
      name,
      role,
      avatar,
      color: "#3B82F6",
    };

    onAddMember(newMember);
    setShowModal(false);
    setName("");
  };

  const avatars = ["👨", "👩", "👦", "👧", "👶", "👴", "👵", "🧑"];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Membros da Família</h3>
          <p className="text-xs text-slate-500">Mapeamento de papéis, contribuição de renda e gastos individuais</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Adicionar Membro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {members.map((member) => {
          const memberExpenses = expenses
            .filter((e) => e.memberId === member.id)
            .reduce((acc, e) => acc + e.amount, 0);

          const memberIncomes = incomes
            .filter((i) => i.memberId === member.id)
            .reduce((acc, i) => acc + i.amount, 0);

          return (
            <div key={member.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl shadow-inner">
                    {member.avatar || "👤"}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{member.name}</h4>
                    <span className="text-xs text-slate-500 font-medium">{member.role}</span>
                  </div>
                </div>

                <div className="mt-5 space-y-2 pt-4 border-t border-slate-100 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Renda Contribuída:</span>
                    <span className="font-semibold text-emerald-600">+{formatCurrency(memberIncomes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gastos Registrados:</span>
                    <span className="font-semibold text-rose-600">-{formatCurrency(memberExpenses)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-400">Status</span>
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-medium">Ativo</span>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Adicionar Membro Familiar</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Papel / Função</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pai / Mãe / Filho / Dependente"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Avatar / Emoji</label>
                <div className="flex gap-2 flex-wrap">
                  {avatars.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setAvatar(av)}
                      className={`text-xl p-2 rounded-xl border ${
                        avatar === av ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {av}
                    </button>
                  ))}
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
                  className="px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                >
                  Salvar Membro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
