class FamilyOfficeCharts {
    constructor() {
        this.charts = {};
        this.categoryColors = {
            'CUSTO_DE_VIDA': '#f5a623', // Gold Warm
            'DIVIDAS_E_OBRIGACOES': '#b8860b', // Dark Gold
            'ESTILO_DE_VIDA': '#ffd700', // Gold Bright
            'INVESTIMENTOS_E_PATRIMONIO': '#cfb53b', // Old Gold
            'RESERVAS_E_SEGURANCA': '#8b7500' // Metallic Gold
        };
        this.categoryNames = {
            'CUSTO_DE_VIDA': 'Custo de Vida',
            'DIVIDAS_E_OBRIGACOES': 'Dívidas e Obrigações',
            'ESTILO_DE_VIDA': 'Estilo de Vida',
            'INVESTIMENTOS_E_PATRIMONIO': 'Investimentos',
            'RESERVAS_E_SEGURANCA': 'Reservas e Segurança'
        };
        this.setDefaults();
    }

    formatLabel(label) {
        if (!label) return '';
        const dict = {
            'cartao_credito': 'Cartão de Crédito',
            'alimentacao': 'Alimentação',
            'saude': 'Saúde',
            'moradia': 'Moradia',
            'transporte': 'Transporte',
            'educacao': 'Educação',
            'lazer': 'Lazer',
            'servicos': 'Serviços',
            'outro': 'Outros'
        };
        const low = label.toLowerCase();
        if (dict[low]) return dict[low];
        
        // Generic cleaning
        return label.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    setDefaults() {
        if (typeof Chart === 'undefined') {
            console.error('Chart.js library is not loaded.');
            return;
        }

        // Ensure plugins and tooltip exist in defaults
        Chart.defaults.plugins = Chart.defaults.plugins || {};
        Chart.defaults.plugins.tooltip = Chart.defaults.plugins.tooltip || {};

        Chart.defaults.color = '#a1a1aa';
        Chart.defaults.font.family = "'Inter', sans-serif";
        
        const tt = Chart.defaults.plugins.tooltip;
        tt.backgroundColor = '#141418';
        tt.titleFont = { family: 'Playfair Display' };
        tt.padding = 12;
        tt.cornerRadius = 8;
        tt.borderWidth = 1;
        tt.borderColor = 'rgba(212, 175, 55, 0.3)';
        tt.callbacks = tt.callbacks || {};
        tt.callbacks.label = function(context) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) {
                    label += window.formatBRL(context.parsed.y);
                } else if (context.parsed.x !== null && context.dataset.index === undefined) {
                    label += window.formatBRL(context.parsed.x);
                }
                return label;
            };
    }

    updateDashboardCharts(data) {
        const cashflow = data.cashflow || [];
        this.renderSpendingEvolution(cashflow);
        this.renderMonthlyComposition(cashflow);
        this.renderTopSubcategories(cashflow);
    }

    // Chart 1: Evolution Line Chart
    renderSpendingEvolution(cashflow) {
        const ctx = document.getElementById('spendingEvolutionChart')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.evolution) this.charts.evolution.destroy();

        const expenses = cashflow.filter(c => c.type === 'expense');
        const months = [...new Set(expenses.map(c => c.date.substring(0, 7)))].sort();
        
        const datasets = Object.keys(this.categoryColors).map(cat => {
            const color = this.categoryColors[cat];
            return {
                label: this.categoryNames[cat],
                data: months.map(m => expenses.filter(c => c.date.startsWith(m) && c.category === cat)
                                            .reduce((s, c) => s + parseFloat(c.amount), 0)),
                borderColor: color,
                backgroundColor: color + '20',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: color,
                pointBorderWidth: 2,
                pointBorderColor: '#fff'
            };
        });

        this.charts.evolution = new Chart(ctx, {
            type: 'line',
            data: { labels: months, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { padding: 20 } } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // Chart 2: Stacked Bar Composition
    renderMonthlyComposition(cashflow) {
        const ctx = document.getElementById('monthlyCompositionChart')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.composition) this.charts.composition.destroy();

        const expenses = cashflow.filter(c => c.type === 'expense');
        const months = [...new Set(expenses.map(c => c.date.substring(0, 7)))].sort();

        const datasets = Object.keys(this.categoryColors).map(cat => ({
            label: this.categoryNames[cat],
            data: months.map(m => expenses.filter(c => c.date.startsWith(m) && c.category === cat)
                                        .reduce((s, c) => s + parseFloat(c.amount), 0)),
            backgroundColor: this.categoryColors[cat],
            borderRadius: 4
        }));

        this.charts.composition = new Chart(ctx, {
            type: 'bar',
            data: { labels: months, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true, grid: { display: false } },
                    y: { stacked: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // Chart 3: Top 10 Subcategories Horizontal Bar
    renderTopSubcategories(cashflow) {
        const ctx = document.getElementById('topSubcategoriesChart')?.getContext('2d');
        if (!ctx) return;
        if (this.charts.topSub) this.charts.topSub.destroy();

        const expenses = cashflow.filter(c => c.type === 'expense');
        const subMap = {};
        
        expenses.forEach(c => {
            const sub = c.subcategory || 'outro';
            subMap[sub] = (subMap[sub] || 0) + parseFloat(c.amount);
        });

        const sorted = Object.entries(subMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        this.charts.topSub = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(s => this.formatLabel(s[0])),
                datasets: [{
                    label: 'Total Gasto',
                    data: sorted.map(s => s[1]),
                    backgroundColor: 'rgba(212, 175, 55, 0.4)',
                    borderColor: '#d4af37',
                    borderWidth: 1.5,
                    borderRadius: 6,
                    hoverBackgroundColor: 'rgba(212, 175, 55, 0.7)'
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    // Chart 4: Investment Projection
    renderProjectionChart(canvasId, labels, data) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;
        if (this.charts.projection) this.charts.projection.destroy();

        this.charts.projection = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Saldo Projetado',
                    data: data,
                    borderColor: '#d4af37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { maxRotation: 0, autoSkip: true }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            callback: function(value) {
                                return window.formatBRL(value);
                            }
                        }
                    }
                }
            }
        });
    }
}
