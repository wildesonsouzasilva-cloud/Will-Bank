"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bot,
  Send,
  Sparkles,
  User,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  ShieldAlert,
  Lightbulb,
  RefreshCw,
} from "lucide-react";
import { Expense, Income, BudgetCategory, FinancialGoal } from "@/lib/types";
import { formatCurrency, formatMonthYearPt } from "@/lib/utils";

interface FinFamAiAssistantProps {
  expenses: Expense[];
  incomes: Income[];
  budgets: BudgetCategory[];
  goals: FinancialGoal[];
  referenceMonth?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  isProactiveAlert?: boolean;
}

interface BudgetAlert {
  id: string;
  category: string;
  color: string;
  allocated: number;
  spent: number;
  percentage: number;
  remaining: number;
  exceeded: number;
  severity: "warning" | "critical";
  topExpense?: { description: string; amount: number };
}

function computeBudgetAlerts(budgets: BudgetCategory[], expenses: Expense[]): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];

  for (const b of budgets) {
    if (!b.allocated || b.allocated <= 0) continue;

    const categoryExpenses = expenses.filter(
      (e) => e.category.toLowerCase() === b.category.toLowerCase()
    );
    const expensesSum = categoryExpenses.reduce((acc, e) => acc + e.amount, 0);
    const spent = b.spent > 0 ? b.spent : expensesSum;
    const percentage = (spent / b.allocated) * 100;

    if (percentage > 80) {
      const topExpenseItem = categoryExpenses
        .slice()
        .sort((a, c) => c.amount - a.amount)[0];

      alerts.push({
        id: b.id,
        category: b.category,
        color: b.color,
        allocated: b.allocated,
        spent,
        percentage,
        remaining: Math.max(0, b.allocated - spent),
        exceeded: Math.max(0, spent - b.allocated),
        severity: percentage > 100 ? "critical" : "warning",
        topExpense: topExpenseItem
          ? { description: topExpenseItem.description, amount: topExpenseItem.amount }
          : undefined,
      });
    }
  }

  return alerts.sort((a, b) => b.percentage - a.percentage);
}

function buildProactiveAlertText(alerts: BudgetAlert[], referenceMonth?: string): string {
  const monthLabel = referenceMonth ? ` em ${formatMonthYearPt(referenceMonth)}` : " no mês";
  const lines = alerts.map((a) => {
    const pct = a.percentage.toFixed(1).replace(".", ",");
    if (a.severity === "critical") {
      return `• ${a.category}: ${pct}% do orçamento (${formatCurrency(a.spent)} de ${formatCurrency(
        a.allocated
      )}) — limite excedido em +${formatCurrency(a.exceeded)}.`;
    }
    return `• ${a.category}: ${pct}% do orçamento (${formatCurrency(a.spent)} de ${formatCurrency(
      a.allocated
    )}) — restam apenas ${formatCurrency(a.remaining)} antes de estourar o teto.`;
  });

  return `Alerta Proativo de Orçamento${monthLabel}:\n\nIdentifiquei ${
    alerts.length === 1
      ? "1 categoria que ultrapassou 80% do valor orçado"
      : `${alerts.length} categorias que ultrapassaram 80% do valor orçado`
  }:\n${lines.join("\n")}\n\nClique em "Pedir plano à IA" em qualquer alerta acima ou me pergunte como conter esses gastos.`;
}

interface DailyFinancialTip {
  id: string;
  badge: string;
  title: string;
  message: string;
  suggestedPrompt: string;
  tone: "amber" | "rose" | "blue" | "emerald";
}

