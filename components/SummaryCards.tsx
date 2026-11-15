"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard as CardIcon,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
} from "lucide-react";

interface SummaryCardsProps {
  totalIncome: number;
  receivedIncome?: number;
  pendingIncome?: number;
  totalExpense: number;
  installmentExpenseTotal?: number;
  titheExpenseTotal?: number;
  balance: number;
  cashBalance?: number;
  pendingAmount?: number;
  creditCardMonthTotal?: number;
  totalCardsUsed?: number;
  totalCardsLimit?: number;
  cardsCount?: number;
}

export default function SummaryCards({
  totalIncome,
  receivedIncome,
  pendingIncome = 0,
  totalExpense,
  installmentExpenseTotal = 0,
  titheExpenseTotal = 0,
  balance,
  cashBalance,
  pendingAmount = 0,
  creditCardMonthTotal = 0,
  totalCardsUsed = 0,
  totalCardsLimit = 0,
  cardsCount = 0,
}: SummaryCardsProps) {
  const effectiveReceived = receivedIncome !== undefined ? receivedIncome : totalIncome;
  const usedPercent = totalCardsLimit > 0 ? (totalCardsUsed / totalCardsLimit) * 100 : 0;
  const availableLimit = Math.max(0, totalCardsLimit - totalCardsUsed);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Receitas Totais */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
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
          <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs mt-1.5">
            <span className="text-emerald-600 font-medium flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Recebido: {formatCurrency(effectiveReceived)}
            </span>
            {pendingIncome > 0 && (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                {formatCurrency(pendingIncome)} a receber
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Despesas Totais (Gastos do mês em destaque + apenas parceladas menor embaixo) */}
      <div className="bg-white p-5 rounded-2xl border-2 border-rose-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block">
              Despesas Totais
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              Gastos do mês (todas as saídas)
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-3xl font-extrabold text-rose-600 tracking-tight leading-none">
            {formatCurrency(totalExpense)}
          </h3>
          <div className="flex flex-wrap items-center justify-between gap-1.5 mt-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                <Layers className="w-3 h-3" />
                Parceladas: {formatCurrency(installmentExpenseTotal)}
              </span>
              {titheExpenseTotal > 0 && (
                <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  Dízimo: {formatCurrency(titheExpenseTotal)}
                </span>
              )}
            </div>
            {pendingAmount > 0 ? (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                {formatCurrency(pendingAmount)} a pagar
              </span>
            ) : (
              <span className="text-slate-500 text-[11px] font-medium flex items-center gap-0.5">
                <ArrowDownRight className="w-3 h-3 text-rose-500" />
                Tudo pago
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Saldo Líquido */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Saldo Disponível
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              balance >= 0 ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
            }`}
          >
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3
            className={`text-2xl font-bold tracking-tight ${
              balance >= 0 ? "text-blue-600" : "text-amber-600"
            }`}
          >
            {formatCurrency(balance)}
          </h3>
          <div className="mt-1.5 space-y-0.5">
            <p className="text-xs text-slate-500 font-medium">
              {balance >= 0 ? "Superávit previsto no mês" : "Atenção: Déficit previsto"}
            </p>
            {cashBalance !== undefined && (
              <p className="text-[11px] text-slate-600 font-semibold">
                Em caixa (recebido - pago):{" "}
                <span className={cashBalance >= 0 ? "text-emerald-600" : "text-rose-600"}>
                  {formatCurrency(cashBalance)}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cartões & Limite (Substitui Taxa de Poupança) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Cartões no Mês
            </span>
            <span className="text-[11px] text-slate-400">
              {cardsCount} {cardsCount === 1 ? "cartão ativo" : "cartões ativos"}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <CardIcon className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(creditCardMonthTotal)}
          </h3>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-1.5 rounded-full ${
                usedPercent > 80 ? "bg-rose-500" : usedPercent > 50 ? "bg-amber-500" : "bg-indigo-500"
              }`}
              style={{ width: `${Math.min(Math.max(usedPercent, 0), 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
            <span>Uso limite: {usedPercent.toFixed(0)}%</span>
            <span className="font-semibold text-emerald-600">Livre: {formatCurrency(availableLimit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
