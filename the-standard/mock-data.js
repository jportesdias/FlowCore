// SUPABASE: substituir este arquivo por chamadas autenticadas para students, courses, materials e access.
// SUPABASE: manter o formato de resposta abaixo para evitar refatoracao estrutural do frontend.
const MOCK = {
  aluno: {
    id: "stu_demo",
    nome: "Aluno FlowCore",
    email: "aluno@exemplo.com"
  },
  // SUPABASE: espelha futura consulta em library_collections + library_items por plano/acesso do aluno.
  biblioteca: {
    capa: "../biblioteca.png",
    descricao: "Acervo técnico FlowCore para consulta recorrente em medição, operação e metrologia aplicada.",
    itens: [
      {
        id: "lib_001",
        tipo: "pdf",
        titulo: "Nunca foi certo medir",
        descricao: "Livro técnico FlowCore para leitura e consulta.",
        url: "../nunca-foi-certo-medir.pdf",
        status: "Disponível"
      },
      {
        id: "lib_profissional_excelencia",
        tipo: "livro",
        titulo: "Profissional de Excelência",
        descricao: "Livro FlowCore para desenvolvimento profissional, postura de campo e evoluÃ§Ã£o na carreira tÃ©cnica.",
        url: "https://pay.kiwify.com.br/9TPrEiP",
        status: "Comprar",
        cta: "Comprar agora"
      },
      {
        id: "lib_002",
        tipo: "pdf",
        titulo: "Ementa FlowCore, Medidores de Vazão",
        descricao: "Referência rápida da trilha de medidores de vazão.",
        url: "../Ementa_FlowCore_Medidores_Vazao.pdf",
        status: "Disponível"
      },
      {
        id: "lib_003",
        tipo: "guia",
        titulo: "Guias rápidos de campo",
        descricao: "Checklists e materiais de apoio que serão liberados por perfil de acesso.",
        url: "#",
        status: "Em curadoria"
      }
    ]
  },
  // SUPABASE: espelha futura consulta em access + orders/payments filtrada por student_id.
  financeiro: {
    lancamentos: [
      {
        id: "fin_001",
        curso_id: "medidores-vazao",
        descricao: "Medidores de Vazão para Operadores de Produção",
        valor: 550,
        status: "Pago",
        pago_em: "2026-06-04",
        validade_inicio: "2026-06-04",
        validade_ate: "2027-06-04",
        validacao: "manual",
        comprovante_url: "#"
      },
      {
        id: "fin_002",
        curso_id: "provadores-compactos",
        descricao: "Provadores Compactos & Simulação",
        valor: 600,
        status: "Pago",
        pago_em: "2026-06-18",
        validade_inicio: "2026-06-18",
        validade_ate: "2027-06-18",
        validacao: "manual",
        comprovante_url: "#"
      }
    ]
  },
  // SUPABASE: catalogo publico vem de courses; preco/oferta vem de products/prices ou gateway de pagamento.
  catalogoCursos: [
    {
      id: "medidores-vazao",
      titulo: "Medidores de Vazão",
      capa: "assets/capa-medidores.png",
      descricao: "Fundamentos, operação e leitura crítica de medidores de vazão para rotina industrial.",
      valor: 550,
      status: "Disponível",
      cta: "Comprar",
      url: "https://wa.me/5524998788760"
    },
    {
      id: "medidores-vazao-basico",
      titulo: "Medidores de Vazão Básico",
      capa: "assets/capa-medidores.png",
      descricao: "Curso introdutório sobre conceitos gerais e tecnologias de medição de vazão.",
      valor: null,
      status: "Em breve",
      cta: "Em breve",
      url: "#"
    },
    {
      id: "provadores-compactos",
      titulo: "Provadores Compacto",
      capa: "assets/capa-provadores.png",
      descricao: "Conceitos e prática aplicada para operação, prova e interpretação de resultados com provadores compactos.",
      valor: 600,
      status: "Disponível",
      cta: "Comprar",
      url: "https://wa.me/5524998788760"
    },
    {
      id: "ia-dominio-tecnico",
      titulo: "IA para Domínio Técnico",
      capa: "assets/IA-domnio.png",
      descricao: "Uso prático de IA para acelerar estudo, consulta técnica e domínio de documentação industrial.",
      valor: 97,
      status: "Disponível",
      cta: "Comprar",
      url: "https://wa.me/5524998788760"
    },
    {
      id: "placa-orificio",
      titulo: "Curso de Medidores por Placa de Orifício",
      capa: "assets/spoiler-breve.png",
      descricao: "Curso dedicado à medição por placa de orifício. Produto em preparação.",
      valor: null,
      status: "Em breve",
      cta: "Em breve",
      url: "#"
    },
    {
      id: "computadores-vazao",
      titulo: "Curso de Computadores de Vazão",
      capa: "assets/computador-vazao2.png",
      descricao: "Aplicação prática de computadores de vazão, configuração, operação e interpretação de dados.",
      valor: 650,
      status: "Disponível",
      cta: "Comprar",
      url: "https://wa.me/5524998788760"
    }
  ],
  // SUPABASE: esta lista deve vir da policy de access filtrada por auth.users.
  cursos: [
    {
      id: "provadores-compactos",
      titulo: "Provadores Compactos & Simulação",
      capa: "assets/capa-provadores.png",
      descricao: "Calibração de medidores com provadores compactos e simulação operacional.",
      liberado_em: "2026-06-18",
      progresso: 42,
      materiais: [
        { id: "provadores-aula-1", tipo: "video", titulo: "Aula 1", descricao: "Fundamentos de provadores compactos, operacao e aplicacoes na rotina de calibracao.", url: "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=bc71d81e-d946-4e5d-a04c-78bfd3a76707", duracao: "Video liberado" },
        { id: "provadores-aula-2", tipo: "video", titulo: "Aula 2", descricao: "Procedimentos operacionais, corridas de prova e interpretacao dos resultados.", url: "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=4958dc8a-5948-457a-bbad-41ea1be8f2da", duracao: "Video liberado" },
        { id: "provadores-aula-3", tipo: "video", titulo: "Aula 3", descricao: "Fechamento do treinamento com revisao aplicada e consolidacao dos pontos operacionais.", url: "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=bcdcaeab-87b9-453f-9af0-1944bc247de1", duracao: "Video liberado" },
        { id: "provadores-aula-4", tipo: "video", titulo: "Aula 4 - Simulador e Certificação", descricao: "Aplicação prática no simulador e orientações para a etapa de certificação do curso.", url: "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=d35c5c0e-6e66-42d0-a2f5-34cd9ac55d9a", duracao: "Vídeo liberado" },
        { id: "provadores-exercicios-calculo", tipo: "documento", formato: "pdf", titulo: "Exercícios de Cálculo", url: "https://drive.google.com/file/d/11t6bbrvsbaCLO1oElwBClw8sXBLXX8BX/view?usp=drive_link" },
        { id: "provadores-apostila-completa", tipo: "documento", formato: "pdf", titulo: "Apostila Completa do Curso", url: "https://drive.google.com/file/d/1izmaQo9z7dDgkzzz5ROxaBMB7_n4ZZO2/view?usp=drive_link" },
        { id: "m2", tipo: "documento", formato: "pdf", titulo: "Ementa do curso", url: "#" },
        { id: "m3", tipo: "documento", formato: "xlsx", titulo: "Planilha de cálculo, fator do medidor", url: "#" },
        { id: "m4", tipo: "video", titulo: "Módulo 1, Fundamentos do provador", url: "#", duracao: "18:42" },
        { id: "m5", tipo: "video", titulo: "Módulo 2, Corridas e erro máximo admissível", url: "#", duracao: "22:10" },
        { id: "provadores-ihm-metering", tipo: "simulador", formato: "web", titulo: "IHM Metering", descricao: "Interface de simulação para a prática do curso de Provadores Compacto.", url: "https://flowcoresolutions.com.br/ihm-metering.html" },
        { id: "m7", tipo: "certificado", formato: "pdf", titulo: "Certificado de conclusão", url: "#", emitido: false }
      ]
    },
    {
      id: "medidores-vazao-basico",
      titulo: "Medidores de Vazão Básico",
      capa: "assets/capa-medidores.png",
      descricao: "Curso introdutório sobre conceitos gerais e tecnologias de medição de vazão.",
      liberado_em: "",
      progresso: 0,
      materiais: [
        { id: "medidores-basico-aula-1", tipo: "video", titulo: "Aula 1 - Conceitos Gerais", descricao: "Introdução aos conceitos fundamentais da medição de vazão.", url: "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=608aa763-53e2-4ca5-8ae0-0b7867b5a3de", duracao: "Vídeo liberado" },
        { id: "medidores-basico-aula-2-parte-1", tipo: "video", titulo: "Aula 2 - Parte 1 - Tecnologias de Medição", descricao: "Apresentação das principais tecnologias utilizadas na medição de vazão.", url: "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=944958cc-fbaf-46a8-9e4a-73d6254442a5", duracao: "Vídeo liberado" },
        { id: "medidores-basico-aula-2-parte-2", tipo: "video", titulo: "Aula 2 - Parte 2 - Tecnologias de Medição", descricao: "Continuação do estudo das tecnologias e de suas aplicações práticas.", url: "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=31c7efcd-057c-4a94-aad0-97fe472c0201", duracao: "Vídeo liberado" }
      ]
    },
    {
      id: "medidores-vazao",
      titulo: "Medidores de Vazão para Operadores de Produção",
      capa: "assets/capa-medidores.png",
      descricao: "Princípios e operação de medidores de vazão em produção.",
      liberado_em: "2026-06-04",
      progresso: 100,
      materiais: [
        { id: "m8", tipo: "documento", formato: "pdf", titulo: "Apostila completa, 5 módulos", url: "#" },
        { id: "m9", tipo: "documento", formato: "pdf", titulo: "Ementa do curso", url: "#" },
        { id: "medidores-aula-1", tipo: "video", titulo: "Aula 1", descricao: "Fundamentos dos medidores de vazão, princípios de medição e aplicações na rotina operacional.", url: "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=54c5db39-f085-4621-abdb-9ec4aff1bae5", duracao: "Vídeo liberado" },
        { id: "medidores-aula-2-parte-1", tipo: "video", titulo: "Aula 2 - Parte 1", descricao: "Em breve", url: "#", duracao: "Em breve" },
        { id: "medidores-aula-2-parte-2", tipo: "video", titulo: "Aula 2 - Parte 2", descricao: "Em breve", url: "#", duracao: "Em breve" },
        { id: "medidores-aula-3", tipo: "video", titulo: "Aula 3", descricao: "Em breve", url: "#", duracao: "Em breve" },
        { id: "medidores-aula-4", tipo: "video", titulo: "Aula 4", descricao: "Em breve", url: "#", duracao: "Em breve" },
        { id: "m11", tipo: "certificado", formato: "pdf", titulo: "Certificado de conclusão", url: "../relatorio-certificacao-exemplo.html", emitido: true }
      ]
    }
  ]
};
