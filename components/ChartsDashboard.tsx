"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { Expense, Income, BudgetCategory, FamilyMember } from "@/lib/types";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from "recharts";

interface ChartsDashboardProps {
  expenses: Expense[];
  incomes: Income[];
  budgets: BudgetCategory[];
  familyMembers: FamilyMember[];
}

const COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#06B6D4", "#64748B", "#F43F5E"];

export default function ChartsDashboard({
  expenses,
  budgets,
  familyMembers,
}: ChartsDashboardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  // Aggregate expenses by category
  const categoryDataMap: Record<string, number> = {};
  expenses.forEach((e) => {
    categoryDataMap[e.category] = (categoryDataMap[e.category] || 0) + e.amount;
  });

  const categoryChartData = Object.entries(categoryDataMap).map(([name, value]) => ({
    name,
    value,
  }));

  // Aggregate expenses by family member
  const memberDataMap: Record<string, number> = {};
  expenses.forEach((e) => {
    const member = familyMembers.find((m) => m.id === e.memberId);
    const memberName = member ? member.name.split(" ")[0] : "Outro";
    memberDataMap[memberName] = (memberDataMap[memberName] || 0) + e.amount;
  });

  const memberChartData = Object.entries(memberDataMap).map(([name, value]) => ({
    name,
    value,
  }));

  // Budget comparison data
  const budgetComparisonData = budgets.map((b) => ({
    category: b.category,
    Orçado: b.allocated,
    Realizado: b.spent,
  }));

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-80 animate-pulse" />
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-80 animate-pulse" />
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-80 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Gráfico 1: Despesas por Categoria */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h4 className="text-sm font-semibold text-slate-800 mb-1">Distribuição por Categoria</h4>
        <p className="text-xs text-slate-500 mb-4">Onde a família mais gasta no mês</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={categoryChartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {categoryChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 2: Despesas por Membro */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h4 className="text-sm font-semibold text-slate-800 mb-1">Gastos por Membro Familiar</h4>
        <p className="text-xs text-slate-500 mb-4">Participação no consumo mensal</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={memberChartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {memberChartData.map((entry, index) => (
                  <Cell key={`member-cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 3: Orçado vs Realizado */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h4 className="text-sm font-semibold text-slate-800 mb-1">Orçado vs. Realizado</h4>
        <p className="text-xs text-slate-500 mb-4">Acompanhamento do teto orçamentário</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={budgetComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="Orçado" fill="#94A3B8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Realizado" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
