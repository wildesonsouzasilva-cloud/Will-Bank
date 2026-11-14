"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
  pendingAmount?: number;
}

export default function SummaryCards({
  totalIncome,
  totalExpense,
  balance,
  savingsRate,
  pendingAmount = 0,
}: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Receitas Totais */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Receitas Totais
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(totalIncome)}
          </h3>
          <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-0.5">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Entradas familiares consolidadas
          </p>
        </div>
      </div>

      {/* Despesas Totais */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Despesas Totais
          </span>
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(totalExpense)}
          </h3>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-rose-600 font-medium flex items-center gap-0.5">
              <ArrowDownRight className="w-3.5 h-3.5" />
              Gastos do mês
            </span>
            {pendingAmount > 0 && (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                {formatCurrency(pendingAmount)} a pagar
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Saldo Líquido */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Saldo Disponível
          </span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            balance >= 0 ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
          }`}>
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className={`text-2xl font-bold tracking-tight ${
            balance >= 0 ? "text-blue-600" : "text-amber-600"
          }`}>
            {formatCurrency(balance)}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {balance >= 0 ? "Superávit no período" : "Atenção: Déficit no período"}
          </p>
        </div>
      </div>

      {/* Taxa de Poupança */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Taxa de Poupança
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <PiggyBank className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            {savingsRate.toFixed(1)}%
          </h3>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full ${
                savingsRate >= 20 ? "bg-emerald-500" : savingsRate >= 10 ? "bg-amber-500" : "bg-rose-500"
              }`}
              style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            Meta recomendada: 20%
          </p>
        </div>
      </div>
    </div>
  );
}
