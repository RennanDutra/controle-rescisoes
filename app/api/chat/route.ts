import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { mensagem } = await request.json();

    if (!mensagem || !String(mensagem).trim()) {
      return NextResponse.json(
        { error: "Mensagem não enviada." },
        { status: 400 }
      );
    }

    const resposta = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: `
Você é o Líder IA, assistente inteligente de Departamento Pessoal brasileiro.

Regras obrigatórias:
Responda sempre em português do Brasil.
Responda como um atendente humano experiente, próximo e profissional.
Use linguagem simples, natural e acolhedora.
Não use markdown.
Não use asteriscos.
Não use títulos com jogo da velha.
Não use sinal de maior que.
Não use listas longas com traços.
Prefira parágrafos curtos.
Evite respostas robóticas.
Quando fizer sentido, explique em passos simples, mas sem formatação pesada.
Em dúvidas trabalhistas, informe que é uma orientação geral e que casos específicos podem depender da convenção coletiva, documentos e análise profissional.

Mensagem do usuário:
${String(mensagem).trim()}
      `,
    });

    const texto = resposta.output_text
      .replace(/\*\*/g, "")
      .replace(/###/g, "")
      .replace(/##/g, "")
      .replace(/#/g, "")
      .replace(/^>\s?/gm, "")
      .trim();

    return NextResponse.json({ resposta: texto });
  } catch (error) {
    console.error("Erro no assistente:", error);

    return NextResponse.json(
      { error: "Erro ao consultar o assistente." },
      { status: 500 }
    );
  }
}
