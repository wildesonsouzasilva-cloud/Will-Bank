"use client";

import React, { useState } from "react";
import { Expense, FamilyMember, CreditCard } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  CreditCard as CardIcon, 
  Calendar, 
  Filter, 
  ArrowUpRight, 
  DollarSign, 
  CalendarClock,
  Check
} from "lucide-react";

interface PendingDebtsManagerProps {
  expenses: Expense[];
  creditCards: CreditCard[];
  familyMembers: FamilyMember[];
  onToggleStatus: (id: string) => void;
  onPayCreditCardInvoice?: (cardId: string) => void;
}

export default function PendingDebtsManager({
  expenses,
  creditCards,
  familyMembers,
  onToggleStatus,
  onPayCreditCardInvoice,
}: PendingDebtsManagerProps) {
  const [filterType, setFilterType] = useState<"all" | "bills" | "cards">("all");
  const [selectedMember, setSelectedMember] = useState<string>("all");

  // Pendências de despesas normais (boletos, pix, etc marcados como pendentes)
  const pendingExpenses = expenses.filter((e) => e.status === "pending");

  // Faturas de cartão com saldo utilizado (> 0)
  const cardsWithBalance = creditCards.filter((c) => c.used > 0);

  // Total das contas normais pendentes
  const totalPendingExpenses = pendingExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Total das faturas de cartão em aberto
  const totalCardInvoices = cardsWithBalance.reduce((acc, curr) => acc + curr.used, 0);

  // Total consolidado a pagar
  const totalDebtsToPay = totalPendingExpenses + totalCardInvoices;

  // Filtragem de despesas pendentes
  const filteredExpenses = pendingExpenses.filter((e) => {
    if (selectedMember !== "all" && e.memberId !== selectedMember) return false;
    if (filterType === "cards" && e.paymentMethod !== "credit_card") return false;
    if (filterType === "bills" && e.paymentMethod === "credit_card") return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Métricas de Débitos a Pagar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Débitos e Contas a Pagar</h3>
              <p className="text-xs text-slate-500">
                Acompanhe o que ainda falta quitar este mês entre faturas de cartão e contas pendentes
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterType === "all" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType("bills")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterType === "bills" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Boletos / PIX
            </button>
            <button
              onClick={() => setFilterType("cards")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterType === "cards" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Faturas Cartão
            </button>
          </div>

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

      {/* Cards de Resumo Rápido dos Débitos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total a pagar */}
        <div className="bg-gradient-to-br from-amber-500 to-rose-600 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between opacity-90 text-xs font-semibold uppercase tracking-wider">
            <span>Total Pendente a Pagar</span>
            <AlertCircle className="w-5 h-5 text-amber-200" />
          </div>
          <div className="mt-3">
            <h4 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {formatCurrency(totalDebtsToPay)}
            </h4>
            <p className="text-xs text-amber-100 mt-1">
              {pendingExpenses.length} contas pendentes + {cardsWithBalance.length} faturas abertas
            </p>
          </div>
        </div>

        {/* Faturas de Cartão */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Faturas de Cartões
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CardIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(totalCardInvoices)}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              {cardsWithBalance.length} {cardsWithBalance.length === 1 ? "cartão com saldo devedor" : "cartões com saldo devedor"}
            </p>
          </div>
        </div>

        {/* Boletos e Despesas Variadas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Contas e Boletos Pendentes
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <CalendarClock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(totalPendingExpenses)}
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Despesas aguardando quitação manual
            </p>
          </div>
        </div>
      </div>

      {/* Seção 1: Faturas de Cartão de Crédito a Pagar */}
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
              Nenhum cartão com fatura em aberto! Parabéns, todas as faturas estão zeradas.
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

      {/* Seção 2: Contas e Despesas Individuais Pendentes */}
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
                        <td className="px-6 py-4 text-xs text-slate-600">
                          {formatDate(expense.date)}
                        </td>
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
    </div>
  );
}
