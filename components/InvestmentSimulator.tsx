"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { Calculator, TrendingUp, Sparkles } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export default function InvestmentSimulator() {
  const [mounted, setMounted] = useState(false);
  const [initialAmount, setInitialAmount] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(1500);
  const [annualRate, setAnnualRate] = useState(11.5);
  const [years, setYears] = useState(10);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate compound interest month by month
  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  const totalMonths = years * 12;

  const simulationData = [];
  let currentTotal = initialAmount;
  let totalInvested = initialAmount;

  for (let year = 1; year <= years; year++) {
    for (let m = 1; m <= 12; m++) {
      currentTotal = currentTotal * (1 + monthlyRate) + monthlyContribution;
      totalInvested += monthlyContribution;
    }
    simulationData.push({
      year: `Ano ${year}`,
      Investido: Math.round(totalInvested),
      "Total Acumulado (Juros Compostos)": Math.round(currentTotal),
      "Rendimento em Juros": Math.round(currentTotal - totalInvested),
    });
  }

  const finalAccumulated = currentTotal;
  const finalInvested = totalInvested;
  const finalInterest = finalAccumulated - finalInvested;
  const estimatedMonthlyPassiveIncome = (finalAccumulated * (annualRate / 100)) / 12;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Simulador de Juros Compostos & Patrimônio</h3>
          <p className="text-xs text-slate-500">Projeção da evolução financeira da família com aportes mensais consistentes</p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Poder dos Juros Compostos
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h4 className="font-bold text-slate-900 text-sm">Parâmetros da Simulação</h4>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Aporte Inicial: <strong className="text-slate-900">{formatCurrency(initialAmount)}</strong>
            </label>
            <input
              type="range"
              min="0"
              max="100000"
              step="1000"
              value={initialAmount}
              onChange={(e) => setInitialAmount(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Aporte Mensal: <strong className="text-slate-900">{formatCurrency(monthlyContribution)}</strong>
            </label>
            <input
              type="range"
              min="100"
              max="20000"
              step="100"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Taxa de Rentabilidade Anual: <strong className="text-slate-900">{annualRate}% a.a.</strong>
            </label>
            <input
              type="range"
              min="4"
              max="20"
              step="0.5"
              value={annualRate}
              onChange={(e) => setAnnualRate(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Período de Tempo: <strong className="text-slate-900">{years} Anos</strong>
            </label>
            <input
              type="range"
              min="1"
              max="35"
              step="1"
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 block">Total Aportado do Bolso:</span>
              <strong className="text-slate-800 text-sm">{formatCurrency(finalInvested)}</strong>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-xs text-emerald-700 block">Juros Gerados (Dinheiro Trabalhando):</span>
              <strong className="text-emerald-700 text-sm">+{formatCurrency(finalInterest)}</strong>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-xs text-blue-700 block">Renda Passiva Mensal Estimada:</span>
              <strong className="text-blue-700 text-base">{formatCurrency(estimatedMonthlyPassiveIncome)}/mês</strong>
            </div>
          </div>
        </div>

        {/* Chart View */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-bold text-slate-900 text-base">Projeção Patrimonial ao Final de {years} Anos</h4>
                <p className="text-xs text-slate-500">Curva de crescimento exponencial dos juros compostos</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-medium block">Patrimônio Final</span>
                <span className="text-xl font-extrabold text-blue-600">{formatCurrency(finalAccumulated)}</span>
              </div>
            </div>

            <div className="h-80 w-full">
              {mounted ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={simulationData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Line
                      type="monotone"
                      dataKey="Total Acumulado (Juros Compostos)"
                      stroke="#2563EB"
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Investido"
                      stroke="#94A3B8"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Rendimento em Juros"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full bg-slate-50 rounded-xl animate-pulse" />
              )}
            </div>
          </div>

          <div className="mt-4 p-4 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
            💡 <strong>Dica da FinFam:</strong> Note como a partir do 5º ano, os juros anuais superam os aportes anuais do bolso. A disciplina mensal é o motor da tranquilidade da família!
          </div>
        </div>
      </div>
    </div>
  );
}
