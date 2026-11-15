import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

interface BudgetInput {
  category: string;
  allocated: number;
  spent: number;
}

export async function POST(req: Request) {
  try {
    const { prompt, context } = await req.json();

    const budgetsList: BudgetInput[] = Array.isArray(context?.budgets) ? context.budgets : [];
    const budgetAlerts = budgetsList
      .filter((b) => Number(b.allocated) > 0 && (Number(b.spent) / Number(b.allocated)) * 100 > 80)
      .map((b) => {
        const allocated = Number(b.allocated);
        const spent = Number(b.spent);
        const percentage = (spent / allocated) * 100;
        return {
          category: b.category,
          allocated,
          spent,
          percentage: Number(percentage.toFixed(1)),
          status: spent > allocated ? "EXCEDIDO" : "ACIMA_DE_80_PORCENTO",
        };
      })
      .sort((a, b) => b.percentage - a.percentage);

    const generateFinancialInsights = () => {
      const totalExpenses = (context?.expenses || []).reduce(
        (a: number, b: { amount: number }) => a + (Number(b.amount) || 0),
        0
      );
      const totalIncomes = (context?.incomes || []).reduce(
        (a: number, b: { amount: number }) => a + (Number(b.amount) || 0),
        0
      );
      const balance = totalIncomes - totalExpenses;
      const savingsPercent = totalIncomes > 0 ? ((balance / totalIncomes) * 100).toFixed(1) : "0";

      const alertsSection =
        budgetAlerts.length > 0
          ? `\n\n🚨 Alertas de Orçamento (>80%):\n${budgetAlerts
              .map((a) => {
                const diff = Math.abs(a.allocated - a.spent).toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                });
                return `• ${a.category}: ${a.percentage}% usado (R$ ${a.spent.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })} de R$ ${a.allocated.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}) — ${a.spent > a.allocated ? `excedeu R$ ${diff}` : `resta R$ ${diff}`}`;
              })
              .join("\n")}`
          : "";

      return `📊 Diagnóstico Financeiro FinFam:

• Receitas Mensais: R$ ${totalIncomes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
• Despesas Registradas: R$ ${totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
• Saldo Livre: R$ ${balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${savingsPercent}% de poupança)${alertsSection}

💡 Recomendações Estratégicas para sua Família:
1. Contenção Imediata: ${
        budgetAlerts.length > 0
          ? `Congele gastos não essenciais em ${budgetAlerts.map((a) => a.category).join(", ")} até a virada do mês.`
          : "Todas as categorias seguem dentro de 80% do teto orçado."
      }
2. Teto por Categoria: Mantenha despesas essenciais sob controle para proteger o saldo mensal.
3. Reserva de Emergência: Direcione parte do saldo positivo para liquidez diária.`;
    };

    const client = getAIClient();
    if (!client) {
      return NextResponse.json({ reply: generateFinancialInsights() });
    }

    const systemInstruction = `Você é o FinFam AI, um experiente consultor e planejador financeiro familiar.
Sua missão é dar conselhos práticos, empáticos, realistas e estratégicos para ajudar as famílias a manterem as contas em dia, economizarem nas despesas e conquistarem metas como reserva de emergência, viagens e investimentos.
Sempre dê atenção prioritária às categorias em alerta de orçamento (>80% do teto mensal) fornecidas em budgetAlerts, citando valores reais e ações concretas de contenção.
Seja direto, claro, utilize formatação organizada (em tópicos quando cabível) e forneça números e cálculos claros baseados no contexto financeiro da família fornecido no prompt.`;

    try {
      const response = await client.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Contexto financeiro atual da família:\n${JSON.stringify(
                  {
                    ...context,
                    budgetAlerts,
                  },
                  null,
                  2
                )}\n\nPergunta/Solicitação do usuário: ${prompt}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction,
        },
      });

      const reply = response.text || generateFinancialInsights();
      return NextResponse.json({ reply });
    } catch (genError) {
      console.warn("Gemini generation failed, using fallback financial advisor heuristics:", genError);
      return NextResponse.json({ reply: generateFinancialInsights() });
    }
  } catch (error: unknown) {
    console.error("FinFam AI API Error:", error);
    return NextResponse.json(
      { reply: "Ocorreu uma oscilação na análise inteligente. Por favor, tente novamente." },
      { status: 200 }
    );
  }
}
