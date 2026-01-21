/**
 * インデックス構成銘柄トラッカー
 * メインアプリケーションスクリプト
 */

// =======================
// Global State
// =======================
const state = {
    currentIndex: 'sp500',
    currentPeriod: 'all',
    data: {
        sp500: { constituents: null, changes: null },
        acwi: { constituents: null, changes: null },
        prime150: { constituents: null, changes: null },
        prices: null,
        historicalSectors: null
    },
    charts: {
        sector: null,
        price: null,
        region: null,
        country: null,
        historical: [],
        countryHistory: []
    },
    sortState: {
        column: null,
        direction: 'asc'
    }
};

// =======================
// Color Palettes
// =======================
const chartColors = {
    sectors: [
        'rgba(59, 130, 246, 0.8)',   // Blue
        'rgba(139, 92, 246, 0.8)',   // Purple
        'rgba(236, 72, 153, 0.8)',   // Pink
        'rgba(16, 185, 129, 0.8)',   // Emerald
        'rgba(245, 158, 11, 0.8)',   // Amber
        'rgba(239, 68, 68, 0.8)',    // Red
        'rgba(14, 165, 233, 0.8)',   // Sky
        'rgba(168, 85, 247, 0.8)',   // Violet
        'rgba(34, 197, 94, 0.8)',    // Green
        'rgba(249, 115, 22, 0.8)',   // Orange
        'rgba(100, 116, 139, 0.8)'   // Slate
    ],
    regions: [
        'rgba(59, 130, 246, 0.85)',
        'rgba(139, 92, 246, 0.85)',
        'rgba(16, 185, 129, 0.85)',
        'rgba(245, 158, 11, 0.85)',
        'rgba(239, 68, 68, 0.85)'
    ],
    // Fixed sector colors - same sector always has same color
    sectorColors: {
        'Information Technology': 'rgba(59, 130, 246, 0.8)',    // Blue
        'Financials': 'rgba(16, 185, 129, 0.8)',                // Emerald
        'Health Care': 'rgba(236, 72, 153, 0.8)',               // Pink
        'Consumer Discretionary': 'rgba(245, 158, 11, 0.8)',    // Amber
        'Industrials': 'rgba(100, 116, 139, 0.8)',              // Slate
        'Communication Services': 'rgba(139, 92, 246, 0.8)',    // Purple
        'Telecommunication Services': 'rgba(139, 92, 246, 0.8)',// Purple
        'Consumer Staples': 'rgba(34, 197, 94, 0.8)',           // Green
        'Energy': 'rgba(239, 68, 68, 0.8)',                     // Red
        'Utilities': 'rgba(14, 165, 233, 0.8)',                 // Sky
        'Materials': 'rgba(249, 115, 22, 0.8)',                 // Orange
        'Real Estate': 'rgba(168, 85, 247, 0.8)',               // Violet
        // Japanese sectors
        '電気機器': 'rgba(59, 130, 246, 0.8)',
        '情報・通信': 'rgba(139, 92, 246, 0.8)',
        '医薬品': 'rgba(236, 72, 153, 0.8)',
        '自動車・輸送機': 'rgba(100, 116, 139, 0.8)',
        '銀行': 'rgba(16, 185, 129, 0.8)',
        '卸売': 'rgba(245, 158, 11, 0.8)',
        '機械': 'rgba(14, 165, 233, 0.8)',
        '化学': 'rgba(249, 115, 22, 0.8)',
        '小売': 'rgba(34, 197, 94, 0.8)',
        '保険': 'rgba(168, 85, 247, 0.8)',
        'その他': 'rgba(148, 163, 184, 0.8)'
    },
    // Fixed country colors - same country always has same color
    countryColors: {
        'United States': 'rgba(59, 130, 246, 0.8)',    // Blue
        'Japan': 'rgba(239, 68, 68, 0.8)',             // Red
        'United Kingdom': 'rgba(16, 185, 129, 0.8)',   // Emerald
        'China': 'rgba(245, 158, 11, 0.8)',            // Amber
        'France': 'rgba(139, 92, 246, 0.8)',           // Purple
        'Germany': 'rgba(100, 116, 139, 0.8)',         // Slate
        'Canada': 'rgba(236, 72, 153, 0.8)',           // Pink
        'Switzerland': 'rgba(34, 197, 94, 0.8)',       // Green
        'Australia': 'rgba(249, 115, 22, 0.8)',        // Orange
        'Taiwan': 'rgba(14, 165, 233, 0.8)',           // Sky
        'India': 'rgba(168, 85, 247, 0.8)',            // Violet
        'South Korea': 'rgba(6, 182, 212, 0.8)',       // Cyan
        'Netherlands': 'rgba(234, 179, 8, 0.8)',       // Yellow
        'Hong Kong': 'rgba(244, 63, 94, 0.8)',         // Rose
        'Italy': 'rgba(132, 204, 22, 0.8)'             // Lime
    },
    // Fixed region colors
    regionColors: {
        'North America': 'rgba(59, 130, 246, 0.85)',           // Blue
        'Europe': 'rgba(139, 92, 246, 0.85)',                  // Purple
        'Pacific': 'rgba(16, 185, 129, 0.85)',                 // Emerald
        'Emerging Markets': 'rgba(245, 158, 11, 0.85)',        // Amber
        'Emerging Markets - Asia': 'rgba(249, 115, 22, 0.85)', // Orange
        'Emerging Markets - Other': 'rgba(239, 68, 68, 0.85)'  // Red
    }
};

