"use client";

import React, { useState } from "react";
import { CreditCard } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { CreditCard as CardIcon, Plus, Calendar, ShieldCheck, Trash2 } from "lucide-react";

interface CreditCardsManagerProps {
  cards: CreditCard[];
  onAddCard: (card: CreditCard) => void;
  onDeleteCard: (id: string) => void;
}

export default function CreditCardsManager({ cards, onAddCard, onDeleteCard }: CreditCardsManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [holder, setHolder] = useState("");
  const [last4, setLast4] = useState("");
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState("5");
  const [dueDay, setDueDay] = useState("12");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !limit) return;

    const newCard: CreditCard = {
      id: `card-${Date.now()}`,
      name,
      holder,
      last4: last4 || "0000",
      color: "#3B82F6",
      limit: parseFloat(limit),
      used: 0,
      closingDay: parseInt(closingDay),
      dueDay: parseInt(dueDay),
    };

    onAddCard(newCard);
    setShowModal(false);
    setName("");
    setHolder("");
    setLimit("");
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Cartões de Crédito da Família</h3>
          <p className="text-xs text-slate-500">Acompanhe limites consolidados, datas de fechamento e faturas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Adicionar Cartão
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const usedPercentage = (card.used / (card.limit || 1)) * 100;
          const available = card.limit - card.used;

          return (
            <div
              key={card.id}
              className="bg-slate-900 text-white p-6 rounded-2xl shadow-md relative overflow-hidden flex flex-col justify-between min-h-[220px]"
            >
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-white/5 rounded-full blur-xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    {card.holder}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onDeleteCard(card.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
                      title="Excluir Cartão de Crédito"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <CardIcon className="w-6 h-6 text-slate-300" />
                  </div>
                </div>
                <h4 className="text-lg font-bold tracking-tight">{card.name}</h4>
                <p className="text-xs text-slate-400 tracking-widest mt-1">•••• •••• •••• {card.last4}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">Fatura Atual: <strong>{formatCurrency(card.used)}</strong></span>
                    <span className="text-slate-400">Limite: <strong>{formatCurrency(card.limit)}</strong></span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        usedPercentage > 80 ? "bg-rose-500" : "bg-indigo-400"
                      }`}
                      style={{ width: `${Math.min(usedPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Fecha dia {card.closingDay}</span>
                  <span>Vence dia {card.dueDay}</span>
                  <span className="text-emerald-400 font-medium">Livre: {formatCurrency(available)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Novo Cartão de Crédito</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nome do Cartão / Banco</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nubank, C6 Bank, Itaú..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Titular</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos"
                    value={holder}
                    onChange={(e) => setHolder(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Últimos 4 dígitos</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="1234"
                    value={last4}
                    onChange={(e) => setLast4(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Limite Total (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="10000,00"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Dia do Fechamento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={closingDay}
                    onChange={(e) => setClosingDay(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Dia do Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  Salvar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