function buildDailyFinancialTips(
  expenses: Expense[],
  budgets: BudgetCategory[],
  referenceMonth?: string
): DailyFinancialTip[] {
  const tips: DailyFinancialTip[] = [];
  const totalSpent = expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalAllocated = budgets.reduce((acc, b) => acc + (b.allocated || 0), 0);
  const alerts = computeBudgetAlerts(budgets, expenses);

  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [refYearStr, refMonthStr] = (referenceMonth || currentYm).split("-");
  const refYear = parseInt(refYearStr, 10) || now.getFullYear();
  const refMonth = parseInt(refMonthStr, 10) || now.getMonth() + 1;
  const daysInTargetMonth = new Date(refYear, refMonth, 0).getDate();
  const isCurrentCalendarMonth = !referenceMonth || referenceMonth === currentYm;
  const remainingDays = isCurrentCalendarMonth
    ? Math.max(1, daysInTargetMonth - now.getDate() + 1)
    : daysInTargetMonth;

  // 1) Orçamentos excedidos (>100%)
  const criticalAlert = alerts.find((a) => a.severity === "critical");
  if (criticalAlert) {
    tips.push({
      id: `critical-${criticalAlert.id}`,
      badge: "Prioridade de Contenção",
      title: `Reequilibre ${criticalAlert.category} (+${formatCurrency(criticalAlert.exceeded)} acima do teto)`,
      message: `Seus gastos em ${criticalAlert.category} somam ${formatCurrency(
        criticalAlert.spent
      )} para um orçamento de ${formatCurrency(
        criticalAlert.allocated
      )}. Evite novos lançamentos nessa categoria até o fim do mês e avalie compensar em categorias com folga.`,
      suggestedPrompt: `Como compensar o estouro de ${formatCurrency(
        criticalAlert.exceeded
      )} na categoria ${criticalAlert.category} este mês?`,
      tone: "rose",
    });
  }

  // 2) Orçamentos entre 80% e 100% — cálculo de limite diário seguro
  const warningAlert = alerts.find((a) => a.severity === "warning");
  if (warningAlert) {
    const dailyAllowance = warningAlert.remaining / remainingDays;
    tips.push({
      id: `warning-${warningAlert.id}`,
      badge: "Ritmo de Consumo",
      title: `Limite diário sugerido em ${warningAlert.category}: ${formatCurrency(dailyAllowance)}/dia`,
      message: `Você já utilizou ${warningAlert.percentage
        .toFixed(0)}% do orçamento de ${warningAlert.category}. Com ${formatCurrency(
        warningAlert.remaining
      )} restantes para os próximos ${remainingDays} dias do mês, manter a média abaixo de ${formatCurrency(
        dailyAllowance
      )} por dia evita estourar o teto.`,
      suggestedPrompt: `Me ajude a manter os gastos de ${warningAlert.category} dentro dos ${formatCurrency(
        warningAlert.remaining
      )} restantes no mês.`,
      tone: "amber",
    });
  }

  // 3) Concentração no cartão de crédito
  const cardExpenses = expenses.filter((e) => e.paymentMethod === "credit_card");
  const cardTotal = cardExpenses.reduce((acc, e) => acc + e.amount, 0);
  const cardShare = totalSpent > 0 ? (cardTotal / totalSpent) * 100 : 0;
  if (cardTotal > 0 && cardShare >= 40) {
    tips.push({
      id: "credit-card-share",
      badge: "Uso de Crédito",
      title: `Cartão representa ${cardShare.toFixed(0)}% das despesas do mês`,
      message: `Foram lançados ${formatCurrency(cardTotal)} em ${
        cardExpenses.length
      } compras no cartão de crédito. Priorizar PIX ou débito nos próximos gastos variáveis ajuda a aliviar a próxima fatura.`,
      suggestedPrompt: `Analise nossos gastos no cartão de crédito (${formatCurrency(
        cardTotal
      )}) e sugira como reduzir a pressão na fatura.`,
      tone: "amber",
    });
  }

  // 4) Comprometimento com parcelamentos
  const installmentExpenses = expenses.filter((e) => Boolean(e.installments && e.installments > 1));
  const installmentTotal = installmentExpenses.reduce((acc, e) => acc + e.amount, 0);
  const installmentShare = totalSpent > 0 ? (installmentTotal / totalSpent) * 100 : 0;
  if (installmentTotal > 0 && installmentShare >= 25) {
    tips.push({
      id: "installment-load",
      badge: "Fluxo Parcelado",
      title: `${installmentShare.toFixed(0)}% do mês já está comprometido com parcelas`,
      message: `Você possui ${formatCurrency(
        installmentTotal
      )} em parcelas neste mês. Evite assumir novos parcelamentos até quitar parte das obrigações atuais para recuperar flexibilidade no orçamento.`,
      suggestedPrompt: `Como aliviar nosso comprometimento mensal de ${formatCurrency(
        installmentTotal
      )} em parcelas?`,
      tone: "blue",
    });
  }

  // 5) Gastos em categorias sem orçamento definido
  const budgetedNames = new Set(budgets.map((b) => b.category.toLowerCase()));
  const unbudgetedTotals = new Map<string, number>();
  for (const exp of expenses) {
    if (!budgetedNames.has(exp.category.toLowerCase())) {
      unbudgetedTotals.set(
        exp.category,
        (unbudgetedTotals.get(exp.category) || 0) + exp.amount
      );
    }
  }
  const topUnbudgeted = Array.from(unbudgetedTotals.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topUnbudgeted && topUnbudgeted[1] > 0) {
    tips.push({
      id: `unbudgeted-${topUnbudgeted[0]}`,
      badge: "Cobertura de Orçamento",
      title: `Defina um teto para "${topUnbudgeted[0]}" (${formatCurrency(topUnbudgeted[1])})`,
      message: `A categoria ${topUnbudgeted[0]} já soma ${formatCurrency(
        topUnbudgeted[1]
      )} no mês, mas ainda não possui um limite configurado na aba Orçamentos. Criar um teto permite que os alertas proativos protejam esse gasto.`,
      suggestedPrompt: `Com base no gasto atual de ${formatCurrency(
        topUnbudgeted[1]
      )}, qual teto mensal ideal para a categoria ${topUnbudgeted[0]}?`,
      tone: "blue",
    });
  }

  // 6) Despesas pendentes ("A Pagar")
  const pendingExpenses = expenses.filter((e) => e.status === "pending");
  const pendingTotal = pendingExpenses.reduce((acc, e) => acc + e.amount, 0);
  if (pendingExpenses.length > 0 && pendingTotal > 0) {
    tips.push({
      id: "pending-outflows",
      badge: "Agenda de Vencimentos",
      title: `${pendingExpenses.length} ${
        pendingExpenses.length === 1 ? "conta a pagar" : "contas a pagar"
      } somando ${formatCurrency(pendingTotal)}`,
      message: `Reserve ${formatCurrency(
        pendingTotal
      )} do saldo em caixa para quitar os vencimentos pendentes do mês em dia e evitar juros ou multas desnecessárias.`,
      suggestedPrompt: `Qual a melhor ordem para quitar nossas ${pendingExpenses.length} despesas pendentes (${formatCurrency(
        pendingTotal
      )})?`,
      tone: "blue",
    });
  }

  // 7) Categoria dominante ou Folga orçamentária saudável
  const categoryMap = new Map<string, number>();
  for (const exp of expenses) {
    categoryMap.set(exp.category, (categoryMap.get(exp.category) || 0) + exp.amount);
  }
  const topCategory = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topCategory && totalSpent > 0) {
    const share = (topCategory[1] / totalSpent) * 100;
    tips.push({
      id: `top-cat-${topCategory[0]}`,
      badge: "Perfil de Gastos",
      title: `${topCategory[0]} lidera os gastos do mês (${share.toFixed(0)}%)`,
      message: `Dos ${formatCurrency(totalSpent)} registrados até aqui, ${formatCurrency(
        topCategory[1]
      )} foram destinados a ${topCategory[0]}. Pequenas economias nessa categoria geram o maior impacto no saldo final da família.`,
      suggestedPrompt: `Como otimizar os gastos da nossa maior categoria do mês (${topCategory[0]} - ${formatCurrency(
        topCategory[1]
      )})?`,
      tone: "blue",
    });
  }

  if (totalAllocated > 0 && totalSpent <= totalAllocated * 0.75) {
    const slack = totalAllocated - totalSpent;
    const suggestedReserve = slack * 0.3;
    tips.push({
      id: "healthy-slack",
      badge: "Oportunidade de Economia",
      title: `Orçamento saudável: ${formatCurrency(slack)} de folga nos tetos`,
      message: `Vocês consumiram ${((totalSpent / totalAllocated) * 100).toFixed(
        0
      )}% do total orçado para ${
        referenceMonth ? formatMonthYearPt(referenceMonth) : "o mês"
      }. Aproveite para direcionar pelo menos ${formatCurrency(
        suggestedReserve
      )} dessa folga para suas metas ou reserva de emergência.`,
      suggestedPrompt: `Estamos com ${formatCurrency(
        slack
      )} de folga nos orçamentos do mês. Como distribuir melhor esse valor entre reserva e metas?`,
      tone: "emerald",
    });
  }

  if (tips.length === 0) {
    tips.push({
      id: "starter-tip",
      badge: "Planejamento Inicial",
      title: "Registre suas despesas e tetos do mês para receber dicas personalizadas",
      message:
        "Assim que houver despesas e limites orçamentários lançados neste mês, analisarei seu perfil de consumo diariamente para sugerir oportunidades práticas de economia.",
      suggestedPrompt:
        "Como montar uma divisão ideal de orçamento mensal para nossa família?",
      tone: "emerald",
    });
  }

  return tips;
}