// Helper function to get color for a sector
function getSectorColor(sectorName) {
    return chartColors.sectorColors[sectorName] || 'rgba(148, 163, 184, 0.8)';
}

// Helper function to get color for a country
function getCountryColor(countryName) {
    return chartColors.countryColors[countryName] || 'rgba(148, 163, 184, 0.8)';
}

// Helper function to get color for a region
function getRegionColor(regionName) {
    return chartColors.regionColors[regionName] || 'rgba(148, 163, 184, 0.85)';
}

// =======================
// Data Loading
// =======================
async function loadData() {
    try {
        // Load all data files
        const [sp500Const, sp500Changes, acwiConst, acwiChanges, prime150Const, prime150Changes, prices, historicalSectors] = await Promise.all([
            fetch('data/sp500/constituents.json').then(r => r.json()),
            fetch('data/sp500/changes.json').then(r => r.json()),
            fetch('data/acwi/constituents.json').then(r => r.json()),
            fetch('data/acwi/changes.json').then(r => r.json()),
            fetch('data/prime150/constituents.json').then(r => r.json()),
            fetch('data/prime150/changes.json').then(r => r.json()),
            fetch('data/prices.json').then(r => r.json()),
            fetch('data/historical_sectors.json').then(r => r.json())
        ]);

        state.data.sp500 = { constituents: sp500Const, changes: sp500Changes };
        state.data.acwi = { constituents: acwiConst, changes: acwiChanges };
        state.data.prime150 = { constituents: prime150Const, changes: prime150Changes };
        state.data.prices = prices;
        state.data.historicalSectors = historicalSectors;

        console.log('Data loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading data:', error);
        return false;
    }
}

// =======================
// UI Updates
// =======================
function updateStats() {
    const indexData = state.data[state.currentIndex];
    const priceData = state.data.prices[state.currentIndex];

    // Total constituents
    document.getElementById('totalConstituents').textContent =
        indexData.constituents.totalConstituents || indexData.constituents.constituents.length;

    // Last change date
    const changes = indexData.changes.changes;
    if (changes && changes.length > 0) {
        document.getElementById('lastChangeDate').textContent = formatDate(changes[0].date);
    }

    // Returns
    if (priceData && priceData.returns) {
        const returns = priceData.returns;
        const ytdReturn = returns.ytd;
        const oneYearReturn = returns['1y'];

        const ytdEl = document.getElementById('ytdReturn');
        if (ytdReturn !== undefined) {
            ytdEl.textContent = formatPercent(ytdReturn);
            ytdEl.className = 'stat-value ' + (ytdReturn >= 0 ? 'positive' : 'negative');
        } else {
            ytdEl.textContent = '--';
            ytdEl.className = 'stat-value';
        }

        const oyEl = document.getElementById('oneYearReturn');
        if (oneYearReturn !== undefined) {
            oyEl.textContent = formatPercent(oneYearReturn);
            oyEl.className = 'stat-value ' + (oneYearReturn >= 0 ? 'positive' : 'negative');
        } else {
            oyEl.textContent = '--';
            oyEl.className = 'stat-value';
        }
    }

    // Last updated
    document.getElementById('lastUpdated').textContent =
        '最終更新: ' + indexData.constituents.lastUpdated;
}

