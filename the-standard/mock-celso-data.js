// Perfil real de teste: Celso Graciano de Almeida Junior.
// Mantem o mesmo contrato de dados usado por app.js.
const MOCK = {
  aluno: {
    id: "stu_celso_graciano",
    nome: "Celso Graciano de Almeida Junior",
    email: "celsoalmeidajunior@gmail.com"
  },
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
  financeiro: {
    lancamentos: [
      {
        id: "fin_001",
        curso_id: "medidores-vazao",
        descricao: "Medidores de Vazão com Ênfase em Manutenção e Operação",
        valor: 550,
        status: "Pago",
        pago_em: "2026-06-04",
        validade_inicio: "2026-06-04",
        validade_ate: "2027-06-04",
        validacao: "manual",
        comprovante_url: "#"
      }
    ]
  },
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
  cursos: [
    {
      id: "medidores-vazao",
      titulo: "Medidores de Vazão com Ênfase em Manutenção e Operação",
      capa: "assets/capa-medidores.png",
      descricao: "Princípios, operação, manutenção e interpretação de medidores de vazão em produção.",
      liberado_em: "2026-06-04",
      progresso: 100,
      materiais: [
        { id: "m8", tipo: "documento", formato: "pdf", titulo: "Apostila completa, 5 módulos", url: "#" },
        { id: "m9", tipo: "documento", formato: "pdf", titulo: "Ementa do curso", url: "#" },
        {
          id: "medidores-aula-1",
          url: "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=f60b1b63-c079-49fc-867b-f97beccb0f02",
          tipo: "video",
          titulo: "Aula 1",
          descricao: "Fundamentos dos medidores de vazão, princípios de medição e aplicações na rotina operacional.",
          duracao: "Vídeo liberado"
        },
        {
          id: "medidores-aula-2-parte-1",
          url: "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=71e94ef6-e84b-47cb-a486-c95e350e607e",
          tipo: "video",
          titulo: "Aula 2 - Parte 1",
          descricao: "Operação, comportamento dos instrumentos e leitura crítica de sinais em sistemas de medição.",
          duracao: "Vídeo liberado"
        },
        {
          id: "medidores-aula-2-parte-2",
          url: "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=558a32d5-471f-4429-8e17-81e55858b297",
          tipo: "video",
          titulo: "Aula 2 - Parte 2",
          descricao: "Continuação da Aula 2, com interpretação de condições de campo e análise de desempenho.",
          duracao: "Vídeo liberado"
        },
        {
          id: "medidores-aula-3",
          url: "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=ff5a52bd-03a6-4ff3-bb17-f1e6c9044488",
          tipo: "video",
          titulo: "Aula 3",
          descricao: "Manutenção, falhas comuns, diagnóstico e boas práticas para decisão técnica.",
          duracao: "Vídeo liberado"
        },
        {
          id: "medidores-aula-4",
          url: "https://player-vz-b9ef5310-065.tv.pandavideo.com.br/embed/?v=a89f78bc-3397-48a0-b671-b833a63220f5",
          tipo: "video",
          titulo: "Aula 4",
          descricao: "Fechamento do treinamento, revisão aplicada e consolidação dos pontos críticos de operação.",
          duracao: "Vídeo liberado"
        },
        { id: "m11", tipo: "certificado", formato: "pdf", titulo: "Certificado de conclusão", url: "../relatorio-certificacao-exemplo.html", emitido: true }
      ]
    }
  ]
};