function getDailyFinancialTip(
  expenses: Expense[],
  budgets: BudgetCategory[],
  referenceMonth?: string,
  offset = 0
): { tip: DailyFinancialTip; totalTips: number; activeIndex: number } {
  const tips = buildDailyFinancialTips(expenses, budgets, referenceMonth);
  const dayOfMonth = new Date().getDate();
  const activeIndex = (dayOfMonth - 1 + offset) % tips.length;
  return {
    tip: tips[activeIndex],
    totalTips: tips.length,
    activeIndex,
  };
}

export default function FinFamAiAssistant({
  expenses,
  incomes,
  budgets,
  goals,
  referenceMonth,
}: FinFamAiAssistantProps) {
  const budgetAlerts = computeBudgetAlerts(budgets, expenses);

  const [messages, setMessages] = useState<Message[]>(() => {
    const initialAlerts = computeBudgetAlerts(budgets, expenses);
    if (initialAlerts.length > 0) {
      return [
        {
          role: "assistant",
          isProactiveAlert: true,
          content: `Olá! Sou seu assistente FinFam AI. Antes de começarmos, já detectei atenção necessária nos seus tetos mensais:\n\n${buildProactiveAlertText(
            initialAlerts,
            referenceMonth
          )}`,
        },
      ];
    }
    return [
      {
        role: "assistant",
        content:
          "Olá! Sou seu assistente de inteligência financeira familiar FinFam AI. No momento, todas as suas categorias orçadas estão abaixo de 80% do limite mensal. Posso analisar onde economizar, sugerir ajustes e calcular o tempo para atingir suas metas. Como posso te ajudar hoje?",
      },
    ];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [alertsExpanded, setAlertsExpanded] = useState(true);
  const [dismissedKeys, setDismissedKeys] = useState<string[]>([]);
  const [tipOffset, setTipOffset] = useState(0);

  const { tip: dailyTip, totalTips: totalDailyTips, activeIndex: dailyTipIndex } =
    getDailyFinancialTip(expenses, budgets, referenceMonth, tipOffset);

  const alertMonthPrefix = referenceMonth || "current";
  const initialKeysRef = useRef<Set<string>>(
    new Set(budgetAlerts.map((a) => `${alertMonthPrefix}:${a.category}:${a.severity}`))
  );

  const alertSignature = budgetAlerts
    .map((a) => `${alertMonthPrefix}:${a.category}:${a.severity}`)
    .join("|");

  useEffect(() => {
    if (!alertSignature) return;
    const keys = alertSignature.split("|").filter(Boolean);
    const newlyTriggeredKeys = keys.filter((k) => !initialKeysRef.current.has(k));

    if (newlyTriggeredKeys.length > 0) {
      for (const k of newlyTriggeredKeys) {
        initialKeysRef.current.add(k);
      }

      const newlyTriggeredCategories = new Set(
        newlyTriggeredKeys.map((k) => k.split(":")[1])
      );
      const relevantAlerts = computeBudgetAlerts(budgets, expenses).filter((a) =>
        newlyTriggeredCategories.has(a.category)
      );

      if (relevantAlerts.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            isProactiveAlert: true,
            content: buildProactiveAlertText(relevantAlerts, referenceMonth),
          },
        ]);
        setAlertsExpanded(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertSignature]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/finfam-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToSend,
          context: {
            referenceMonth,
            expenses,
            incomes,
            budgets,
            goals,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Erro na resposta da IA");
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "Desculpe, não consegui processar a resposta agora.",
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Com base nos dados atuais da família, recomendamos priorizar a contenção nas categorias mais próximas ou acima do limite orçado e direcionar eventual superávit mensal para a Reserva de Emergência.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAskContainmentPlan = (alert: BudgetAlert) => {
    const statusText =
      alert.severity === "critical"
        ? `já excedeu o teto em ${formatCurrency(alert.exceeded)}`
        : `atingiu ${alert.percentage.toFixed(1)}% do orçamento (resta apenas ${formatCurrency(
            alert.remaining
          )})`;

    const prompt = `Alerta de orçamento: a categoria "${alert.category}" ${statusText}, somando ${formatCurrency(
      alert.spent
    )} de ${formatCurrency(
      alert.allocated
    )} orçados para este mês. Analise os gastos dessa categoria e me dê um plano prático e imediato de contenção para fechar o mês no azul.`;

    void handleSend(prompt);
  };

  const getDismissKey = (a: BudgetAlert) => `${alertMonthPrefix}:${a.id}:${a.severity}`;
  const visibleAlerts = budgetAlerts.filter((a) => !dismissedKeys.includes(getDismissKey(a)));
  const criticalCount = budgetAlerts.filter((a) => a.severity === "critical").length;

  const quickQuestions = [
    ...(budgetAlerts.length > 0
      ? [
          `Como conter os gastos em ${budgetAlerts[0].category} (${budgetAlerts[0].percentage.toFixed(
            0
          )}% do orçamento)?`,
        ]
      : []),
    "Onde podemos cortar gastos este mês?",
    "Nossas metas cabem no orçamento atual?",
    "Qual membro ou categoria teve maior alta de gastos?",
    "Como podemos acelerar nossa reserva de emergência?",
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col min-h-[650px] max-h-[780px] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              FinFam AI Advisor <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
            </h3>
            <p className="text-xs text-slate-500">
              Consultoria financeira com alertas proativos de teto orçamentário (&gt;80%)
            </p>
          </div>
        </div>

        {/* Status Proativo no Cabeçalho */}
        {budgetAlerts.length > 0 ? (
          <button
            type="button"
            onClick={() => setAlertsExpanded((prev) => !prev)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              criticalCount > 0
                ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
            }`}
          >
            <BellRing className="w-3.5 h-3.5 animate-pulse" />
            <span>
              {budgetAlerts.length}{" "}
              {budgetAlerts.length === 1 ? "alerta acima de 80%" : "alertas acima de 80%"}
            </span>
            {alertsExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Categorias abaixo de 80%
          </span>
        )}
      </div>

      {/* Painel de Alertas Proativos (>80% do orçamento mensal) */}
      {budgetAlerts.length > 0 && alertsExpanded && (
        <div
          className={`px-5 py-3.5 border-b space-y-2.5 ${
            criticalCount > 0
              ? "bg-rose-50/50 border-rose-100"
              : "bg-amber-50/50 border-amber-100"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <ShieldAlert
                className={`w-4 h-4 shrink-0 ${
                  criticalCount > 0 ? "text-rose-600" : "text-amber-600"
                }`}
              />
              <span>
                Alertas Proativos de Orçamento
                {referenceMonth ? ` — ${formatMonthYearPt(referenceMonth)}` : ""}
              </span>
            </div>

            {dismissedKeys.length > 0 && (
              <button
                type="button"
                onClick={() => setDismissedKeys([])}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                Mostrar todos os alertas ({budgetAlerts.length})
              </button>
            )}
          </div>

          {visibleAlerts.length === 0 ? (
            <p className="text-xs text-slate-500">
              Todos os alertas foram ocultados temporariamente nesta visualização.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
              {visibleAlerts.map((alert) => {
                const isCritical = alert.severity === "critical";
                const dismissKey = getDismissKey(alert);

                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl bg-white border shadow-2xs space-y-2 ${
                      isCritical ? "border-rose-200" : "border-amber-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: alert.color }}
                        />
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {alert.category}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap ${
                            isCritical
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {alert.percentage.toFixed(0)}% usado
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDismissedKeys((prev) => [...prev, dismissKey])}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                        title="Ocultar alerta"
                        aria-label={`Ocultar alerta de ${alert.category}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          isCritical ? "bg-rose-500" : "bg-amber-500"
                        }`}
                        style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                      <span className="text-slate-600">
                        <strong>{formatCurrency(alert.spent)}</strong> de{" "}
                        {formatCurrency(alert.allocated)}
                      </span>
                      {isCritical ? (
                        <span className="font-bold text-rose-600">
                          Excedeu +{formatCurrency(alert.exceeded)}
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-700">
                          Resta {formatCurrency(alert.remaining)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-500 truncate">
                        {alert.topExpense
                          ? `Maior gasto: ${alert.topExpense.description} (${formatCurrency(
                              alert.topExpense.amount
                            )})`
                          : "Acima de 80% do limite mensal"}
                      </span>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleAskContainmentPlan(alert)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors disabled:opacity-50 ${
                          isCritical
                            ? "bg-rose-600 text-white hover:bg-rose-700"
                            : "bg-amber-500 text-white hover:bg-amber-600"
                        }`}
                      >
                        Pedir plano à IA
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Dica Financeira do Dia baseada no perfil de gastos e orçamentos do mês */}
      <div className="px-5 py-3 border-b border-slate-100 bg-gradient-to-r from-amber-50/40 via-white to-blue-50/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                dailyTip.tone === "rose"
                  ? "bg-rose-100 text-rose-700"
                  : dailyTip.tone === "amber"
                    ? "bg-amber-100 text-amber-700"
                    : dailyTip.tone === "emerald"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
              }`}
            >
              <Lightbulb className="w-4 h-4" />
            </div>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Dica Financeira do Dia
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    dailyTip.tone === "rose"
                      ? "bg-rose-100 text-rose-700"
                      : dailyTip.tone === "amber"
                        ? "bg-amber-100 text-amber-800"
                        : dailyTip.tone === "emerald"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {dailyTip.badge}
                </span>
                {referenceMonth && (
                  <span className="text-[10px] font-medium text-slate-400">
                    Base: {formatMonthYearPt(referenceMonth, true)}
                  </span>
                )}
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                {dailyTip.title}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">{dailyTip.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-center sm:self-start">
            {totalDailyTips > 1 && (
              <button
                type="button"
                onClick={() => setTipOffset((prev) => prev + 1)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-600 transition-colors"
                title={`Ver próxima dica (${dailyTipIndex + 1}/${totalDailyTips})`}
              >
                <RefreshCw className="w-3 h-3" />
                <span>
                  Outra ({dailyTipIndex + 1}/{totalDailyTips})
                </span>
              </button>
            )}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSend(dailyTip.suggestedPrompt)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 text-[11px] font-semibold transition-colors whitespace-nowrap"
            >
              Aprofundar com IA
            </button>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  m.isProactiveAlert
                    ? "bg-amber-100 text-amber-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {m.isProactiveAlert ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
            )}
            <div
              className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-xs shadow-xs"
                  : m.isProactiveAlert
                    ? "bg-amber-50/90 text-slate-800 rounded-bl-xs border border-amber-200"
                    : "bg-slate-100/80 text-slate-800 rounded-bl-xs border border-slate-200/50"
              }`}
            >
              {m.isProactiveAlert && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-800 mb-1.5">
                  <BellRing className="w-3.5 h-3.5" />
                  Aviso Proativo do Consultor
                </div>
              )}
              <div className="whitespace-pre-line">{m.content}</div>
            </div>
            {m.role === "user" && (
              <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 items-center text-slate-400 text-xs italic">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <span>FinFam AI está analisando os dados financeiros da família...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex gap-2 overflow-x-auto scrollbar-none">
        {quickQuestions.map((q, i) => (
          <button
            key={i}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 whitespace-nowrap transition-colors shadow-2xs"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre seus orçamentos, metas, cartões ou dicas de economia..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
}