function updateSectorChart() {
    const ctx = document.getElementById('sectorChart').getContext('2d');
    const sectors = state.data[state.currentIndex].constituents.sectors;

    const labels = Object.keys(sectors);
    const data = Object.values(sectors);

    if (state.charts.sector) {
        state.charts.sector.destroy();
    }

    state.charts.sector = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: labels.map(label => getSectorColor(label)),
                borderColor: 'rgba(30, 41, 59, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#94a3b8',
                        font: { size: 11 },
                        padding: 8,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: '#334155',
                    borderWidth: 1,
                    callbacks: {
                        label: (context) => {
                            return ` ${context.label}: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}

function updatePriceChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    const priceData = state.data.prices[state.currentIndex];

    if (state.charts.price) {
        state.charts.price.destroy();
    }

    // Filter data based on selected period
    let filteredDates = [...priceData.dates];
    let filteredValues = [...priceData.values];

    const currentYear = 2026;
    const periodYears = {
        '1y': 1,
        '5y': 5,
        '10y': 10,
        '15y': 15,
        'all': 999
    };

    const yearsToShow = periodYears[state.currentPeriod] || 999;
    const startYear = currentYear - yearsToShow;

    // Filter by period
    const startIndex = filteredDates.findIndex(d => {
        const year = parseInt(d.split('-')[0]);
        return year >= startYear;
    });

    if (startIndex > 0) {
        filteredDates = filteredDates.slice(startIndex);
        filteredValues = filteredValues.slice(startIndex);
    }

    state.charts.price = new Chart(ctx, {
        type: 'line',
        data: {
            labels: filteredDates,
            datasets: [{
                label: getIndexDisplayName(state.currentIndex),
                data: filteredValues,
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: 'rgba(59, 130, 246, 1)',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: '#334155',
                    borderWidth: 1,
                    callbacks: {
                        label: (context) => {
                            return ` ${context.dataset.label}: ${context.raw.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(51, 65, 85, 0.5)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        maxRotation: 0
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(51, 65, 85, 0.5)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        callback: (value) => value.toLocaleString()
                    }
                }
            }
        }
    });

    // Update returns summary
    updateReturnsSummary();
}

function updateReturnsSummary() {
    const container = document.getElementById('returnsSummary');
    const priceData = state.data.prices[state.currentIndex];
    const returns = priceData.returns;

    if (!returns) {
        container.innerHTML = '';
        return;
    }

    const formatReturn = (value) => {
        if (value === undefined || value === null) return '—';
        const sign = value >= 0 ? '+' : '';
        const cls = value >= 0 ? 'positive' : 'negative';
        return `<span class="return-value ${cls}">${sign}${value.toFixed(1)}%</span>`;
    };

    let html = '';

    if (returns.ytd !== undefined) {
        html += `<div class="return-item"><span class="return-label">今年の成績</span>${formatReturn(returns.ytd)}</div>`;
    }
    if (returns['1y'] !== undefined) {
        html += `<div class="return-item"><span class="return-label">1年</span>${formatReturn(returns['1y'])}</div>`;
    }
    if (returns['5y'] !== undefined) {
        html += `<div class="return-item"><span class="return-label">5年</span>${formatReturn(returns['5y'])}</div>`;
    }
    if (returns['10y'] !== undefined) {
        html += `<div class="return-item"><span class="return-label">10年</span>${formatReturn(returns['10y'])}</div>`;
    }
    if (returns['15y'] !== undefined) {
        html += `<div class="return-item"><span class="return-label">15年</span>${formatReturn(returns['15y'])}</div>`;
    }
    if (returns['20y'] !== undefined) {
        html += `<div class="return-item"><span class="return-label">20年</span>${formatReturn(returns['20y'])}</div>`;
    }
    if (returns['30y'] !== undefined) {
        html += `<div class="return-item"><span class="return-label">30年</span>${formatReturn(returns['30y'])}</div>`;
    }
    if (returns['50y'] !== undefined) {
        html += `<div class="return-item"><span class="return-label">50年</span>${formatReturn(returns['50y'])}</div>`;
    }
    if (returns.sinceInception !== undefined) {
        html += `<div class="return-item"><span class="return-label">最初から</span>${formatReturn(returns.sinceInception)}</div>`;
    }

    container.innerHTML = html;
}

