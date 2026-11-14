import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export async function POST(req: Request) {
  try {
    const { prompt, context } = await req.json();

    const generateFinancialInsights = () => {
      const totalExpenses = (context?.expenses || []).reduce((a: number, b: { amount: number }) => a + (Number(b.amount) || 0), 0);
      const totalIncomes = (context?.incomes || []).reduce((a: number, b: { amount: number }) => a + (Number(b.amount) || 0), 0);
      const balance = totalIncomes - totalExpenses;
      const savingsPercent = totalIncomes > 0 ? ((balance / totalIncomes) * 100).toFixed(1) : "0";

      return `📊 Diagnóstico Financeiro FinFam:

• Receitas Mensais: R$ ${totalIncomes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
• Despesas Registradas: R$ ${totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
• Saldo Livre: R$ ${balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${savingsPercent}% de poupança)

💡 Recomendações Estratégicas para sua Família:
1. Reserva de Emergência: Priorize manter de 3 a 6 meses de despesas fixas em liquidez diária (CDB 100% CDI ou Tesouro Selic).
2. Teto por Categoria: Mantenha as despesas essenciais (moradia e alimentação) abaixo de 50-60% das receitas totais.
3. Cartões de Crédito: Verifique a data de corte e utilize a fatura concentrada para acumular pontos sem pagar juros rotativos.`;
    };

    const client = getAIClient();
    if (!client) {
      return NextResponse.json({ reply: generateFinancialInsights() });
    }

    const systemInstruction = `Você é o FinFam AI, um experiente consultor e planejador financeiro familiar.
Sua missão é dar conselhos práticos, empáticos, realistas e estratégicos para ajudar as famílias a manterem as contas em dia, economizarem nas despesas e conquistarem metas como reserva de emergência, viagens e investimentos.
Seja direto, claro, utilize formatação organizada (em tópicos quando cabível) e forneça números e cálculos claros baseados no contexto financeiro da família fornecido no prompt.`;

    try {
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Contexto financeiro atual da família:\n${JSON.stringify(
                  context,
                  null,
                  2
                )}\n\nPergunta/Solicitação do usuário: ${prompt}`,
              },
            ],
          },
        ],
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const reply = response.text || generateFinancialInsights();
      return NextResponse.json({ reply });
    } catch (genError) {
      console.warn("Gemini generation failed, using fallback financial advisor heuristics:", genError);
      return NextResponse.json({ reply: generateFinancialInsights() });
    }
  } catch (error: any) {
    console.error("FinFam AI API Error:", error);
    return NextResponse.json(
      { reply: "Ocorreu uma oscilação na análise inteligente. Por favor, tente novamente." },
      { status: 200 }
    );
  }
}
