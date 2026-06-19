"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AndamentoItem = {
  titulo: string;
  feito: boolean;
};

type ChecklistPadrao = {
  id: number;
  titulo: string;
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
  andamento?: AndamentoItem[];
};

const statusOpcoes = ["Pendente", "Em cálculo", "Finalizado"];

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
  cumprimento_aviso: "",
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [carregandoLogin, setCarregandoLogin] = useState(false);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [rescisoes, setRescisoes] = useState<Rescisao[]>([]);
  const [rescisaoSelecionada, setRescisaoSelecionada] =
    useState<Rescisao | null>(null);

  const [rescisaoAndamento, setRescisaoAndamento] =
    useState<Rescisao | null>(null);
  const [andamentoTemp, setAndamentoTemp] = useState<AndamentoItem[]>([]);

  const [rescisaoObservacao, setRescisaoObservacao] =
    useState<Rescisao | null>(null);
  const [observacaoTemp, setObservacaoTemp] = useState("");

  const [checklistPadrao, setChecklistPadrao] = useState<ChecklistPadrao[]>([]);
  const [novoItemPadrao, setNovoItemPadrao] = useState("");
  const [mostrarConfigChecklist, setMostrarConfigChecklist] = useState(false);

  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState(formInicial);
  const [abaPagamento, setAbaPagamento] = useState("Todas");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [busca, setBusca] = useState("");

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
    setChecklistPadrao([]);
    setMostrarFormulario(false);
    setRescisaoSelecionada(null);
    setRescisaoAndamento(null);
    setRescisaoObservacao(null);
  }

  function formatarData(data: Date) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
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

    setForm(novoForm);
  }

  function criarAbasPagamento() {
    const mapa = new Map<string, string>();

    rescisoes.forEach((rescisao) => {
      if (!rescisao.prazo_pagamento) {
        mapa.set("Sem pagamento", "Sem pagamento");
        return;
      }

      const [ano, mes] = rescisao.prazo_pagamento.split("-");
      const chave = `${ano}-${mes}`;
      const nomeMes = meses[Number(mes) - 1];

      mapa.set(chave, `${nomeMes}/${ano}`);
    });

    const abasOrdenadas = Array.from(mapa.entries()).sort(([a], [b]) => {
      if (a === "Sem pagamento") return 1;
      if (b === "Sem pagamento") return -1;
      return a.localeCompare(b);
    });

    return [
      { chave: "Todas", nome: "Todas", total: rescisoes.length },
      ...abasOrdenadas.map(([chave, nome]) => ({
        chave,
        nome,
        total:
          chave === "Sem pagamento"
            ? rescisoes.filter((r) => !r.prazo_pagamento).length
            : rescisoes.filter((r) =>
                r.prazo_pagamento?.startsWith(chave)
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
      : rescisoes.filter((r) => r.prazo_pagamento?.startsWith(abaPagamento));

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
      ...form,
      salario: form.salario === "" ? null : Number(form.salario),
      status: "Pendente",
      andamento: gerarChecklistPadrao(),
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

    setForm({
      Empresa: rescisao.Empresa || "",
      matricula: rescisao.matricula || "",
      Nome: rescisao.Nome || "",
      lotacao: rescisao.lotacao || "",
      data_admissao: rescisao.data_admissao || "",
      data_desligamento: rescisao.data_desligamento || "",
      prazo_pagamento: rescisao.prazo_pagamento || "",
      tipo_desligamento: rescisao.tipo_desligamento || "",
      cumprimento_aviso: rescisao.cumprimento_aviso || "",
      funcao: rescisao.funcao || "",
      salario: rescisao.salario ? String(rescisao.salario) : "",
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

    const dados = {
      ...form,
      salario: form.salario === "" ? null : Number(form.salario),
    };

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

    carregarRescisoes();
  }

  function abrirAndamento(rescisao: Rescisao) {
    setRescisaoAndamento(rescisao);

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
    async function verificarSessao() {
      const { data } = await supabase.auth.getSession();

      setSession(data.session);
      setCarregandoSessao(false);

      if (data.session) {
        carregarRescisoes();
        carregarChecklistPadrao();
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
            Acesse o Sistema de Controle de Rescisões
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
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto w-full max-w-[95vw]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">
              Sistema de Controle de Rescisões
            </h1>
            <p className="mt-2 text-zinc-400">Bem-vindo ao sistema, Rennan.</p>
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
        </div>

        {mostrarConfigChecklist && (
          <div className="mt-6 rounded-xl border border-purple-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-xl font-bold text-purple-400">
              Checklist Padrão
            </h2>

            <div className="mb-4 flex gap-2">
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

            <button
              onClick={aplicarChecklistPadraoEmTodas}
              className="mt-6 rounded-lg bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700"
            >
              Aplicar checklist padrão em todas as rescisões
            </button>
          </div>
        )}

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
                {input("tipo_desligamento", "Tipo de Desligamento")}
                {input("cumprimento_aviso", "Cumprimento do Aviso")}
                {input("funcao", "Função")}
                {input("salario", "Salário", "number")}

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
                {input("kit_demissional", "Kit Demissional")}
                {input("homologacao", "Homologação")}

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
            {abasPagamento.map((aba) => (
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
                    <td className="p-4">
                      <div className="flex gap-2">
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

              <div className="space-y-3">
                {andamentoTemp.length === 0 && (
                  <p className="text-zinc-500">
                    Nenhum item no checklist. Configure o checklist padrão.
                  </p>
                )}

                {andamentoTemp.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
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
                {detalhe("Salário", rescisaoSelecionada.salario)}
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