function updateHistoricalComparison() {
    const container = document.getElementById('historicalComparison');
    const historicalData = state.data.historicalSectors[state.currentIndex];

    if (!historicalData) {
        container.innerHTML = '<div class="timeline-empty">昔のデータがないよ 😢</div>';
        return;
    }

    // Clear existing charts
    state.charts.historical.forEach(chart => {
        if (chart) chart.destroy();
    });
    state.charts.historical = [];

    const years = Object.keys(historicalData).filter(k => k !== 'note').sort();

    container.innerHTML = years.map((year, idx) => {
        const yearData = historicalData[year];
        const sectors = yearData.sectors;
        const topSectors = Object.entries(sectors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return `
            <div class="historical-item">
                <span class="year-badge">${year}年</span>
                <div class="historical-chart-container">
                    <canvas id="historicalChart${idx}"></canvas>
                </div>
                <div class="sector-list">
                    ${topSectors.map(([name, value]) => `
                        <div class="sector-list-item">
                            <span class="sector-name">${name}</span>
                            <span class="sector-value">${value.toFixed(1)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');

    // Create mini doughnut charts for each year
    years.forEach((year, idx) => {
        const yearData = historicalData[year];
        const sectors = yearData.sectors;
        const labels = Object.keys(sectors);
        const data = Object.values(sectors);

        const ctx = document.getElementById(`historicalChart${idx}`).getContext('2d');
        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: labels.map(label => getSectorColor(label)),
                    borderColor: 'rgba(30, 41, 59, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        titleColor: '#f8fafc',
                        bodyColor: '#94a3b8',
                        callbacks: {
                            label: (context) => ` ${context.label}: ${context.raw.toFixed(1)}%`
                        }
                    }
                },
                cutout: '50%'
            }
        });
        state.charts.historical.push(chart);
    });
}

function updateCountryHistoryComparison() {
    const section = document.getElementById('countryHistorySection');
    const container = document.getElementById('countryHistoryComparison');

    // Only show for ACWI
    if (state.currentIndex !== 'acwi') {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    const historicalData = state.data.historicalSectors.acwi;

    // Clear existing charts
    state.charts.countryHistory.forEach(chart => {
        if (chart) chart.destroy();
    });
    state.charts.countryHistory = [];

    const years = Object.keys(historicalData).filter(k => k !== 'note' && historicalData[k].countries).sort();

    if (years.length === 0) {
        container.innerHTML = '<div class="timeline-empty">国のデータがないよ 😢</div>';
        return;
    }

    container.innerHTML = years.map((year, idx) => {
        const yearData = historicalData[year];
        const countries = yearData.countries;
        const topCountries = Object.entries(countries)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        const note = yearData.note || '';

        return `
            <div class="historical-item">
                <span class="year-badge">${year}年</span>
                <div class="historical-chart-container">
                    <canvas id="countryHistoryChart${idx}"></canvas>
                </div>
                <div class="sector-list">
                    ${topCountries.map(([name, value]) => `
                        <div class="sector-list-item">
                            <span class="sector-name">${name}</span>
                            <span class="sector-value">${value.toFixed(1)}%</span>
                        </div>
                    `).join('')}
                </div>
                ${note ? `<div class="history-note">${note}</div>` : ''}
            </div>
        `;
    }).join('');

    // Create pie charts for each year
    years.forEach((year, idx) => {
        const yearData = historicalData[year];
        const countries = yearData.countries;
        const sortedCountries = Object.entries(countries).sort((a, b) => b[1] - a[1]);
        const labels = sortedCountries.map(c => c[0]);
        const data = sortedCountries.map(c => c[1]);

        const ctx = document.getElementById(`countryHistoryChart${idx}`).getContext('2d');
        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: labels.map(label => getCountryColor(label)),
                    borderColor: 'rgba(30, 41, 59, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        titleColor: '#f8fafc',
                        bodyColor: '#94a3b8',
                        callbacks: {
                            label: (context) => ` ${context.label}: ${context.raw.toFixed(1)}%`
                        }
                    }
                }
            }
        });
        state.charts.countryHistory.push(chart);
    });
}

