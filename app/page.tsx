"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "./supabase";

type AndamentoItem = {
  titulo: string;
  feito: boolean;
};

type ChecklistPadrao = {
  id: number;
  titulo: string;
};

type AlertaPagamento = {
  id?: number;
  nome: string;
  email_destino: string;
  dias_antes: number;
  tipo: string;
  motivo: string;
  palavra_chave?: string;
  ativo: boolean;
};

type Rescisao = {
  id?: number;
  Empresa: string;
  matricula: string;
  Nome: string;
  lotacao: string;
  data_admissao: string;
  data_desligamento: string;
  prazo_pagamento: string;
  tipo_desligamento: string;
  cumprimento_aviso: string;
  funcao: string;
  salario: string;
  plano_saude: string;
  observacao_plano_saude: string;
  plano_odonto: string;
  observacao_plano_odonto: string;
  econsignado: string;
  aso: string;
  data_agendamento_aso: string;
  devolucao_equipamentos: string;
  prestserv: string;
  guia_sd: string;
  fgts: string;
  email: string;
  kit_demissional: string;
  homologacao: string;
  status: string;
  observacao?: string;
  valor_liquido?: number;
  valor_fgts?: number;
  andamento?: AndamentoItem[];
};

const statusOpcoes = ["Pendente", "Em cálculo", "Finalizado"];

const tiposDesligamentoIniciais = [
  "Dispensa sem justa causa",
  "Pedido de demissão",
  "Término de contrato de experiência",
  "Rescisão antecipada pelo empregador",
  "Rescisão antecipada pelo empregado",
  "Acordo entre as partes",
  "Dispensa por justa causa",
  "Rescisão indireta",
];

const opcoesReducaoAviso = [
  "Não haverá redução",
  "Redução de 7 dias",
  "Redução de 2h diárias",
];

const motivosAlerta = [
  "Prazo de pagamento",
  "ASO vencido",
  "Guia SD pendente",
  "Kit demissional pendente",
  "FGTS mensal + multa",
  "Status diferente de Finalizado",
  "Observação contém palavra",
];

const meses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const feriados = [
  "2026-01-01",
  "2026-01-20",
  "2026-02-17",
  "2026-04-03",
  "2026-04-21",
  "2026-04-23",
  "2026-05-01",
  "2026-06-04",
  "2026-09-07",
  "2026-10-12",
  "2026-11-02",
  "2026-11-15",
  "2026-11-20",
  "2026-12-25",
];

const formInicial = {
  Empresa: "",
  matricula: "",
  Nome: "",
  lotacao: "",
  data_admissao: "",
  data_desligamento: "",
  prazo_pagamento: "",
  tipo_desligamento: "",
  cumprimento_aviso: "Não",
  dia_cumprimento: "",
  reducao_aviso: "Não haverá redução",
  funcao: "",
  salario: "",
  plano_saude: "Não",
  observacao_plano_saude: "",
  plano_odonto: "Não",
  observacao_plano_odonto: "",
  econsignado: "Não",
  aso: "EM DIA",
  data_agendamento_aso: "",
  devolucao_equipamentos: "Não possui",
  prestserv: "Não",
  guia_sd: "Não",
  fgts: "Mensal",
  email: "",
  kit_demissional: "",
  homologacao: "",
  observacao: "",
  status: "Pendente",
};

