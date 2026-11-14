"use client";

import React from "react";
import Image from "next/image";
import { 
  LayoutDashboard, 
  Receipt, 
  TrendingUp, 
  CreditCard as CardIcon, 
  PieChart, 
  Target, 
  Users, 
  Bot,
  Calculator,
  Clock,
  Cloud,
  LogOut
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  month: string;
  setMonth: (month: string) => void;
  pendingDebtsCount?: number;
  userName?: string | null;
  userEmail?: string | null;
  onSignOut?: () => void;
}

const MONTHS = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const YEARS = ["2024", "2025", "2026", "2027", "2028"];

export default function Navbar({
  activeTab,
  setActiveTab,
  month,
  setMonth,
  pendingDebtsCount = 0,
  userName,
  userEmail,
  onSignOut,
}: NavbarProps) {
  const [selectedYear, selectedMonth] = month.split("-");

  const handleMonthChange = (newMonth: string) => {
    setMonth(`${selectedYear || "2026"}-${newMonth}`);
  };

  const handleYearChange = (newYear: string) => {
    setMonth(`${newYear}-${selectedMonth || "11"}`);
  };

  const tabs = [
    { id: "dashboard", label: "Visão Geral", icon: LayoutDashboard },
    { id: "debts", label: "A Pagar & Dívidas", icon: Clock, badge: pendingDebtsCount },
    { id: "expenses", label: "Despesas", icon: Receipt },
    { id: "income", label: "Receitas", icon: TrendingUp },
    { id: "budget", label: "Orçamentos", icon: PieChart },
    { id: "cards", label: "Cartões", icon: CardIcon },
    { id: "goals", label: "Metas", icon: Target },
    { id: "family", label: "Família", icon: Users },
    { id: "simulator", label: "Simulador", icon: Calculator },
    { id: "ai", label: "Consultor IA", icon: Bot },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Logo WillBank */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm shrink-0 bg-slate-900">
              <Image
                src="/willbank-logo.jpg"
                alt="WillBank Logo"
                width={40}
                height={40}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                WillBank <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-semibold uppercase">FAM</span>
              </span>
              <p className="text-xs text-slate-500 hidden sm:block">Gestão Financeira Familiar</p>
            </div>
          </div>

          {/* Month & Year selector + User */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs sm:text-sm">
              <span className="text-slate-500 font-medium px-2 hidden md:inline">Referência:</span>
              <select
                aria-label="Mês de referência"
                value={selectedMonth || "11"}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="bg-white text-slate-800 font-medium rounded-lg px-2 py-1 text-xs sm:text-sm border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Ano de referência"
                value={selectedYear || "2026"}
                onChange={(e) => handleYearChange(e.target.value)}
                className="bg-white text-slate-800 font-semibold rounded-lg px-2 py-1 text-xs sm:text-sm border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {onSignOut && (
              <div className="flex items-center gap-1.5 pl-1">
                <div
                  title={userEmail || userName || "Conta conectada"}
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium"
                >
                  <Cloud className="w-3.5 h-3.5 shrink-0" />
                  <span className="max-w-[140px] truncate">{userName || userEmail || "Sincronizado"}</span>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  title="Sair da conta"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-medium transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sair</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-100">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-white text-blue-700" : "bg-amber-100 text-amber-800"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