function updateRegionCharts() {
    const regionSection = document.getElementById('regionSection');

    // Only show for ACWI
    if (state.currentIndex !== 'acwi') {
        regionSection.style.display = 'none';
        return;
    }

    regionSection.style.display = 'block';
    const acwiData = state.data.acwi.constituents;

    // Region Chart
    const regionCtx = document.getElementById('regionChart').getContext('2d');
    if (state.charts.region) {
        state.charts.region.destroy();
    }

    const regionLabels = Object.keys(acwiData.regions);
    const regionData = Object.values(acwiData.regions);

    state.charts.region = new Chart(regionCtx, {
        type: 'pie',
        data: {
            labels: regionLabels,
            datasets: [{
                data: regionData,
                backgroundColor: regionLabels.map(label => getRegionColor(label)),
                borderColor: 'rgba(30, 41, 59, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#94a3b8',
                        font: { size: 11 },
                        padding: 12,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    callbacks: {
                        label: (context) => ` ${context.label}: ${context.raw.toFixed(1)}%`
                    }
                }
            }
        }
    });

    // Country Chart
    const countryCtx = document.getElementById('countryChart').getContext('2d');
    if (state.charts.country) {
        state.charts.country.destroy();
    }

    const countries = Object.entries(acwiData.countries)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    state.charts.country = new Chart(countryCtx, {
        type: 'bar',
        data: {
            labels: countries.map(c => c[0]),
            datasets: [{
                data: countries.map(c => c[1]),
                backgroundColor: countries.map(c => getCountryColor(c[0])),
                borderColor: countries.map(c => getCountryColor(c[0]).replace('0.8)', '1)')),
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(30, 41, 59, 0.95)',
                    callbacks: {
                        label: (context) => ` ${context.raw.toFixed(1)}%`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(51, 65, 85, 0.5)' },
                    ticks: { color: '#64748b' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            }
        }
    });
}

function updateTimeline() {
    const container = document.getElementById('timelineContainer');
    const changes = state.data[state.currentIndex].changes.changes;

    // Get filter values
    const typeFilter = document.getElementById('changeTypeFilter').value;
    const yearFilter = document.getElementById('yearFilter').value;

    // Filter changes
    let filteredChanges = changes.filter(change => {
        if (typeFilter !== 'all' && change.type !== typeFilter) return false;
        if (yearFilter !== 'all' && !change.date.startsWith(yearFilter)) return false;
        return true;
    });

    if (filteredChanges.length === 0) {
        container.innerHTML = '<div class="timeline-empty">該当する変更履歴はありません</div>';
        return;
    }

    container.innerHTML = filteredChanges.map(change => {
        const typeClass = change.type;
        const typeLabel = getTypeLabel(change.type);

        // Handle ACWI rebalance format
        if (change.type === 'rebalance') {
            return `
                <div class="timeline-item ${typeClass}">
                    <div class="timeline-date">${formatDate(change.date)}</div>
                    <div class="timeline-type">
                        <span class="timeline-badge ${typeClass}">${typeLabel}</span>
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-name">${change.description}</div>
                        <div class="timeline-reason">追加: ${change.addedCount}銘柄 / 除外: ${change.removedCount}銘柄 - ${change.notes}</div>
                    </div>
                </div>
            `;
        }

        return `
            <div class="timeline-item ${typeClass}">
                <div class="timeline-date">${formatDate(change.date)}</div>
                <div class="timeline-type">
                    <span class="timeline-badge ${typeClass}">${typeLabel}</span>
                </div>
                <div class="timeline-content">
                    <div class="timeline-ticker">${change.ticker}</div>
                    <div class="timeline-name">${change.name}</div>
                    <div class="timeline-reason">${change.reason}</div>
                </div>
            </div>
        `;
    }).join('');
}

function updateConstituentsTable() {
    const tbody = document.getElementById('constituentsBody');
    let constituents = [...state.data[state.currentIndex].constituents.constituents];

    // Apply search filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    if (searchTerm) {
        constituents = constituents.filter(c =>
            c.ticker.toLowerCase().includes(searchTerm) ||
            c.name.toLowerCase().includes(searchTerm)
        );
    }

    // Apply sorting
    if (state.sortState.column) {
        constituents.sort((a, b) => {
            let aVal = a[state.sortState.column];
            let bVal = b[state.sortState.column];

            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return state.sortState.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return state.sortState.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    tbody.innerHTML = constituents.map(c => `
        <tr>
            <td class="ticker-cell">${c.ticker}</td>
            <td>${c.name}</td>
            <td><span class="sector-badge">${c.sector}</span></td>
            <td class="weight-cell">${c.weight.toFixed(2)}%</td>
            <td>${formatDate(c.dateAdded)}</td>
        </tr>
    `).join('');
}

// =======================
// Event Handlers
// =======================
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentIndex = btn.dataset.index;
            updateAllViews();
        });
    });

    // Timeline filters
    document.getElementById('changeTypeFilter').addEventListener('change', updateTimeline);
    document.getElementById('yearFilter').addEventListener('change', updateTimeline);

    // Search
    document.getElementById('searchInput').addEventListener('input', debounce(updateConstituentsTable, 300));

    // Table sorting
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const column = th.dataset.sort;

            // Update sort state
            if (state.sortState.column === column) {
                state.sortState.direction = state.sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortState.column = column;
                state.sortState.direction = 'asc';
            }

            // Update UI
            document.querySelectorAll('.sortable').forEach(el => {
                el.classList.remove('asc', 'desc');
            });
            th.classList.add(state.sortState.direction);

            updateConstituentsTable();
        });
    });

    // Period buttons
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentPeriod = btn.dataset.period;
            updatePriceChart();
        });
    });
}