function Modal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      translate="no"
      className="notranslate fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        translate="no"
        className="notranslate max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function ModalFrente({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      translate="no"
      className="notranslate fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        translate="no"
        className="notranslate max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-blue-700 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const relatorioPDFRef = useRef<HTMLDivElement | null>(null);

  const [session, setSession] = useState<Session | null>(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [carregandoLogin, setCarregandoLogin] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [rescisoes, setRescisoes] = useState<Rescisao[]>([]);
  const [totalRescisoes, setTotalRescisoes] = useState(0);
  const [rescisaoSelecionada, setRescisaoSelecionada] =
    useState<Rescisao | null>(null);

  const [rescisaoAndamento, setRescisaoAndamento] =
    useState<Rescisao | null>(null);
  const [andamentoTemp, setAndamentoTemp] = useState<AndamentoItem[]>([]);
  const [novoItemIndividual, setNovoItemIndividual] = useState("");

  const [rescisaoObservacao, setRescisaoObservacao] =
    useState<Rescisao | null>(null);
  const [observacaoTemp, setObservacaoTemp] = useState("");

  const [rescisaoValores, setRescisaoValores] = useState<Rescisao | null>(null);
  const [valorLiquidoTemp, setValorLiquidoTemp] = useState("");
  const [valorFgtsTemp, setValorFgtsTemp] = useState("");

  const [mostrarRelatorio, setMostrarRelatorio] = useState(false);
  const [abaRelatorio, setAbaRelatorio] = useState("Todas");

  const [checklistPadrao, setChecklistPadrao] = useState<ChecklistPadrao[]>([]);
  const [novoItemPadrao, setNovoItemPadrao] = useState("");
  const [mostrarConfigChecklist, setMostrarConfigChecklist] = useState(false);

  const [alertasPagamento, setAlertasPagamento] = useState<AlertaPagamento[]>([]);
  const [mostrarDashboard, setMostrarDashboard] = useState(false);
  const [mostrarConfigAlertas, setMostrarConfigAlertas] = useState(false);
  const [nomeAlerta, setNomeAlerta] = useState("");
  const [emailAlerta, setEmailAlerta] = useState("");
  const [diasAntesAlerta, setDiasAntesAlerta] = useState("3");
  const [tipoAlerta, setTipoAlerta] = useState("Padrão");
  const [motivoAlerta, setMotivoAlerta] = useState("Prazo de pagamento");
  const [palavraChaveAlerta, setPalavraChaveAlerta] = useState("");

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState(formInicial);
  const [abaPagamento, setAbaPagamento] = useState("Todas");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [busca, setBusca] = useState("");

  const [opcoesTipoDesligamento, setOpcoesTipoDesligamento] = useState<string[]>(
    tiposDesligamentoIniciais
  );
  const [novoTipoDesligamento, setNovoTipoDesligamento] = useState("");
  const [mostrarTiposDesligamento, setMostrarTiposDesligamento] =
    useState(false);

  async function entrar() {
    if (!loginEmail.trim() || !loginSenha.trim()) {
      alert("Informe o email e a senha.");
      return;
    }

    setCarregandoLogin(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginSenha,
    });

    setCarregandoLogin(false);

    if (error) {
      alert(error.message);
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    setSession(null);
    setRescisoes([]);
    setTotalRescisoes(0);
    setChecklistPadrao([]);
    setAlertasPagamento([]);
    setMostrarFormulario(false);
    setRescisaoSelecionada(null);
    setRescisaoAndamento(null);
    setRescisaoObservacao(null);
    setRescisaoValores(null);
    setMostrarRelatorio(false);
    setMostrarDashboard(false);
    setMostrarConfigAlertas(false);
  }


  function formatarData(data: Date) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function formatarMoeda(valor: any) {
    const numero = Number(valor || 0);

    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function converterValor(valor: string) {
    if (!valor.trim()) return 0;

    const limpo = valor
      .replace(/\./g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, "");

    const numero = Number(limpo);

    return isNaN(numero) ? 0 : numero;
  }

  function formatarValorEmReal(valor: string) {
    const somenteNumeros = valor.replace(/\D/g, "");

    if (!somenteNumeros) return "";

    const numero = Number(somenteNumeros) / 100;

    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function atualizarSalario(valor: string) {
    setForm({
      ...form,
      salario: formatarValorEmReal(valor),
    });
  }

  function ehFimDeSemana(data: Date) {
    return data.getDay() === 0 || data.getDay() === 6;
  }

  function ehFeriado(data: Date) {
    return feriados.includes(formatarData(data));
  }

  function calcularPrazoPagamento(dataDesligamento: string) {
    const data = new Date(dataDesligamento + "T00:00:00");
    data.setDate(data.getDate() + 9);

    while (ehFimDeSemana(data) || ehFeriado(data)) {
      data.setDate(data.getDate() - 1);
    }

    return formatarData(data);
  }

  function dataHojeSemHora() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return hoje;
  }

  function diferencaDiasAtePrazo(prazoPagamento: string) {
    if (!prazoPagamento) return null;

    const hoje = dataHojeSemHora();
    const prazo = new Date(prazoPagamento + "T00:00:00");
    prazo.setHours(0, 0, 0, 0);

    const diferenca = prazo.getTime() - hoje.getTime();
    return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
  }

  function textoPrazo(prazoPagamento: string) {
    const dias = diferencaDiasAtePrazo(prazoPagamento);

    if (dias === null) return "Sem prazo";
    if (dias < 0) return `Vencido há ${Math.abs(dias)} dia(s)`;
    if (dias === 0) return "Vence hoje";
    if (dias === 1) return "Vence amanhã";

    return `Vence em ${dias} dias`;
  }

  function classePrazo(prazoPagamento: string) {
    const dias = diferencaDiasAtePrazo(prazoPagamento);

    if (dias === null) return "bg-zinc-800 text-zinc-300";
    if (dias < 0) return "bg-red-600 text-white";
    if (dias === 0) return "bg-yellow-500 text-black";
    if (dias <= 3) return "bg-orange-500 text-black";
    if (dias <= 7) return "bg-blue-600 text-white";

    return "bg-green-600 text-white";
  }

  function alertaCombinaComRescisao(alerta: AlertaPagamento, rescisao: Rescisao) {
    if (!alerta.ativo) return false;

    const dias = diferencaDiasAtePrazo(rescisao.prazo_pagamento);
    if (dias === null) return false;

    if (dias > Number(alerta.dias_antes)) return false;

    if (alerta.tipo === "Padrão") return true;

    if (alerta.motivo === "ASO vencido") return rescisao.aso === "Vencido";
    if (alerta.motivo === "Guia SD pendente") return rescisao.guia_sd === "Não";
    if (alerta.motivo === "Kit demissional pendente") {
      return !String(rescisao.kit_demissional || "").trim();
    }
    if (alerta.motivo === "FGTS mensal + multa") {
      return rescisao.fgts === "Mensal + Multa";
    }
    if (alerta.motivo === "Status diferente de Finalizado") {
      return rescisao.status !== "Finalizado";
    }
    if (alerta.motivo === "Observação contém palavra") {
      const palavra = String(alerta.palavra_chave || "").trim().toLowerCase();
      if (!palavra) return false;
      return String(rescisao.observacao || "").toLowerCase().includes(palavra);
    }

    return true;
  }

  function gerarChecklistPadrao() {
    return checklistPadrao.map((item) => ({
      titulo: item.titulo,
      feito: false,
    }));
  }

  function atualizarCampo(campo: string, valor: string) {
    const novoForm = {
      ...form,
      [campo]: valor,
    };

    if (campo === "data_desligamento" && valor) {
      novoForm.prazo_pagamento = calcularPrazoPagamento(valor);
    }

    if (campo === "plano_saude" && valor === "Não") {
      novoForm.observacao_plano_saude = "";
    }

    if (campo === "plano_odonto" && valor === "Não") {
      novoForm.observacao_plano_odonto = "";
    }

    if (campo === "aso" && valor === "EM DIA") {
      novoForm.data_agendamento_aso = "";
    }

    if (campo === "cumprimento_aviso" && valor === "Não") {
      (novoForm as any).dia_cumprimento = "";
      (novoForm as any).reducao_aviso = "Não haverá redução";
    }

    setForm(novoForm);
  }

  function montarCumprimentoAviso() {
    if (form.cumprimento_aviso !== "Sim") return "Não";

    const partes = ["Sim"];

    if ((form as any).dia_cumprimento) {
      partes.push(`Dia do cumprimento: ${(form as any).dia_cumprimento}`);
    }

    if ((form as any).reducao_aviso) {
      partes.push(`Redução: ${(form as any).reducao_aviso}`);
    }

    return partes.join(" | ");
  }

  function extrairCumprimentoAviso(valor: string) {
    const texto = String(valor || "");

    if (!texto || texto === "Não") {
      return {
        cumprimento: "Não",
        dia: "",
        reducao: "Não haverá redução",
      };
    }

    const dia = texto.match(/Dia do cumprimento: ([^|]+)/)?.[1]?.trim() || "";
    const reducao =
      texto.match(/Redução: ([^|]+)/)?.[1]?.trim() || "Não haverá redução";

    return {
      cumprimento: texto.startsWith("Sim") ? "Sim" : texto,
      dia,
      reducao,
    };
  }

  function dadosFormularioParaSalvar(status?: string) {
    const {
      dia_cumprimento,
      reducao_aviso,
      ...dadosBase
    } = form as any;

    return {
      ...dadosBase,
      cumprimento_aviso: montarCumprimentoAviso(),
      salario: form.salario === "" ? null : converterValor(form.salario),
      ...(status ? { status } : {}),
    };
  }

  function adicionarTipoDesligamento() {
    const novoTipo = novoTipoDesligamento.trim();

    if (!novoTipo) return;

    if (
      opcoesTipoDesligamento.some(
        (tipo) => tipo.toLowerCase() === novoTipo.toLowerCase()
      )
    ) {
      alert("Este tipo de desligamento já está cadastrado.");
      return;
    }

    const novasOpcoes = [...opcoesTipoDesligamento, novoTipo].sort((a, b) =>
      a.localeCompare(b)
    );

    setOpcoesTipoDesligamento(novasOpcoes);
    setNovoTipoDesligamento("");
  }

  function removerTipoDesligamento(tipo: string) {
    const confirmar = confirm(`Deseja remover "${tipo}" da lista?`);
    if (!confirmar) return;

    const novasOpcoes = opcoesTipoDesligamento.filter((item) => item !== tipo);

    setOpcoesTipoDesligamento(novasOpcoes);

    if (form.tipo_desligamento === tipo) {
      atualizarCampo("tipo_desligamento", "");
    }
  }

  function criarAbasPagamento() {
    const listaRescisoes = Array.isArray(rescisoes) ? rescisoes : [];
    const mapa = new Map<string, string>();

    listaRescisoes.forEach((rescisao) => {
      if (!rescisao.prazo_pagamento) {
        mapa.set("Sem pagamento", "Sem pagamento");
        return;
      }

      const prazo = String(rescisao.prazo_pagamento);
      const [ano, mes] = prazo.split("-");

      if (!ano || !mes) {
        mapa.set("Sem pagamento", "Sem pagamento");
        return;
      }

      const chave = `${ano}-${mes}`;
      const nomeMes = meses[Number(mes) - 1] || mes;

      mapa.set(chave, `${nomeMes}/${ano}`);
    });

    const abasOrdenadas = Array.from(mapa.entries()).sort(([a], [b]) => {
      if (a === "Sem pagamento") return 1;
      if (b === "Sem pagamento") return -1;
      return a.localeCompare(b);
    });

    return [
      {
        chave: "Todas",
        nome: "Todas",
        total: listaRescisoes.length,
      },
      ...abasOrdenadas.map(([chave, nome]) => ({
        chave,
        nome,
        total:
          chave === "Sem pagamento"
            ? listaRescisoes.filter((r) => !r.prazo_pagamento).length
            : listaRescisoes.filter((r) =>
                String(r.prazo_pagamento || "").startsWith(chave)
              ).length,
      })),
    ];
  }

  const abasPagamento = criarAbasPagamento();

  const rescisoesFiltradasPorMes =
    abaPagamento === "Todas"
      ? rescisoes
      : abaPagamento === "Sem pagamento"
      ? rescisoes.filter((r) => !r.prazo_pagamento)
      : rescisoes.filter((r) =>
          String(r.prazo_pagamento || "").startsWith(abaPagamento)
        );

  const rescisoesFiltradasPorStatus =
    filtroStatus === "Todos"
      ? rescisoesFiltradasPorMes
      : rescisoesFiltradasPorMes.filter((r) =>
          filtroStatus === "Pendente"
            ? !r.status || r.status === "Pendente"
            : r.status === filtroStatus
        );

  const termoBusca = busca.trim().toLowerCase();

  const rescisoesFiltradas = rescisoesFiltradasPorStatus.filter((r) => {
    if (!termoBusca) return true;

    const nome = (r.Nome || "").toLowerCase();
    const matricula = (r.matricula || "").toLowerCase();

    return nome.includes(termoBusca) || matricula.includes(termoBusca);
  });

  const rescisoesRelatorio =
    abaRelatorio === "Todas"
      ? rescisoes
      : abaRelatorio === "Sem pagamento"
      ? rescisoes.filter((r) => !r.prazo_pagamento)
      : rescisoes.filter((r) =>
          String(r.prazo_pagamento || "").startsWith(abaRelatorio)
        );

  const totalLiquidoRelatorio = rescisoesRelatorio.reduce(
    (total, r) => total + Number(r.valor_liquido || 0),
    0
  );

  const totalFgtsRelatorio = rescisoesRelatorio.reduce(
    (total, r) => total + Number(r.valor_fgts || 0),
    0
  );

  const totalGeralRelatorio = totalLiquidoRelatorio + totalFgtsRelatorio;

  const rescisoesVencidas = rescisoes.filter((r) => {
    const dias = diferencaDiasAtePrazo(r.prazo_pagamento);
    return dias !== null && dias < 0;
  });

  const rescisoesVencemHoje = rescisoes.filter((r) => {
    const dias = diferencaDiasAtePrazo(r.prazo_pagamento);
    return dias === 0;
  });

  const rescisoesVencemEm1Dia = rescisoes.filter((r) => {
    const dias = diferencaDiasAtePrazo(r.prazo_pagamento);
    return dias === 1;
  });

  const rescisoesVencemEm2Dias = rescisoes.filter((r) => {
    const dias = diferencaDiasAtePrazo(r.prazo_pagamento);
    return dias === 2;
  });

  const rescisoesVencemEm4Dias = rescisoes.filter((r) => {
    const dias = diferencaDiasAtePrazo(r.prazo_pagamento);
    return dias === 4;
  });

  const rescisoesSemPrazo = rescisoes.filter((r) => !r.prazo_pagamento);

  const rescisoesCriticas = rescisoes
    .filter((r) => {
      const dias = diferencaDiasAtePrazo(r.prazo_pagamento);
      return dias !== null && (dias < 0 || dias === 0 || dias === 1 || dias === 2 || dias === 4);
    })
    .sort((a, b) => {
      const diasA = diferencaDiasAtePrazo(a.prazo_pagamento) ?? 9999;
      const diasB = diferencaDiasAtePrazo(b.prazo_pagamento) ?? 9999;
      return diasA - diasB;
    });

  const previsoesAlertas = alertasPagamento.flatMap((alerta) =>
    rescisoes
      .filter((rescisao) => alertaCombinaComRescisao(alerta, rescisao))
      .map((rescisao) => ({ alerta, rescisao }))
  );

  async function gerarPDFRelatorio() {
    try {
      if (!relatorioPDFRef.current) {
        alert("Relatório não encontrado.");
        return;
      }

      const elemento = relatorioPDFRef.current;

      const estilosOriginais: {
        el: HTMLElement;
        color: string;
        backgroundColor: string;
        borderColor: string;
      }[] = [];

      const todosElementos = Array.from(
        elemento.querySelectorAll("*")
      ) as HTMLElement[];

      todosElementos.push(elemento);

      todosElementos.forEach((el) => {
        estilosOriginais.push({
          el,
          color: el.style.color,
          backgroundColor: el.style.backgroundColor,
          borderColor: el.style.borderColor,
        });

        const classes = el.className?.toString() || "";

        el.style.borderColor = "#27272a";

        if (classes.includes("text-zinc-400")) el.style.color = "#a1a1aa";
        else if (classes.includes("text-zinc-500")) el.style.color = "#71717a";
        else if (classes.includes("text-blue-400")) el.style.color = "#60a5fa";
        else if (classes.includes("text-yellow-400")) el.style.color = "#facc15";
        else if (classes.includes("text-emerald-400"))
          el.style.color = "#34d399";
        else if (classes.includes("text-white")) el.style.color = "#ffffff";
        else el.style.color = "#ffffff";

        if (classes.includes("bg-zinc-950"))
          el.style.backgroundColor = "#09090b";
        else if (classes.includes("bg-zinc-900"))
          el.style.backgroundColor = "#18181b";
        else if (classes.includes("bg-zinc-800"))
          el.style.backgroundColor = "#27272a";
        else if (classes.includes("bg-black"))
          el.style.backgroundColor = "#000000";
      });

      const canvas = await html2canvas(elemento, {
        scale: 2,
        backgroundColor: "#18181b",
        useCORS: true,
      });

      estilosOriginais.forEach((item) => {
        item.el.style.color = item.color;
        item.el.style.backgroundColor = item.backgroundColor;
        item.el.style.borderColor = item.borderColor;
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");

      const larguraPdf = pdf.internal.pageSize.getWidth();
      const alturaPdf = pdf.internal.pageSize.getHeight();

      const margem = 8;
      const larguraUtil = larguraPdf - margem * 2;
      const alturaImg = (canvas.height * larguraUtil) / canvas.width;

      let posicaoY = margem;
      let alturaRestante = alturaImg;

      pdf.addImage(imgData, "PNG", margem, posicaoY, larguraUtil, alturaImg);
      alturaRestante -= alturaPdf - margem * 2;

      while (alturaRestante > 0) {
        pdf.addPage();
        posicaoY = alturaRestante - alturaImg + margem;
        pdf.addImage(imgData, "PNG", margem, posicaoY, larguraUtil, alturaImg);
        alturaRestante -= alturaPdf - margem * 2;
      }

      pdf.save("relatorio-de-pagamentos.pdf");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Erro ao gerar PDF. Aperte F12, abra o Console e veja o erro.");
    }
  }

  async function carregarRescisoes() {
    const { data, error } = await supabase
      .from("rescisoes")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setRescisoes(data || []);
    setTotalRescisoes((data || []).length);
  }

  async function carregarChecklistPadrao() {
    const { data, error } = await supabase
      .from("checklist_padrao")
      .select("*")
      .order("id");

    if (error) {
      alert(error.message);
      return;
    }

    setChecklistPadrao(data || []);
  }

  async function carregarAlertasPagamento() {
    const { data, error } = await supabase
      .from("alertas_pagamento")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error(error.message);
      return;
    }

    setAlertasPagamento(data || []);
  }

  async function cadastrarAlertaPagamento() {
    if (!nomeAlerta.trim()) {
      alert("Informe o nome do alerta.");
      return;
    }

    if (!emailAlerta.trim()) {
      alert("Informe o email que receberá o alerta.");
      return;
    }

    const dias = Number(diasAntesAlerta);

    if (Number.isNaN(dias) || dias < 0) {
      alert("Informe uma quantidade de dias válida.");
      return;
    }

    const { error } = await supabase.from("alertas_pagamento").insert({
      nome: nomeAlerta.trim(),
      email_destino: emailAlerta.trim(),
      dias_antes: dias,
      tipo: tipoAlerta,
      motivo: tipoAlerta === "Padrão" ? "Prazo de pagamento" : motivoAlerta,
      palavra_chave:
        motivoAlerta === "Observação contém palavra"
          ? palavraChaveAlerta.trim()
          : "",
      ativo: true,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNomeAlerta("");
    setEmailAlerta("");
    setDiasAntesAlerta("3");
    setTipoAlerta("Padrão");
    setMotivoAlerta("Prazo de pagamento");
    setPalavraChaveAlerta("");

    carregarAlertasPagamento();
  }

  async function alternarAlertaPagamento(alerta: AlertaPagamento) {
    if (!alerta.id) return;

    const { error } = await supabase
      .from("alertas_pagamento")
      .update({ ativo: !alerta.ativo })
      .eq("id", alerta.id);

    if (error) {
      alert(error.message);
      return;
    }

    carregarAlertasPagamento();
  }

  async function excluirAlertaPagamento(id: number | undefined) {
    if (!id) return;

    const confirmar = confirm("Deseja excluir este alerta?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("alertas_pagamento")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    carregarAlertasPagamento();
  }

  async function adicionarItemPadrao() {
    if (!novoItemPadrao.trim()) return;

    const { error } = await supabase.from("checklist_padrao").insert({
      titulo: novoItemPadrao.trim(),
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNovoItemPadrao("");
    carregarChecklistPadrao();
  }

  async function excluirItemPadrao(id: number) {
    const confirmar = confirm("Deseja excluir este item do checklist padrão?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("checklist_padrao")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    carregarChecklistPadrao();
  }

  async function aplicarChecklistPadraoEmTodas() {
    const confirmar = confirm(
      "Isso vai substituir o andamento de todas as rescisões pelo checklist padrão. Deseja continuar?"
    );

    if (!confirmar) return;

    const checklist = gerarChecklistPadrao();

    for (const rescisao of rescisoes) {
      if (!rescisao.id) continue;

      const { error } = await supabase
        .from("rescisoes")
        .update({
          andamento: checklist,
          status: "Pendente",
        })
        .eq("id", rescisao.id);

      if (error) {
        alert(error.message);
        return;
      }
    }

    carregarRescisoes();
    alert("Checklist padrão aplicado em todas as rescisões.");
  }

  async function cadastrarRescisao() {
    const dados = {
      ...dadosFormularioParaSalvar("Pendente"),
      andamento: gerarChecklistPadrao(),
      valor_liquido: 0,
      valor_fgts: 0,
    };

    const { error } = await supabase.from("rescisoes").insert(dados);

    if (error) {
      alert(error.message);
      return;
    }

    setForm(formInicial);
    setMostrarFormulario(false);
    carregarRescisoes();
  }

  function iniciarEdicao(rescisao: Rescisao) {
    setEditandoId(rescisao.id || null);

    const aviso = extrairCumprimentoAviso(rescisao.cumprimento_aviso || "");

    setForm({
      Empresa: rescisao.Empresa || "",
      matricula: rescisao.matricula || "",
      Nome: rescisao.Nome || "",
      lotacao: rescisao.lotacao || "",
      data_admissao: rescisao.data_admissao || "",
      data_desligamento: rescisao.data_desligamento || "",
      prazo_pagamento: rescisao.prazo_pagamento || "",
      tipo_desligamento: rescisao.tipo_desligamento || "",
      cumprimento_aviso: aviso.cumprimento,
      dia_cumprimento: aviso.dia,
      reducao_aviso: aviso.reducao,
      funcao: rescisao.funcao || "",
      salario: rescisao.salario
        ? Number(rescisao.salario).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })
        : "",
      plano_saude: rescisao.plano_saude || "Não",
      observacao_plano_saude: rescisao.observacao_plano_saude || "",
      plano_odonto: rescisao.plano_odonto || "Não",
      observacao_plano_odonto: rescisao.observacao_plano_odonto || "",
      econsignado: rescisao.econsignado || "Não",
      aso: rescisao.aso || "EM DIA",
      data_agendamento_aso: rescisao.data_agendamento_aso || "",
      devolucao_equipamentos: rescisao.devolucao_equipamentos || "Não possui",
      prestserv: rescisao.prestserv || "Não",
      guia_sd: rescisao.guia_sd || "Não",
      fgts: rescisao.fgts || "Mensal",
      email: rescisao.email || "",
      kit_demissional: rescisao.kit_demissional || "",
      homologacao: rescisao.homologacao || "",
      observacao: rescisao.observacao || "",
      status: rescisao.status || "Pendente",
    });

    setMostrarFormulario(true);
  }

  async function salvarEdicao() {
    if (!editandoId) return;

    const dados = dadosFormularioParaSalvar();

    const { error } = await supabase
      .from("rescisoes")
      .update(dados)
      .eq("id", editandoId);

    if (error) {
      alert(error.message);
      return;
    }

    setForm(formInicial);
    setEditandoId(null);
    setMostrarFormulario(false);
    setRescisaoSelecionada(null);
    carregarRescisoes();
  }

  function cancelarEdicao() {
    setForm(formInicial);
    setEditandoId(null);
    setMostrarFormulario(false);
  }

  async function excluirRescisao(id: number | undefined) {
    if (!id) return;

    const confirmar = confirm("Tem certeza que deseja excluir esta rescisão?");
    if (!confirmar) return;

    const { error } = await supabase.from("rescisoes").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (rescisaoSelecionada?.id === id) setRescisaoSelecionada(null);
    if (rescisaoAndamento?.id === id) setRescisaoAndamento(null);
    if (rescisaoObservacao?.id === id) setRescisaoObservacao(null);
    if (rescisaoValores?.id === id) setRescisaoValores(null);

    carregarRescisoes();
  }

  function abrirAndamento(rescisao: Rescisao) {
    setRescisaoAndamento(rescisao);
    setNovoItemIndividual("");

    const listaAtual = Array.isArray(rescisao.andamento)
      ? rescisao.andamento
      : [];

    if (listaAtual.length > 0) {
      setAndamentoTemp(listaAtual);
    } else {
      setAndamentoTemp(gerarChecklistPadrao());
    }
  }

  function abrirObservacao(rescisao: Rescisao) {
    setRescisaoObservacao(rescisao);
    setObservacaoTemp(rescisao.observacao || "");
  }

  function abrirValores(rescisao: Rescisao) {
    setRescisaoValores(rescisao);
    setValorLiquidoTemp(
      Number(rescisao.valor_liquido || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setValorFgtsTemp(
      Number(rescisao.valor_fgts || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function adicionarItemIndividual() {
    if (!novoItemIndividual.trim()) return;

    setAndamentoTemp([
      ...andamentoTemp,
      {
        titulo: novoItemIndividual.trim(),
        feito: false,
      },
    ]);

    setNovoItemIndividual("");
  }

  function removerItemAndamento(index: number) {
    const confirmar = confirm("Deseja remover este item do checklist?");
    if (!confirmar) return;

    const novaLista = andamentoTemp.filter((_, i) => i !== index);
    setAndamentoTemp(novaLista);
  }

  function marcarItemAndamento(index: number) {
    const novaLista = andamentoTemp.map((item, i) =>
      i === index ? { ...item, feito: !item.feito } : item
    );

    setAndamentoTemp(novaLista);
  }

  async function salvarAndamento() {
    if (!rescisaoAndamento?.id) return;

    const total = andamentoTemp.length;
    const concluidos = andamentoTemp.filter((item) => item.feito).length;

    let novoStatus = "Pendente";

    if (total > 0 && concluidos === total) {
      novoStatus = "Finalizado";
    } else if (concluidos > 0) {
      novoStatus = "Em cálculo";
    }

    const { error } = await supabase
      .from("rescisoes")
      .update({
        andamento: andamentoTemp,
        status: novoStatus,
      })
      .eq("id", rescisaoAndamento.id);

    if (error) {
      alert(error.message);
      return;
    }

    setRescisaoAndamento(null);
    setAndamentoTemp([]);
    setNovoItemIndividual("");
    carregarRescisoes();
  }

  async function salvarObservacao() {
    if (!rescisaoObservacao?.id) return;

    const { error } = await supabase
      .from("rescisoes")
      .update({
        observacao: observacaoTemp,
      })
      .eq("id", rescisaoObservacao.id);

    if (error) {
      alert(error.message);
      return;
    }

    setRescisaoObservacao(null);
    setObservacaoTemp("");
    carregarRescisoes();
  }

  async function salvarValores() {
    if (!rescisaoValores?.id) return;

    const valorLiquido = converterValor(valorLiquidoTemp);
    const valorFgts = converterValor(valorFgtsTemp);

    const { error } = await supabase
      .from("rescisoes")
      .update({
        valor_liquido: valorLiquido,
        valor_fgts: valorFgts,
      })
      .eq("id", rescisaoValores.id);

    if (error) {
      alert(error.message);
      return;
    }

    setRescisaoValores(null);
    setValorLiquidoTemp("");
    setValorFgtsTemp("");
    carregarRescisoes();
  }

  function progressoAndamento(rescisao: Rescisao) {
    const lista = Array.isArray(rescisao.andamento) ? rescisao.andamento : [];

    if (lista.length === 0) return "0/0";

    const concluidos = lista.filter((item) => item.feito).length;

    return `${concluidos}/${lista.length}`;
  }

  function input(campo: string, label: string, tipo = "text") {
    return (
      <div>
        <label className="mb-1 block text-sm text-zinc-400">{label}</label>
        <input
          type={tipo}
          value={(form as any)[campo]}
          onChange={(e) => atualizarCampo(campo, e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-blue-500"
        />
      </div>
    );
  }

  function select(campo: string, label: string, opcoes: string[]) {
    return (
      <div>
        <label className="mb-1 block text-sm text-zinc-400">{label}</label>
        <select
          value={(form as any)[campo]}
          onChange={(e) => atualizarCampo(campo, e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-blue-500"
        >
          {opcoes.map((opcao) => (
            <option key={opcao}>{opcao}</option>
          ))}
        </select>
      </div>
    );
  }

  function detalhe(titulo: string, valor: any) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <p className="text-sm text-zinc-500">{titulo}</p>
        <p className="mt-1 whitespace-pre-wrap font-semibold text-white">
          {valor || "-"}
        </p>
      </div>
    );
  }

  useEffect(() => {
    document.documentElement.lang = "pt-BR";
    document.documentElement.setAttribute("translate", "no");
    document.body.classList.add("notranslate");
    document.body.setAttribute("translate", "no");

    let metaGoogle = document.querySelector(
      'meta[name="google"]'
    ) as HTMLMetaElement | null;

    if (!metaGoogle) {
      metaGoogle = document.createElement("meta");
      metaGoogle.name = "google";
      document.head.appendChild(metaGoogle);
    }

    metaGoogle.content = "notranslate";
  }, []);

  useEffect(() => {
    const tiposSalvos = localStorage.getItem("tipos_desligamento_rescisoes_lider");

    if (tiposSalvos) {
      try {
        const tipos = JSON.parse(tiposSalvos);

        if (Array.isArray(tipos) && tipos.length > 0) {
          setOpcoesTipoDesligamento(tipos);
        }
      } catch {
        setOpcoesTipoDesligamento(tiposDesligamentoIniciais);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "tipos_desligamento_rescisoes_lider",
      JSON.stringify(opcoesTipoDesligamento)
    );
  }, [opcoesTipoDesligamento]);

  useEffect(() => {
    async function verificarSessao() {
      const { data } = await supabase.auth.getSession();

      setSession(data.session);
      setCarregandoSessao(false);

      if (data.session) {
        carregarRescisoes();
        carregarChecklistPadrao();
        carregarAlertasPagamento();
      }
    }

    verificarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      setSession(novaSessao);

      if (novaSessao) {
        carregarRescisoes();
        carregarChecklistPadrao();
        carregarAlertasPagamento();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (carregandoSessao) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <p className="text-zinc-400">Carregando...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black p-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          <h1 className="text-3xl font-bold">Login</h1>
          <p className="mt-2 text-zinc-400">
            Acesse o Rescisões Líder
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">Senha</label>
              <input
                type="password"
                value={loginSenha}
                onChange={(e) => setLoginSenha(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") entrar();
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={entrar}
              disabled={carregandoLogin}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregandoLogin ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      translate="no"
      className="notranslate min-h-screen bg-black p-8 text-white"
    >
      <div className="mx-auto w-full max-w-[95vw]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">
              Rescisões Líder
            </h1>
            <p className="mt-2 text-zinc-400">Controle inteligente de rescisões.</p>
          </div>

          <button
            onClick={sair}
            className="rounded-lg bg-red-600 px-5 py-3 font-bold text-white hover:bg-red-700"
          >
            Sair
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {statusOpcoes.map((status) => (
            <div
              key={status}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <p className="text-sm text-zinc-400">{status}</p>
              <p className="mt-2 text-3xl font-bold text-blue-400">
                {
                  rescisoesFiltradas.filter((r) =>
                    status === "Pendente"
                      ? !r.status || r.status === "Pendente"
                      : r.status === status
                  ).length
                }
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => {
              setForm(formInicial);
              setEditandoId(null);
              setMostrarFormulario(true);
            }}
            className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
          >
            Nova Rescisão
          </button>

          <button
            onClick={() => setMostrarConfigChecklist(!mostrarConfigChecklist)}
            className="rounded-lg bg-purple-600 px-5 py-3 font-bold text-white hover:bg-purple-700"
          >
            Configurar Checklist
          </button>

          <button
            onClick={() => setMostrarConfigAlertas(true)}
            className="rounded-lg bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700"
          >
            Configurar Alertas
          </button>

          <button
            onClick={() => {
              setAbaRelatorio("Todas");
              setMostrarRelatorio(true);
            }}
            className="rounded-lg bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700"
          >
            Relatório de Pagamentos
          </button>

          <button
            onClick={() => setMostrarDashboard(true)}
            className="rounded-lg bg-zinc-700 px-5 py-3 font-bold text-white hover:bg-zinc-600"
          >
            Dashboard de Prazos
          </button>
        </div>

        {mostrarConfigChecklist && (
          <Modal onClose={() => setMostrarConfigChecklist(false)}>
            <div className="rounded-xl border border-purple-800 bg-zinc-900 p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-purple-400">
                    Checklist Padrão
                  </h2>
                  <p className="text-zinc-400">
                    Configure os itens padrão que entram no andamento das rescisões.
                  </p>
                </div>

                <button
                  onClick={() => setMostrarConfigChecklist(false)}
                  className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-700"
                >
                  Fechar
                </button>
              </div>

              <div className="mb-6 flex flex-col gap-2 md:flex-row">
                <input
                  value={novoItemPadrao}
                  onChange={(e) => setNovoItemPadrao(e.target.value)}
                  placeholder="Novo item do checklist padrão"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-purple-500"
                />

                <button
                  onClick={adicionarItemPadrao}
                  className="rounded-lg bg-purple-600 px-5 py-3 font-bold hover:bg-purple-700"
                >
                  Adicionar
                </button>
              </div>

              <div className="space-y-3">
                {checklistPadrao.length === 0 && (
                  <p className="text-zinc-500">Nenhum item padrão criado ainda.</p>
                )}

                {checklistPadrao.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <span className="font-bold">{item.titulo}</span>

                    <button
                      onClick={() => excluirItemPadrao(item.id)}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold hover:bg-red-700"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={aplicarChecklistPadraoEmTodas}
                  className="rounded-lg bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
                >
                  Aplicar checklist padrão em todas as rescisões
                </button>

                <button
                  onClick={() => setMostrarConfigChecklist(false)}
                  className="rounded-lg bg-zinc-700 px-5 py-3 font-bold text-white hover:bg-zinc-600"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </Modal>
        )}

        {mostrarDashboard && (
          <Modal onClose={() => setMostrarDashboard(false)}>
            <div className="rounded-xl border border-orange-800 bg-zinc-900 p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-orange-400">
                    Dashboard de Prazos
                  </h2>
                  <p className="text-zinc-400">
                    Acompanhe somente os prazos mais importantes das rescisões.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-bold text-zinc-300">
                    {previsoesAlertas.length} alerta(s) previsto(s)
                  </span>

                  <button
                    onClick={() => setMostrarDashboard(false)}
                    className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-700"
                  >
                    Fechar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                <div className="rounded-xl border border-red-800 bg-zinc-950 p-5">
                  <p className="text-sm text-zinc-400">Vencidos</p>
                  <p className="mt-2 text-3xl font-bold text-red-400">
                    {rescisoesVencidas.length}
                  </p>
                </div>

                <div className="rounded-xl border border-yellow-700 bg-zinc-950 p-5">
                  <p className="text-sm text-zinc-400">Vencem hoje</p>
                  <p className="mt-2 text-3xl font-bold text-yellow-400">
                    {rescisoesVencemHoje.length}
                  </p>
                </div>

                <div className="rounded-xl border border-orange-700 bg-zinc-950 p-5">
                  <p className="text-sm text-zinc-400">1 dia</p>
                  <p className="mt-2 text-3xl font-bold text-orange-400">
                    {rescisoesVencemEm1Dia.length}
                  </p>
                </div>

                <div className="rounded-xl border border-blue-700 bg-zinc-950 p-5">
                  <p className="text-sm text-zinc-400">2 dias</p>
                  <p className="mt-2 text-3xl font-bold text-blue-400">
                    {rescisoesVencemEm2Dias.length}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-700 bg-zinc-950 p-5">
                  <p className="text-sm text-zinc-400">4 dias</p>
                  <p className="mt-2 text-3xl font-bold text-emerald-400">
                    {rescisoesVencemEm4Dias.length}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-zinc-800 text-left">
                      <th className="p-4">Matrícula</th>
                      <th className="p-4">Nome</th>
                      <th className="p-4">Empresa</th>
                      <th className="p-4">Pagamento</th>
                      <th className="p-4">Prazo</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rescisoesCriticas.map((r) => (
                      <tr key={r.id} className="border-b border-zinc-800">
                        <td className="p-4">{r.matricula}</td>
                        <td className="p-4 font-bold">{r.Nome}</td>
                        <td className="p-4">{r.Empresa}</td>
                        <td className="p-4">{r.prazo_pagamento || "-"}</td>
                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-bold ${classePrazo(
                              r.prazo_pagamento
                            )}`}
                          >
                            {textoPrazo(r.prazo_pagamento)}
                          </span>
                        </td>
                        <td className="p-4">{r.status || "Pendente"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {rescisoesCriticas.length === 0 && (
                  <p className="mt-4 text-center text-zinc-500">
                    Nenhuma rescisão vencida, vencendo hoje, em 1 dia, em 2 dias ou em 4 dias.
                  </p>
                )}
              </div>
            </div>
          </Modal>
        )}

        {mostrarConfigAlertas && (
          <Modal onClose={() => setMostrarConfigAlertas(false)}>
            <div className="rounded-xl border border-orange-800 bg-zinc-900 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-orange-400">
                Configurar Alertas
              </h2>
              <p className="text-zinc-400">
                Cadastre alertas padrão ou alertas específicos por motivo.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Nome do alerta
                </label>
                <input
                  value={nomeAlerta}
                  onChange={(e) => setNomeAlerta(e.target.value)}
                  placeholder="Ex: Aviso financeiro"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Email que receberá
                </label>
                <input
                  type="email"
                  value={emailAlerta}
                  onChange={(e) => setEmailAlerta(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Avisar com quantos dias antes
                </label>
                <input
                  type="number"
                  min="0"
                  value={diasAntesAlerta}
                  onChange={(e) => setDiasAntesAlerta(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Tipo do alerta
                </label>
                <select
                  value={tipoAlerta}
                  onChange={(e) => setTipoAlerta(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-orange-500"
                >
                  <option>Padrão</option>
                  <option>Específico</option>
                </select>
              </div>

              {tipoAlerta === "Específico" && (
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">
                    Motivo específico
                  </label>
                  <select
                    value={motivoAlerta}
                    onChange={(e) => setMotivoAlerta(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-orange-500"
                  >
                    {motivosAlerta.map((motivo) => (
                      <option key={motivo}>{motivo}</option>
                    ))}
                  </select>
                </div>
              )}

              {tipoAlerta === "Específico" &&
                motivoAlerta === "Observação contém palavra" && (
                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">
                      Palavra na observação
                    </label>
                    <input
                      value={palavraChaveAlerta}
                      onChange={(e) => setPalavraChaveAlerta(e.target.value)}
                      placeholder="Ex: urgência"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-orange-500"
                    />
                  </div>
                )}
            </div>

            <button
              onClick={cadastrarAlertaPagamento}
              className="mt-6 rounded-lg bg-orange-600 px-5 py-3 font-bold text-white hover:bg-orange-700"
            >
              Cadastrar alerta
            </button>

            <div className="mt-8">
              <h3 className="mb-3 text-lg font-bold">Alertas cadastrados</h3>

              <div className="space-y-3">
                {alertasPagamento.length === 0 && (
                  <p className="text-zinc-500">Nenhum alerta cadastrado.</p>
                )}

                {alertasPagamento.map((alerta) => (
                  <div
                    key={alerta.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-white">{alerta.nome}</p>
                        <p className="text-sm text-zinc-400">
                          {alerta.email_destino} • {alerta.dias_antes} dia(s)
                          antes • {alerta.tipo} • {alerta.motivo}
                          {alerta.palavra_chave
                            ? ` • Palavra: ${alerta.palavra_chave}`
                            : ""}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => alternarAlertaPagamento(alerta)}
                          className={`rounded-lg px-4 py-2 text-sm font-bold ${
                            alerta.ativo
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-zinc-700 hover:bg-zinc-600"
                          }`}
                        >
                          {alerta.ativo ? "Ativo" : "Inativo"}
                        </button>

                        <button
                          onClick={() => excluirAlertaPagamento(alerta.id)}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-700"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 rounded-lg border border-orange-800 bg-zinc-950 p-4">
              <h3 className="mb-3 text-lg font-bold text-orange-400">
                Prévia de alertas que seriam enviados hoje
              </h3>

              <div className="space-y-2">
                {previsoesAlertas.length === 0 && (
                  <p className="text-zinc-500">
                    Nenhum alerta previsto para as regras atuais.
                  </p>
                )}

                {previsoesAlertas.slice(0, 20).map(({ alerta, rescisao }) => (
                  <div
                    key={`${alerta.id}-${rescisao.id}`}
                    className="rounded-lg bg-zinc-900 p-3 text-sm text-zinc-300"
                  >
                    <strong>{alerta.nome}</strong> para
                    <strong> {alerta.email_destino}</strong> — {rescisao.Nome} /
                    {" "}
                    {rescisao.Empresa} — {textoPrazo(rescisao.prazo_pagamento)}
                  </div>
                ))}
              </div>
            </div>
            </div>
          </Modal>
        )}

        {mostrarTiposDesligamento && (
          <ModalFrente onClose={() => setMostrarTiposDesligamento(false)}>
            <div className="rounded-xl border border-blue-800 bg-zinc-900 p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-blue-400">
                    Tipos de Desligamento
                  </h2>
                  <p className="text-zinc-400">
                    Cadastre as opções que aparecerão na lista suspensa da nova rescisão.
                  </p>
                </div>

                <button
                  onClick={() => setMostrarTiposDesligamento(false)}
                  className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-700"
                >
                  Fechar
                </button>
              </div>

              <div className="mb-6 flex flex-col gap-2 md:flex-row">
                <input
                  value={novoTipoDesligamento}
                  onChange={(e) => setNovoTipoDesligamento(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") adicionarTipoDesligamento();
                  }}
                  placeholder="Ex: Dispensa sem justa causa"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-blue-500"
                />

                <button
                  onClick={adicionarTipoDesligamento}
                  className="rounded-lg bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700"
                >
                  Adicionar
                </button>
              </div>

              <div className="space-y-3">
                {opcoesTipoDesligamento.length === 0 && (
                  <p className="text-zinc-500">
                    Nenhum tipo de desligamento cadastrado.
                  </p>
                )}

                {opcoesTipoDesligamento.map((tipo) => (
                  <div
                    key={tipo}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <span className="font-bold">{tipo}</span>

                    <button
                      onClick={() => removerTipoDesligamento(tipo)}
                      className="rounded-lg bg-red-600 px-3 py-2 text-sm font-bold hover:bg-red-700"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </ModalFrente>
        )}

        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-xl font-bold">Rescisões Cadastradas</h2>

          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-zinc-400">
              Buscar por nome ou matrícula
            </label>

            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Digite o nome ou matrícula do funcionário..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-blue-500"
            />
          </div>

          <div className="mb-4">
            <p className="mb-2 text-sm font-bold text-zinc-400">
              Filtrar por status
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFiltroStatus("Todos")}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  filtroStatus === "Todos"
                    ? "bg-green-600 text-white"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                Todos
              </button>

              {statusOpcoes.map((status) => (
                <button
                  key={status}
                  onClick={() => setFiltroStatus(status)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    filtroStatus === status
                      ? "bg-green-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <p className="mb-2 text-sm font-bold text-zinc-400">
            Filtrar por mês de pagamento
          </p>

          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setAbaPagamento("Todas")}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                abaPagamento === "Todas"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              Todas ({totalRescisoes})
            </button>

            {abasPagamento
              .filter((aba) => aba.chave !== "Todas")
              .map((aba) => (
                <button
                  key={aba.chave}
                  onClick={() => setAbaPagamento(aba.chave)}
                  className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                    abaPagamento === aba.chave
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {aba.nome} ({aba.total})
                </button>
              ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-0 border-collapse">
              <thead>
                <tr className="bg-zinc-800 text-left">
                  <th className="p-4">Empresa</th>
                  <th className="p-4">Matrícula</th>
                  <th className="p-4">Nome</th>
                  <th className="p-4">Demissão</th>
                  <th className="p-4">Pagamento</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Andamento</th>
                  <th className="p-4">Valores</th>
                  <th className="p-4">Ações</th>
                </tr>
              </thead>

              <tbody>
                {rescisoesFiltradas.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-zinc-800 hover:bg-zinc-800"
                  >
                    <td className="p-4">{r.Empresa}</td>
                    <td className="p-4">{r.matricula}</td>
                    <td className="p-4">{r.Nome}</td>
                    <td className="p-4">{r.data_desligamento}</td>
                    <td className="p-4">{r.prazo_pagamento}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-zinc-800 px-3 py-1 text-sm font-bold text-white">
                        {r.status || "Pendente"}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-blue-400">
                      {progressoAndamento(r)}
                    </td>
                    <td className="p-4 text-sm">
                      <p>Líquido: {formatarMoeda(r.valor_liquido)}</p>
                      <p>FGTS: {formatarMoeda(r.valor_fgts)}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setRescisaoSelecionada(r)}
                          className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-bold hover:bg-zinc-600"
                        >
                          Ver detalhes
                        </button>

                        <button
                          onClick={() => abrirAndamento(r)}
                          className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-bold hover:bg-purple-700"
                        >
                          Andamento
                        </button>

                        <button
                          onClick={() => abrirValores(r)}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold hover:bg-emerald-700"
                        >
                          Valores
                        </button>

                        <button
                          onClick={() => abrirObservacao(r)}
                          className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-bold hover:bg-yellow-700"
                        >
                          Observação
                        </button>

                        <button
                          onClick={() => iniciarEdicao(r)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold hover:bg-blue-700"
                        >
                          Editar
                        </button>

                        <button
                          onClick={() => excluirRescisao(r.id)}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-700"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {rescisoesFiltradas.length === 0 && (
              <p className="mt-4 text-center text-zinc-500">
                Nenhuma rescisão encontrada nesta busca ou filtro.
              </p>
            )}
          </div>
        </div>

        {mostrarFormulario && (
          <Modal onClose={cancelarEdicao}>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-xl font-bold">
                {editandoId ? "Editar Rescisão" : "Nova Rescisão"}
              </h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {input("Empresa", "Empresa")}
                {input("matricula", "Matrícula")}
                {input("Nome", "Nome")}
                {input("lotacao", "Lotação")}
                {input("data_admissao", "Admissão", "date")}
                {input("data_desligamento", "Demissão", "date")}
                {input("prazo_pagamento", "Pagamento", "date")}
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label className="block text-sm text-zinc-400">
                      Tipo de Desligamento
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        setMostrarTiposDesligamento(!mostrarTiposDesligamento)
                      }
                      className="text-xs font-bold text-blue-400 hover:text-blue-300"
                    >
                      Cadastrar opções
                    </button>
                  </div>

                  <select
                    value={form.tipo_desligamento}
                    onChange={(e) =>
                      atualizarCampo("tipo_desligamento", e.target.value)
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione</option>
                    {opcoesTipoDesligamento.map((opcao) => (
                      <option key={opcao} value={opcao}>
                        {opcao}
                      </option>
                    ))}
                  </select>
                </div>

                {select("cumprimento_aviso", "Cumprimento do Aviso", [
                  "Não",
                  "Sim",
                ])}

                {form.cumprimento_aviso === "Sim" &&
                  input("dia_cumprimento", "Dia do cumprimento", "date")}

                {form.cumprimento_aviso === "Sim" &&
                  select("reducao_aviso", "Redução", opcoesReducaoAviso)}

                {input("funcao", "Função")}
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">Salário</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.salario}
                    onChange={(e) => atualizarSalario(e.target.value)}
                    placeholder="R$ 0,00"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-blue-500"
                  />
                </div>

                {select("plano_saude", "Plano de Saúde", ["Sim", "Não"])}
                {form.plano_saude === "Sim" &&
                  input("observacao_plano_saude", "Qual plano de saúde?")}

                {select("plano_odonto", "Plano Odonto", ["Sim", "Não"])}
                {form.plano_odonto === "Sim" &&
                  input("observacao_plano_odonto", "Qual plano odontológico?")}

                {select("econsignado", "eConsignado", ["Sim", "Não"])}
                {select("aso", "ASO", ["EM DIA", "Vencido"])}
                {form.aso === "Vencido" &&
                  input(
                    "data_agendamento_aso",
                    "Data do agendamento do ASO",
                    "date"
                  )}

                {select("devolucao_equipamentos", "Devolução Equipamentos", [
                  "Não possui",
                  "Retirada pelo portador",
                  "Solicitado devolução",
                ])}

                {select("prestserv", "PRESTSERV", ["Sim", "Não"])}
                {select("guia_sd", "Guia SD", ["Sim", "Não"])}
                {select("fgts", "FGTS", ["Mensal", "Mensal + Multa"])}
                {input("email", "Email", "email")}
                {input("kit_demissional", "Kit Demissional", "date")}
                {input("homologacao", "Homologação", "date")}

                <div className="md:col-span-3">
                  <label className="mb-1 block text-sm text-zinc-400">
                    Observação
                  </label>
                  <textarea
                    value={(form as any).observacao}
                    onChange={(e) =>
                      atualizarCampo("observacao", e.target.value)
                    }
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-blue-500"
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={editandoId ? salvarEdicao : cadastrarRescisao}
                  className="rounded-lg bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
                >
                  {editandoId ? "Salvar alterações" : "Cadastrar"}
                </button>

                <button
                  onClick={cancelarEdicao}
                  className="rounded-lg bg-zinc-700 px-5 py-3 font-bold text-white hover:bg-zinc-600"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </Modal>
        )}

        {rescisaoValores && (
          <Modal onClose={() => setRescisaoValores(null)}>
            <div className="rounded-xl border border-emerald-700 bg-zinc-900 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-emerald-400">
                    Valores da Rescisão
                  </h2>
                  <p className="text-zinc-400">
                    {rescisaoValores.Nome} - {rescisaoValores.Empresa}
                  </p>
                </div>

                <button
                  onClick={() => setRescisaoValores(null)}
                  className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-700"
                >
                  Fechar
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">
                    Valor líquido da rescisão
                  </label>
                  <input
                    value={valorLiquidoTemp}
                    onChange={(e) => setValorLiquidoTemp(e.target.value)}
                    placeholder="Ex: 1.500,00"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm text-zinc-400">
                    Valor do FGTS
                  </label>
                  <input
                    value={valorFgtsTemp}
                    onChange={(e) => setValorFgtsTemp(e.target.value)}
                    placeholder="Ex: 800,00"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-sm text-zinc-400">Total desta rescisão</p>
                <p className="mt-1 text-2xl font-bold text-emerald-400">
                  {formatarMoeda(
                    converterValor(valorLiquidoTemp) +
                      converterValor(valorFgtsTemp)
                  )}
                </p>
              </div>

              <button
                onClick={salvarValores}
                className="mt-6 rounded-lg bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
              >
                Salvar valores
              </button>
            </div>
          </Modal>
        )}

        {mostrarRelatorio && (
          <Modal onClose={() => setMostrarRelatorio(false)}>
            <div className="rounded-xl border border-emerald-700 bg-zinc-900 p-6">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-emerald-400">
                    Relatório de Pagamentos
                  </h2>
                  <p className="text-zinc-400">
                    Totais por mês de pagamento ou geral
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={gerarPDFRelatorio}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-bold hover:bg-blue-700"
                  >
                    Gerar PDF
                  </button>

                  <button
                    onClick={() => setMostrarRelatorio(false)}
                    className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-700"
                  >
                    Fechar
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-2 block text-sm font-bold text-zinc-400">
                  Filtrar relatório
                </label>

                <select
                  value={abaRelatorio}
                  onChange={(e) => setAbaRelatorio(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-emerald-500"
                >
                  {abasPagamento.map((aba) => (
                    <option key={aba.chave} value={aba.chave}>
                      {aba.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div ref={relatorioPDFRef} className="rounded-xl bg-zinc-900 p-4">
                <div className="mb-6 border-b border-zinc-800 pb-4">
                  <h3 className="text-2xl font-bold text-white">Rescisões Líder</h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Relatório financeiro de pagamentos
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Filtro aplicado: {abasPagamento.find((aba) => aba.chave === abaRelatorio)?.nome || abaRelatorio}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                    <p className="text-sm text-zinc-400">Rescisão</p>
                    <p className="mt-2 text-2xl font-bold text-blue-400">
                      {formatarMoeda(totalLiquidoRelatorio)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                    <p className="text-sm text-zinc-400">Total FGTS</p>
                    <p className="mt-2 text-2xl font-bold text-yellow-400">
                      {formatarMoeda(totalFgtsRelatorio)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
                    <p className="text-sm text-zinc-400">Total geral pago</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-400">
                      {formatarMoeda(totalGeralRelatorio)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-zinc-800 text-left">
                        <th className="p-4">Matrícula</th>
                        <th className="p-4">Nome</th>
                        <th className="p-4">Pagamento</th>
                        <th className="p-4">Líquido</th>
                        <th className="p-4">FGTS</th>
                        <th className="p-4">Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rescisoesRelatorio.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-zinc-800 hover:bg-zinc-800"
                        >
                          <td className="p-4">{r.matricula}</td>
                          <td className="p-4">{r.Nome}</td>
                          <td className="p-4">{r.prazo_pagamento || "-"}</td>
                          <td className="p-4">
                            {formatarMoeda(r.valor_liquido)}
                          </td>
                          <td className="p-4">
                            {formatarMoeda(r.valor_fgts)}
                          </td>
                          <td className="p-4 font-bold text-emerald-400">
                            {formatarMoeda(
                              Number(r.valor_liquido || 0) +
                                Number(r.valor_fgts || 0)
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {rescisoesRelatorio.length === 0 && (
                    <p className="mt-4 text-center text-zinc-500">
                      Nenhuma rescisão encontrada neste relatório.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        )}

        {rescisaoAndamento && (
          <Modal onClose={() => setRescisaoAndamento(null)}>
            <div className="rounded-xl border border-purple-800 bg-zinc-900 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-purple-400">
                    Andamento da Rescisão
                  </h2>
                  <p className="text-zinc-400">
                    {rescisaoAndamento.Nome} - {rescisaoAndamento.Empresa}
                  </p>
                </div>

                <button
                  onClick={() => setRescisaoAndamento(null)}
                  className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-700"
                >
                  Fechar
                </button>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <input
                  value={novoItemIndividual}
                  onChange={(e) => setNovoItemIndividual(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") adicionarItemIndividual();
                  }}
                  placeholder="Adicionar item específico para este funcionário"
                  className="min-w-[260px] flex-1 rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-white outline-none focus:border-purple-500"
                />

                <button
                  onClick={adicionarItemIndividual}
                  className="rounded-lg bg-green-600 px-4 py-2 font-bold hover:bg-green-700"
                >
                  Adicionar item
                </button>
              </div>

              <div className="space-y-3">
                {andamentoTemp.length === 0 && (
                  <p className="text-zinc-500">
                    Nenhum item no checklist. Configure o checklist padrão.
                  </p>
                )}

                {andamentoTemp.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.feito}
                        onChange={() => marcarItemAndamento(index)}
                        className="h-5 w-5"
                      />

                      <span
                        className={
                          item.feito
                            ? "font-bold text-green-400 line-through"
                            : "font-bold text-white"
                        }
                      >
                        {item.titulo}
                      </span>
                    </label>

                    <button
                      onClick={() => removerItemAndamento(index)}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold hover:bg-red-700"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={salvarAndamento}
                className="mt-6 rounded-lg bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
              >
                Salvar andamento
              </button>
            </div>
          </Modal>
        )}

        {rescisaoObservacao && (
          <Modal onClose={() => setRescisaoObservacao(null)}>
            <div className="rounded-xl border border-yellow-700 bg-zinc-900 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-yellow-400">
                    Observação da Rescisão
                  </h2>
                  <p className="text-zinc-400">
                    {rescisaoObservacao.Nome} - {rescisaoObservacao.Empresa}
                  </p>
                </div>

                <button
                  onClick={() => setRescisaoObservacao(null)}
                  className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-700"
                >
                  Fechar
                </button>
              </div>

              <textarea
                value={observacaoTemp}
                onChange={(e) => setObservacaoTemp(e.target.value)}
                placeholder="Digite uma observação sobre esta rescisão..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-4 text-white outline-none focus:border-yellow-500"
                rows={8}
              />

              <button
                onClick={salvarObservacao}
                className="mt-6 rounded-lg bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
              >
                Salvar observação
              </button>
            </div>
          </Modal>
        )}

        {rescisaoSelecionada && (
          <Modal onClose={() => setRescisaoSelecionada(null)}>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Ficha da Rescisão</h2>
                  <p className="text-zinc-400">{rescisaoSelecionada.Nome}</p>
                </div>

                <button
                  onClick={() => setRescisaoSelecionada(null)}
                  className="rounded-lg bg-red-600 px-4 py-2 font-bold hover:bg-red-700"
                >
                  Fechar
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {detalhe("Empresa", rescisaoSelecionada.Empresa)}
                {detalhe("Matrícula", rescisaoSelecionada.matricula)}
                {detalhe("Nome", rescisaoSelecionada.Nome)}
                {detalhe("Lotação", rescisaoSelecionada.lotacao)}
                {detalhe("Admissão", rescisaoSelecionada.data_admissao)}
                {detalhe("Demissão", rescisaoSelecionada.data_desligamento)}
                {detalhe("Pagamento", rescisaoSelecionada.prazo_pagamento)}
                {detalhe(
                  "Tipo de Desligamento",
                  rescisaoSelecionada.tipo_desligamento
                )}
                {detalhe(
                  "Cumprimento do Aviso",
                  rescisaoSelecionada.cumprimento_aviso
                )}
                {detalhe("Função", rescisaoSelecionada.funcao)}
                {detalhe("Salário", formatarMoeda(rescisaoSelecionada.salario))}
                {detalhe("Plano de Saúde", rescisaoSelecionada.plano_saude)}

                {rescisaoSelecionada.plano_saude === "Sim" &&
                  detalhe(
                    "Qual plano de saúde?",
                    rescisaoSelecionada.observacao_plano_saude
                  )}

                {detalhe("Plano Odonto", rescisaoSelecionada.plano_odonto)}

                {rescisaoSelecionada.plano_odonto === "Sim" &&
                  detalhe(
                    "Qual plano odontológico?",
                    rescisaoSelecionada.observacao_plano_odonto
                  )}

                {detalhe("eConsignado", rescisaoSelecionada.econsignado)}
                {detalhe("ASO", rescisaoSelecionada.aso)}

                {rescisaoSelecionada.aso === "Vencido" &&
                  detalhe(
                    "Data do agendamento do ASO",
                    rescisaoSelecionada.data_agendamento_aso
                  )}

                {detalhe(
                  "Devolução Equipamentos",
                  rescisaoSelecionada.devolucao_equipamentos
                )}
                {detalhe("PRESTSERV", rescisaoSelecionada.prestserv)}
                {detalhe("Guia SD", rescisaoSelecionada.guia_sd)}
                {detalhe("FGTS", rescisaoSelecionada.fgts)}
                {detalhe("Email", rescisaoSelecionada.email)}
                {detalhe("Kit Demissional", rescisaoSelecionada.kit_demissional)}
                {detalhe("Homologação", rescisaoSelecionada.homologacao)}
                {detalhe("Status", rescisaoSelecionada.status)}
                {detalhe(
                  "Valor líquido",
                  formatarMoeda(rescisaoSelecionada.valor_liquido)
                )}
                {detalhe(
                  "Valor FGTS",
                  formatarMoeda(rescisaoSelecionada.valor_fgts)
                )}
                {detalhe(
                  "Total pago",
                  formatarMoeda(
                    Number(rescisaoSelecionada.valor_liquido || 0) +
                      Number(rescisaoSelecionada.valor_fgts || 0)
                  )
                )}

                <div className="md:col-span-3">
                  {detalhe("Observação", rescisaoSelecionada.observacao)}
                </div>
              </div>
            </div>
          </Modal>
        )}

      </div>
    </main>
  );
}