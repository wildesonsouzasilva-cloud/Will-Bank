"use client";

import React, { useState, useEffect } from "react";
import { TitheConfig } from "@/lib/types";
import { formatCurrency, formatMonthYearPt } from "@/lib/utils";
import {
  Percent,
  SlidersHorizontal,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Tag,
} from "lucide-react";

interface TitheConfigPanelProps {
  config: TitheConfig;
  availableCategories: string[];
  receivedIncomeMonthTotal: number;
  pendingIncomeMonthTotal?: number;
  monthTitheTotal: number;
  monthTithePendingTotal?: number;
  pendingSyncCount: number;
  referenceMonth: string;
  compact?: boolean;
  onSaveConfig: (next: TitheConfig) => void;
  onSyncMonthTithes: () => void;
}

const PRESET_PERCENTAGES = [5, 10, 12, 15, 20];

export default function TitheConfigPanel({
  config,
  availableCategories,
  receivedIncomeMonthTotal,
  pendingIncomeMonthTotal = 0,
  monthTitheTotal,
  monthTithePendingTotal = 0,
  pendingSyncCount,
  referenceMonth,
  compact = false,
  onSaveConfig,
  onSyncMonthTithes,
}: TitheConfigPanelProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [enabled, setEnabled] = useState(config.enabled);
  const [percentageInput, setPercentageInput] = useState(String(config.percentage));
  const [category, setCategory] = useState(config.category || "Dízimo");
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setEnabled(config.enabled);
    setPercentageInput(String(config.percentage));
    setCategory(config.category || "Dízimo");
  }, [config.enabled, config.percentage, config.category]);

  const categories = Array.from(
    new Set(["Dízimo", ...availableCategories.filter((c) => c.trim().length > 0), category])
  );

  const parsedPct = Math.min(100, Math.max(0, Number.isFinite(parseFloat(percentageInput)) ? parseFloat(percentageInput) : 0));
  const totalIncomeMonth = receivedIncomeMonthTotal + pendingIncomeMonthTotal;
  const projectedMonthTithe = (totalIncomeMonth * parsedPct) / 100;
  const titheOnReceived = (receivedIncomeMonthTotal * parsedPct) / 100;
  const titheOnPending = (pendingIncomeMonthTotal * parsedPct) / 100;

  const isDirty =
    enabled !== config.enabled ||
    Math.abs(parsedPct - config.percentage) > 0.001 ||
    category !== config.category;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedPct = Number(parsedPct.toFixed(2));
    const sanitizedCat = category.trim() || "Dízimo";
    onSaveConfig({
      enabled,
      percentage: sanitizedPct,
      category: sanitizedCat,
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Cabeçalho / Resumo Compacto */}
      <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-indigo-50/70 via-white to-emerald-50/50 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              config.enabled
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            <Percent className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Configuração de Dízimo Automático
              </h3>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                  config.enabled
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {config.enabled ? `Ativo (${config.percentage}%)` : "Desativado"}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                <Tag className="w-3 h-3" />
                Categoria: {config.category}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              O dízimo previsto (<strong>{config.percentage}%</strong>) é lançado automaticamente como despesa{" "}
              <strong>A Pagar</strong> e atualizado para <strong>Pago</strong> ao receber a entrada em{" "}
              <strong>{formatMonthYearPt(referenceMonth)}</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs">
            <span className="text-slate-600">Dízimo previsto ({parsedPct}%): </span>
            <strong className="text-indigo-700">{formatCurrency(projectedMonthTithe)}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 text-xs">
            <span className="text-slate-600">Lançado nas despesas: </span>
            <strong className="text-rose-700">{formatCurrency(monthTitheTotal)}</strong>
            {monthTithePendingTotal > 0 && (
              <span className="text-[11px] text-amber-700 font-semibold ml-1">
                ({formatCurrency(monthTithePendingTotal)} a pagar)
              </span>
            )}
          </div>

          {config.enabled && config.percentage > 0 && pendingSyncCount > 0 && !isDirty && (
            <button
              type="button"
              onClick={onSyncMonthTithes}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sincronizar dízimo ({pendingSyncCount})
            </button>
          )}

          {compact && (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>{expanded ? "Ocultar" : "Configurar"}</span>
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Formulário Expandido */}
      {expanded && (
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ativação Automática */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-2">
              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  Lançamento Automático
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Lança automaticamente o dízimo previsto como despesa a pagar e atualiza para pago na soma final ao receber a receita.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setEnabled(true)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    enabled
                      ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Ativado
                </button>
                <button
                  type="button"
                  onClick={() => setEnabled(false)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    !enabled
                      ? "bg-slate-800 border-slate-800 text-white shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Desativado
                </button>
              </div>
            </div>

            {/* Porcentagem do Dízimo */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <label
                htmlFor="tithe-percentage-input"
                className="block text-xs font-semibold text-slate-700"
              >
                Porcentagem do Dízimo (%)
              </label>
              <div className="relative">
                <input
                  id="tithe-percentage-input"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  required
                  value={percentageInput}
                  onChange={(e) => setPercentageInput(e.target.value)}
                  className="w-full px-3 py-2 pr-9 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  %
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PERCENTAGES.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setPercentageInput(String(pct))}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-colors ${
                      Math.abs(parsedPct - pct) < 0.01
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Seletor da Categoria de Despesa */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
              <label
                htmlFor="tithe-category-select"
                className="block text-xs font-semibold text-slate-700"
              >
                Categoria de Despesa
              </label>
              <select
                id="tithe-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Escolha a categoria onde os lançamentos automáticos de dízimo serão contabilizados nas despesas e orçamentos.
              </p>
            </div>
          </div>

          {/* Prévia de Cálculo + Ações */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 font-medium">
                Receitas do mês: <strong>{formatCurrency(totalIncomeMonth)}</strong>
                {pendingIncomeMonthTotal > 0 && (
                  <span className="text-[11px] text-emerald-700/80 ml-1">
                    ({formatCurrency(receivedIncomeMonthTotal)} recebido +{" "}
                    {formatCurrency(pendingIncomeMonthTotal)} a receber)
                  </span>
                )}
              </span>
              <span className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-800 font-medium">
                Dízimo previsto ({parsedPct}%):{" "}
                <strong>{formatCurrency(projectedMonthTithe)}</strong>
                {!enabled && (
                  <span className="ml-1 text-[11px] text-slate-500">(automático pausado)</span>
                )}
                {enabled && pendingIncomeMonthTotal > 0 && receivedIncomeMonthTotal > 0 && (
                  <span className="text-[11px] text-indigo-700/80 ml-1">
                    ({formatCurrency(titheOnReceived)} recebido + {formatCurrency(titheOnPending)} ao receber)
                  </span>
                )}
              </span>
              <span className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-medium">
                Lançado nas despesas: <strong>{formatCurrency(monthTitheTotal)}</strong>
                {monthTithePendingTotal > 0 && (
                  <span className="text-[11px] text-rose-700/80 ml-1">
                    ({formatCurrency(Math.max(0, monthTitheTotal - monthTithePendingTotal))} pago +{" "}
                    {formatCurrency(monthTithePendingTotal)} a pagar)
                  </span>
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {savedNotice && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  Salvo na nuvem
                </span>
              )}

              {config.enabled && config.percentage > 0 && pendingSyncCount > 0 && !isDirty && (
                <button
                  type="button"
                  onClick={onSyncMonthTithes}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Lançar / atualizar dízimos ({pendingSyncCount})
                </button>
              )}

              <button
                type="submit"
                disabled={!isDirty}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-xs ${
                  isDirty
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                Salvar Configuração
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