// =======================
// Helper Functions
// =======================
function formatDate(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatPercent(value) {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
}

function getTypeLabel(type) {
    const labels = {
        add: '追加',
        remove: '除外',
        rebalance: '調整'
    };
    return labels[type] || type;
}

function getIndexDisplayName(index) {
    const names = {
        sp500: 'S&P 500',
        acwi: 'MSCI ACWI',
        prime150: 'JPX Prime 150'
    };
    return names[index] || index;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateAllViews() {
    updateStats();
    updateSectorChart();
    updatePriceChart();
    updateHistoricalComparison();
    updateRegionCharts();
    updateCountryHistoryComparison();
    updateTimeline();
    updateConstituentsTable();
}

// =======================
// Initialization
// =======================
async function init() {
    console.log('Initializing Index Tracker...');

    // Chart.js Defaults for Friendliness (Sunny Day Theme)
    Chart.defaults.font.family = "'M PLUS Rounded 1c', 'Noto Sans JP', sans-serif";
    Chart.defaults.font.size = 14;
    Chart.defaults.color = '#334155'; // Slate 700
    Chart.defaults.scale.grid.color = '#e2e8f0'; // Slate 200
    Chart.defaults.borderColor = '#e2e8f0';

    const loaded = await loadData();
    if (!loaded) {
        alert('データの読み込みに失敗しました。ページを再読み込みしてください。');
        return;
    }

    setupEventListeners();
    updateAllViews();

    console.log('Index Tracker initialized successfully');
}

// Start the application
document.addEventListener('DOMContentLoaded', init);
