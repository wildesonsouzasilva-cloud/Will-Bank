"use client";

import React from "react";
import { 
  Wallet, 
  LayoutDashboard, 
  Receipt, 
  TrendingUp, 
  CreditCard as CardIcon, 
  PieChart, 
  Target, 
  Users, 
  Bot,
  Calculator,
  Clock
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  month: string;
  setMonth: (month: string) => void;
  pendingDebtsCount?: number;
}

export default function Navbar({ activeTab, setActiveTab, month, setMonth, pendingDebtsCount = 0 }: NavbarProps) {
  const tabs = [
    { id: "dashboard", label: "Visão Geral", icon: LayoutDashboard },
    { id: "debts", label: "A Pagar", icon: Clock, badge: pendingDebtsCount },
    { id: "expenses", label: "Despesas", icon: Receipt },
    { id: "income", label: "Receitas", icon: TrendingUp },
    { id: "budget", label: "Orçamentos", icon: PieChart },
    { id: "cards", label: "Cartões", icon: CardIcon },
    { id: "goals", label: "Metas", icon: Target },
    { id: "family", label: "Família", icon: Users },
    { id: "simulator", label: "Simulador", icon: Calculator },
    { id: "ai", label: "FinFam IA", icon: Bot },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                FinFam <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold uppercase">AI</span>
              </span>
              <p className="text-xs text-slate-500 hidden sm:block">Gestão Financeira Familiar</p>
            </div>
          </div>

          {/* Month selector & Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs sm:text-sm">
              <span className="text-slate-500 font-medium px-2 hidden sm:inline">Mês de Referência:</span>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="bg-white text-slate-800 font-medium rounded-lg px-2.5 py-1 text-xs sm:text-sm border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="2026-08">Agosto / 2026</option>
                <option value="2026-07">Julho / 2026</option>
                <option value="2026-06">Junho / 2026</option>
                <option value="2026-05">Maio / 2026</option>
              </select>
            </div>
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
