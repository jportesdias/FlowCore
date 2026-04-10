class AIProviderLayer {
    constructor() {
        this.config = this.loadConfig();
        // FORCE GEMINI ONLY
        this.config.provider = "gemini";
        
        this.cooldowns = { gemini: 0 };
        this.requestsInFlight = { gemini: false };
        this.lastValidModels = { gemini: this.config.providers.gemini.model || null };
    }

    loadConfig() {
        const data = window.store?.getData() || {};

        // Se o store ainda não tem API key, lê direto do localStorage (antes do loadFromSupabase)
        if (!data.aiConfig?.providers?.gemini?.apiKey) {
            try {
                const raw = localStorage.getItem('family_office_data');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed.aiConfig?.providers?.gemini?.apiKey) {
                        return parsed.aiConfig;
                    }
                }
            } catch(e) {}
        }

        if (!data.aiConfig || !data.aiConfig.provider) {
            const legacyKey = data.aiConfig?.apiKey || '';
            return {
                provider: 'gemini',
                providers: {
                    gemini: { enabled: true, apiKey: legacyKey, model: '' },
                    openai: { enabled: false, apiKey: '', model: '' }
                }
            };
        }
        return data.aiConfig;
    }

    saveConfig(config) {
        config.provider = "gemini"; // Safety force
        this.config = config;
        window.store.saveAIConfig(config);
    }

    /**
     * Strict Gemini Model Resolution
     * Order: Selected -> Last Valid -> Discovery
     */
    async resolveGeminiModel() {
        const provider = "gemini";
        const config = this.config.providers[provider];
        
        console.log(`[GEMINI_RESOLUTION] Start | Selected: "${config.model}" | LastValid: "${this.lastValidModels[provider]}"`);

        // A. Selected Model
        if (config.model && config.model.trim() !== "") {
            return { success: true, model: this.normalizeGeminiModel(config.model.trim()), source: "selected" };
        }

        // B. Last Valid Model
        if (this.lastValidModels[provider]) {
            return { success: true, model: this.normalizeGeminiModel(this.lastValidModels[provider]), source: "lastValid" };
        }

        // C. Discovery
        console.log(`[GEMINI_RESOLUTION] Triggering Discovery...`);
        const discovery = await this.discoverCompatibleGeminiModel();
        if (discovery.success) {
            // Persist discovery
            this.persistModelState(discovery.model);
            return { success: true, model: discovery.model, source: "discovery" };
        }

        return { success: false, errorType: discovery.errorType || "MODEL_UNRESOLVED" };
    }

    normalizeGeminiModel(model) {
        if (!model) return null;
        const m = model.trim();
        if (m === "") return null;
        if (m.startsWith("models/")) return m;
        return `models/${m}`;
    }

    async discoverCompatibleGeminiModel() {
        const apiKey = this.config.providers.gemini.apiKey;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        // Modelos estáveis preferidos, em ordem de prioridade
        const PREFERRED = [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemini-pro"
        ];

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            // Apenas modelos que suportam generateContent, excluindo experimentais/preview
            const compatible = data.models?.filter(m =>
                m.supportedGenerationMethods?.includes("generateContent") &&
                !m.name.includes("embedding") &&
                !m.name.includes("vision-alpha") &&
                !m.name.includes("preview") &&
                !m.name.includes("experimental")
            ) || [];

            // Tenta preferidos na ordem
            for (const preferred of PREFERRED) {
                const found = compatible.find(m => m.name.includes(preferred));
                if (found) {
                    console.log(`[GEMINI_DISCOVERY] Modelo estável encontrado: ${found.name}`);
                    return { success: true, model: found.name };
                }
            }

            // Fallback: qualquer flash disponível (mesmo preview se não houver outro)
            const anyFlash = data.models?.find(m =>
                m.supportedGenerationMethods?.includes("generateContent") &&
                m.name.includes("flash") &&
                !m.name.includes("embedding")
            );
            if (anyFlash) {
                console.log(`[GEMINI_DISCOVERY] Fallback flash: ${anyFlash.name}`);
                return { success: true, model: anyFlash.name };
            }

            // Último recurso: primeiro compatível da lista
            if (compatible.length > 0) {
                console.log(`[GEMINI_DISCOVERY] Fallback genérico: ${compatible[0].name}`);
                return { success: true, model: compatible[0].name };
            }

            return { success: false, errorType: "NO_COMPATIBLE_MODEL_FOUND" };
        } catch (err) {
            console.error(`[GEMINI_DISCOVERY] Error:`, err);
            return { success: false, errorType: "DISCOVERY_FAILED" };
        }
    }

    persistModelState(model) {
        const provider = "gemini";
        this.config.providers[provider].model = model;
        this.lastValidModels[provider] = model;
        this.saveConfig(this.config);
        console.log(`[GEMINI_PERSIST] Model persisted: ${model}`);
    }

    async preflightCheck(provider) {
        if (provider !== 'gemini') {
            return { success: false, errorType: "PROVIDER_DISABLED" };
        }
        
        const config = this.config.providers[provider];
        const now = Date.now();

        // 1. API Key Check
        if (!config || !config.apiKey || config.apiKey.trim() === "") {
            return { success: false, errorType: "KEY_NOT_CONFIGURED" };
        }

        // 2. Request Lock Check
        if (this.requestsInFlight[provider]) {
            return { success: false, errorType: "REQUEST_LOCKED" };
        }

        // 3. Cooldown Check
        if (now < this.cooldowns[provider]) {
            const waitSecs = Math.ceil((this.cooldowns[provider] - now) / 1000);
            return { success: false, errorType: "RATE_LIMIT_EXCEEDED", waitSecs };
        }

        // 4. Resolve Model (Includes discovery if needed)
        const resolution = await this.resolveGeminiModel();
        if (!resolution.success) {
            return { success: false, errorType: resolution.errorType };
        }

        console.log(`[GEMINI_PREFLIGHT] Passed | Model: ${resolution.model} | Source: ${resolution.source}`);
        return { success: true, model: resolution.model };
    }

    async execute(request) {
        // Sempre recarrega config do store (resolve race condition de init vs login)
        this.config = this.loadConfig();
        this.config.provider = "gemini";

        const provider = "gemini";
        const preflight = await this.preflightCheck(provider);
        
        if (!preflight.success) {
            return this.normalizeResponse(false, provider, null, preflight.errorType, preflight.errorType);
        }

        const model = preflight.model;
        const providerConfig = this.config.providers[provider];
        this.requestsInFlight[provider] = true;

        try {
            const result = await this.executeGemini(request, providerConfig, model);
            if (result.success) {
                // Reinforce persistence on success
                this.persistModelState(model);
            }
            return result;
        } catch (error) {
            const errorType = this.classifyError(provider, error);
            return this.normalizeResponse(false, provider, model, errorType, error.message || errorType);
        } finally {
            this.requestsInFlight[provider] = false;
        }
    }

    async executeGemini(request, config, model) {
        const cleanModel = model.startsWith('models/') ? model.split('models/')[1] : model;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${config.apiKey}`;
        
        const parts = [{ text: this.buildPrompt(request) }];
        if (request.image) {
            parts.push({
                inline_data: { mime_type: request.image.mimeType, data: request.image.data }
            });
        }

        const body = {
            contents: [{ parts }],
            generationConfig: {
                responseMimeType: request.responseFormat === 'json' ? "application/json" : "text/plain"
            }
        };

        if (request.systemPrompt) {
            body.system_instruction = { parts: [{ text: request.systemPrompt }] };
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw { status: response.status, data: await response.json().catch(() => ({})) };
        }

        const result = await response.json();
        let text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return this.processResponse(text, 'gemini', model, request.responseFormat);
    }

    processResponse(text, provider, model, format) {
        let data = text;
        if (format === 'json') {
            try {
                const cleanText = text.replace(/```json|```/g, '').trim();
                data = JSON.parse(cleanText);
            } catch (e) {
                const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
                if (match) { 
                    try { data = JSON.parse(match[0]); } catch (e2) { return this.normalizeResponse(false, provider, model, "JSON_PARSE_ERROR", "Failed to parse AI response"); }
                } else {
                    return this.normalizeResponse(false, provider, model, "JSON_PARSE_ERROR", "No JSON found in response");
                }
            }
        }
        return this.normalizeResponse(true, provider, model, null, null, data);
    }

    buildPrompt(request) {
        let p = request.userPrompt || "";
        if (request.inputData) p += "\nData: " + JSON.stringify(request.inputData, null, 2);
        return p;
    }

    classifyError(provider, error) {
        const status = error.status;
        if (!status) return "NETWORK_ERROR";
        if (status === 400) return "BAD_REQUEST";
        if (status === 401 || status === 403) return "ACCESS_DENIED";
        if (status === 404) return "MODEL_OR_ENDPOINT_ERROR";
        if (status === 429) {
            this.cooldowns[provider] = Date.now() + 30000;
            return "RATE_LIMIT_EXCEEDED";
        }
        if (status === 503 || status === 502 || status === 500) {
            // Modelo instável — limpa o cache para forçar redescoberta na próxima chamada
            this.lastValidModels[provider] = null;
            this.config.providers[provider].model = '';
            return "SERVER_ERROR";
        }
        return "SERVER_ERROR";
    }

    normalizeResponse(success, provider, model, errorType, message, data = null) {
        return { 
            success, provider, model, errorType, message, 
            retryAllowedAt: (errorType === "RATE_LIMIT_EXCEEDED" ? this.cooldowns[provider] : null),
            data 
        };
    }

    async checkHealth(providerKey) {
        return await this.execute({
            userPrompt: "Responda apenas 'OK'",
            responseFormat: "text"
        });
    }
}

window.aiProvider = new AIProviderLayer();
