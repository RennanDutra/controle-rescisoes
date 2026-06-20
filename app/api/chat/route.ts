import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { mensagem } = await request.json();

    if (!mensagem) {
      return NextResponse.json(
        { error: "Mensagem não enviada." },
        { status: 400 }
      );
    }

    const resposta = await openai.responses.create({
      model: "gpt-5.4-mini",
      input: `
Você é o Assistente Rescisões Líder.

Responda em português do Brasil, de forma clara e prática.

Você ajuda com:
- dúvidas de rescisão CLT;
- aviso-prévio;
- férias proporcionais;
- 13º proporcional;
- FGTS e multa;
- seguro-desemprego;
- prazo de pagamento;
- eSocial;
- GRRF;
- contrato de experiência;
- pedido de demissão;
- justa causa;
- dúvidas sobre Departamento Pessoal.

Sempre avise que respostas trabalhistas são orientação geral e podem depender da convenção coletiva ou análise do caso concreto.

Pergunta do usuário:
${mensagem}
      `,
    });

    return NextResponse.json({
      resposta: resposta.output_text,
    });
  } catch (error: any) {
    console.error("Erro no chat:", error);

    return NextResponse.json(
      { error: "Erro ao consultar o assistente." },
      { status: 500 }
    );
  }
}