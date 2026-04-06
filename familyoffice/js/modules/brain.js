class FamilyOfficeBrain {
    constructor() {
        // Local mapping for fallback and categorization
        this.mappings = {
            'CUSTO_DE_VIDA': {
                'moradia': ['aluguel', 'condominio', 'iptu', 'reforma', 'obra', 'imovel', 'casa', 'apartamento'],
                'utilidades': ['energia', 'luz', 'agua', 'internet', 'celular', 'gas'],
                'mercado': ['supermercado', 'compras', 'padaria', 'açougue', 'feira', 'carrefour', 'pao de acucar'],
                'transporte': ['uber', '99', 'metro', 'onibus', 'trem', 'estacionamento', 'pedagio'],
                'combustivel': ['posto', 'gasolina', 'etanol', 'diesel', 'gnv', 'shell', 'ipiranga', 'br'],
                'seguros': ['seguro casa', 'seguro auto', 'seguro vida'],
                'saude': ['medico', 'hospital', 'dentista', 'unimed', 'bradesco saude', 'farmacia', 'remedio', 'clinica', 'exame'],
                'educacao': ['escola', 'faculdade', 'curso', 'livro', 'mensalidade', 'aula', 'idioma', 'ingles'],
                'comunicacao': ['celular', 'telefone', 'netflix', 'spotify', 'disney', 'itunes'],
                'impostos': ['iptu', 'ipva', 'irpf', 'imposto'],
                'servicos_domesticos': ['faxina', 'lavanderia', 'manutenção', 'reparo'],
                'cuidados_criancas': ['babá', 'creche', 'escola infantil'],
                'pets': ['pet shop', 'veterinario', 'ração', 'banho e tosa']
            },
            'DIVIDAS_E_OBRIGACOES': {
                'cartao_credito': ['fatura', 'itaucard', 'nubank', 'visa', 'mastercard', 'amex'],
                'emprestimos': ['emprestimo', 'financiamento', 'parcela'],
                'financiamento_veiculo': ['parcela carro', 'bv financeira', 'itau veiculos'],
                'taxas_bancarias': ['tarifa', 'anuidade', 'ted', 'pix taxa']
            },
            'ESTILO_DE_VIDA': {
                'restaurantes': ['restaurante', 'jantar', 'almoço', 'sushi', 'pizza', 'ifood', 'outback', 'mcdonalds'],
                'entretenimento': ['cinema', 'show', 'teatro', 'ingresso', 'clube'],
                'viagens': ['hotel', 'passagem', 'decolar', 'airbnb', 'viagem'],
                'roupas': ['shopping', 'loja', 'roupa', 'zara', 'nike', 'adidas', 'calçado', 'bota'],
                'eletronicos': ['apple', 'samsung', 'celular', 'computador', 'notebook', 'televisao'],
                'assinaturas': ['netflix', 'spotify', 'amazon prime', 'hbo', 'youtube'],
                'hobbies': ['esporte', 'pesca', 'games', 'jogos', 'steam', 'playstation'],
                'presentes': ['presente', 'mimo', 'doação'],
                'cuidados_pessoais': ['barbeiro', 'salao', 'cabeleireiro', 'perfume', 'cosmetico', 'estetica', 'academia', 'trainer'],
                'lazer': ['parque', 'clube', 'festa', 'bar', 'pub', 'vinho', 'cerveja']
            },
            'INVESTIMENTOS_E_PATRIMONIO': {
                'acoes': ['itub4', 'vale3', 'petr4', 'bolsa', 'b3', 'home broker'],
                'renda_fixa': ['cdb', 'tesouro', 'selic', 'poupanca', 'lci', 'lca'],
                'cripto': ['bitcoin', 'btc', 'ethereum', 'eth', 'binance', 'cripto'],
                'fundos': ['fii', 'fundo de investimento', 'xp', 'btg']
            }
        };

        this.isAiProcessing = false;
    }

    isConfigured() {
        const config = window.aiProvider?.config?.providers?.gemini;
        return !!(config && config.apiKey && config.apiKey.trim() !== "");
    }

    categorizeLocal(description) {
        if (!description) return { category: 'CUSTO_DE_VIDA', subcategory: 'outro' };
        const desc = description.toLowerCase().trim();

        for (const [primary, subcats] of Object.entries(this.mappings)) {
            for (const [subcategory, keywords] of Object.entries(subcats)) {
                if (keywords.some(k => desc.includes(k))) {
                    return { category: primary, subcategory: subcategory };
                }
            }
        }
        return { category: 'CUSTO_DE_VIDA', subcategory: 'outro' };
    }

    async processReceipt(file, context = "") {
        if (this.isAiProcessing) throw new Error('REQUEST_ALREADY_IN_FLIGHT');
        
        const base64Data = await this.fileToBase64(file);
        const mimeType = file.type;

        const systemPrompt = "Você é um especialista em OCR financeiro brasileiro.";
        const userPrompt = `Extraia os lançamentos financeiros deste recibo/imagem em formato JSON.
        Taxonomia (CATEGORIAS e Subcategorias):
        1. CUSTO_DE_VIDA: moradia, utilidades, mercado, transporte, combustivel, seguros, saude, educacao, comunicacao, impostos, servicos_domesticos, cuidados_criancas, pets.
        2. DIVIDAS_E_OBRIGACOES: cartao_credito, emprestimos, financiamento_veiculo, taxas_bancarias.
        3. ESTILO_DE_VIDA: restaurantes, entretenimento, viagens, roupas, eletronicos, hobbies, assinaturas, presentes, cuidados_pessoais, lazer.
        4. INVESTIMENTOS_E_PATRIMONIO: acoes, renda_fixa, fundos, cripto.

        Regras:
        - Extraia: detected_receipt_date (ISO YYYY-MM-DD), descrição (local), valor (number), tipo (income ou expense).
        - Retorne uma LISTA de objetos JSON: [{"detected_receipt_date": "...", "description": "...", "value": 0.00, "type": "expense", "category": "...", "subcategory": "..."}]
        - Retorne APENAS o JSON puro.`;

        this.isAiProcessing = true;
        try {
            const result = await window.aiProvider.execute({
                taskType: 'ocr',
                systemPrompt,
                userPrompt: userPrompt + (context ? `\nContexto: ${context}` : ''),
                image: {
                    mimeType,
                    data: base64Data.split(',')[1]
                },
                responseFormat: 'json'
            });

            if (!result.success) throw new Error(result.errorType || 'UNKNOWN_API_ERROR');

            const parsedResults = Array.isArray(result.data) ? result.data : [result.data];
            return parsedResults.map(r => this.normalizeEntry(r));
        } finally {
            this.isAiProcessing = false;
        }
    }

    async processEntry(description, type = 'expense') {
        if (this.isAiProcessing) return this.getFallback(description, type, 'REQUEST_IN_FLIGHT');

        const systemPrompt = "Você é um especialista em classificação financeira brasileira.";
        const userPrompt = `Analise a transação financeira abaixo e retorne APENAS um objeto JSON.
        Descrição: "${description}"
        Taxonomia: CUSTO_DE_VIDA, DIVIDAS_E_OBRIGACOES, ESTILO_DE_VIDA, INVESTIMENTOS_E_PATRIMONIO.
        Retorne: {"type": "expense/income", "category": "...", "subcategory": "..."}`;

        this.isAiProcessing = true;
        try {
            const result = await window.aiProvider.execute({
                taskType: 'classification',
                systemPrompt,
                userPrompt,
                responseFormat: 'json'
            });

            if (!result.success) return this.getFallback(description, type, result.errorType);

            return this.parseAIResponse(result.data);
        } catch (error) {
            return this.getFallback(description, type, 'api_error');
        } finally {
            this.isAiProcessing = false;
        }
    }

    async fetchMarketIndices() {
        if (this.isAiProcessing) throw new Error('REQUEST_ALREADY_IN_FLIGHT');

        const userPrompt = `
            Forneça as taxas anuais ATUAIS dos indicadores financeiros no Brasil: CDI, SELIC, LCI, LCA, CDB, IPCA+.
            Retorne APENAS JSON numérico:
            {"cdi": 0.0, "selic": 0.0, "lci": 0.0, "lca": 0.0, "cdb": 0.0, "ipca_plus": 0.0}
        `;

        this.isAiProcessing = true;
        try {
            const result = await window.aiProvider.execute({
                taskType: 'market_indices',
                userPrompt,
                responseFormat: 'json'
            });

            if (!result.success) throw new Error(result.errorType);

            const valid = {};
            ['cdi', 'selic', 'lci', 'lca', 'cdb', 'ipca_plus'].forEach(k => {
                valid[k] = parseFloat(result.data[k]) || 0;
            });
            return valid;
        } finally {
            this.isAiProcessing = false;
        }
    }

    async analyzeAssetValuation(assetData) {
        if (this.isAiProcessing) throw new Error('REQUEST_ALREADY_IN_FLIGHT');

        const isVehicle = ['carro', 'moto', 'caminhonete', 'embarcação'].includes(assetData.assetType);
        const isRealEstate = ['casa', 'apartamento', 'terreno', 'imóvel comercial', 'sítio', 'sala comercial'].includes(assetData.assetType);
        
        let specializedContext = isVehicle ? 
            `Fabricante: ${assetData.manufacturer} Modelo: ${assetData.model} Ano: ${assetData.modelYear}` :
            `Localização: ${assetData.municipality} / ${assetData.state}`;

        const userPrompt = `
            Analise o ativo e forneça um parecer técnico curto (máximo 3 linhas).
            Ativo: ${assetData.assetName} (${assetData.assetType})
            ${specializedContext}
            Valor Custo: R$ ${assetData.acquisitionValue} | Valor Atual: R$ ${assetData.currentEstimatedValue}
            Retorne APENAS JSON: {"analysis": "..."}
        `;

        this.isAiProcessing = true;
        try {
            const result = await window.aiProvider.execute({
                taskType: 'asset_analysis',
                userPrompt,
                responseFormat: 'json'
            });

            if (!result.success) return "Análise indisponível no momento.";
            return result.data.analysis || "Análise indisponível.";
        } finally {
            this.isAiProcessing = false;
        }
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    normalizeEntry(r) {
        const now = new Date();
        const fallbackDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        let rawVal = r.value || r.amount || r.valor || 0;
        let cleanAmount = typeof rawVal === 'number' ? rawVal : parseFloat(rawVal.toString().replace(/R\$/g, '').replace(/\./g, '').replace(',', '.')) || 0;

        return {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            date: r.detected_receipt_date || fallbackDate,
            description: (r.description || r.local || 'Recibo Extraído').toUpperCase(),
            amount: cleanAmount,
            type: (r.type === 'income' || r.tipo === 'receita') ? 'income' : 'expense',
            category: r.category || 'CUSTO_DE_VIDA',
            subcategory: r.subcategory || 'outro',
            aiStatus: 'success',
            created_at: new Date().toISOString()
        };
    }

    parseAIResponse(data) {
        return {
            type: data.type === 'income' ? 'income' : 'expense',
            category: data.category || 'CUSTO_DE_VIDA',
            subcategory: data.subcategory || 'outro',
            aiStatus: 'success'
        };
    }

    getFallback(description, type, reason) {
        const local = this.categorizeLocal(description);
        return { 
            type: type, 
            category: local.category,
            subcategory: local.subcategory,
            aiStatus: 'fallback',
            reason: reason
        };
    }

    async execute(params) {
        return await window.aiProvider.execute(params);
    }
}

window.brain = new FamilyOfficeBrain();
