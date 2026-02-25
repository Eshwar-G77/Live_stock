// ============================================================
//  MarketPulse — Real-Time Stock Dashboard
//  Supports: Demo mode (instant) + Live mode (Finnhub API)
// ============================================================

// ---- Configuration ------------------------------------------
const CONFIG = {
    API_BASE: 'https://finnhub.io/api/v1',
    REFRESH_INTERVAL: 30000,  // 30 seconds
    DEMO_MODE: false,
    API_KEY: 'd6fjnepr01qjq8n1u8ggd6fjnepr01qjq8n1u8h0',
};

// ---- Stock Universe -----------------------------------------
const STOCKS = {
    AAPL: { name: 'Apple Inc.', sector: 'Technology' },
    MSFT: { name: 'Microsoft Corp.', sector: 'Technology' },
    GOOGL: { name: 'Alphabet Inc.', sector: 'Technology' },
    AMZN: { name: 'Amazon.com Inc.', sector: 'Consumer Cyclical' },
    NVDA: { name: 'NVIDIA Corp.', sector: 'Technology' },
    META: { name: 'Meta Platforms', sector: 'Technology' },
    TSLA: { name: 'Tesla Inc.', sector: 'Consumer Cyclical' },
    JPM: { name: 'JPMorgan Chase', sector: 'Financial' },
    V: { name: 'Visa Inc.', sector: 'Financial' },
    JNJ: { name: 'Johnson & Johnson', sector: 'Healthcare' },
    WMT: { name: 'Walmart Inc.', sector: 'Consumer Defensive' },
    PG: { name: 'Procter & Gamble', sector: 'Consumer Defensive' },
    MA: { name: 'Mastercard Inc.', sector: 'Financial' },
    UNH: { name: 'UnitedHealth Group', sector: 'Healthcare' },
    HD: { name: 'Home Depot', sector: 'Consumer Cyclical' },
    DIS: { name: 'Walt Disney Co.', sector: 'Communication' },
    BAC: { name: 'Bank of America', sector: 'Financial' },
    ADBE: { name: 'Adobe Inc.', sector: 'Technology' },
    CRM: { name: 'Salesforce Inc.', sector: 'Technology' },
    NFLX: { name: 'Netflix Inc.', sector: 'Communication' },
    CSCO: { name: 'Cisco Systems', sector: 'Technology' },
    PFE: { name: 'Pfizer Inc.', sector: 'Healthcare' },
    TMO: { name: 'Thermo Fisher', sector: 'Healthcare' },
    ABT: { name: 'Abbott Labs', sector: 'Healthcare' },
    KO: { name: 'Coca-Cola Co.', sector: 'Consumer Defensive' },
    PEP: { name: 'PepsiCo Inc.', sector: 'Consumer Defensive' },
    AVGO: { name: 'Broadcom Inc.', sector: 'Technology' },
    COST: { name: 'Costco Wholesale', sector: 'Consumer Defensive' },
    MRK: { name: 'Merck & Co.', sector: 'Healthcare' },
    NKE: { name: 'Nike Inc.', sector: 'Consumer Cyclical' },
    INTC: { name: 'Intel Corp.', sector: 'Technology' },
    AMD: { name: 'AMD Inc.', sector: 'Technology' },
    QCOM: { name: 'Qualcomm Inc.', sector: 'Technology' },
    TXN: { name: 'Texas Instruments', sector: 'Technology' },
    PYPL: { name: 'PayPal Holdings', sector: 'Financial' },
    SBUX: { name: 'Starbucks Corp.', sector: 'Consumer Cyclical' },
    GS: { name: 'Goldman Sachs', sector: 'Financial' },
    MS: { name: 'Morgan Stanley', sector: 'Financial' },
    CVX: { name: 'Chevron Corp.', sector: 'Energy' },
    XOM: { name: 'ExxonMobil', sector: 'Energy' },
};

const INDEX_TICKERS = {
    SPY: { name: 'S&P 500', base: 5920 },
    QQQ: { name: 'NASDAQ 100', base: 505 },
    DIA: { name: 'DOW JONES', base: 437 },
    IWM: { name: 'RUSSELL 2000', base: 224 },
    VIX: { name: 'VIX', base: 16.5 },
};

// ---- State --------------------------------------------------
let stockData = {};        // symbol -> { price, change, changePct, volume, high, low, open, prevClose, history }
let currentChartSymbol = 'AAPL';
let currentChartRange = '5d';
let priceChart = null;
let volumeChart = null;
let refreshTimer = null;

// ---- Seed Prices (realistic Feb 2026 estimates) -------------
const SEED_PRICES = {
    AAPL: 242, MSFT: 448, GOOGL: 192, AMZN: 228, NVDA: 138,
    META: 685, TSLA: 355, JPM: 268, V: 340, JNJ: 158,
    WMT: 98, PG: 172, MA: 548, UNH: 582, HD: 408,
    DIS: 116, BAC: 47, ADBE: 488, CRM: 342, NFLX: 1018,
    CSCO: 62, PFE: 26, TMO: 568, ABT: 122, KO: 62,
    PEP: 152, AVGO: 228, COST: 982, MRK: 98, NKE: 74,
    INTC: 22, AMD: 118, QCOM: 172, TXN: 198, PYPL: 88,
    SBUX: 112, GS: 612, MS: 128, CVX: 158, XOM: 112,
};

// ============================================================
//  DEMO DATA GENERATOR
// ============================================================
function generateDemoData() {
    const symbols = Object.keys(STOCKS);

    symbols.forEach(sym => {
        const basePrice = SEED_PRICES[sym] || 100;
        // Random daily change between -5% and +5%
        const changePct = (Math.random() - 0.45) * 8;  // slight positive bias
        const change = basePrice * changePct / 100;
        const price = +(basePrice + change).toFixed(2);
        const high = +(price + Math.random() * price * 0.02).toFixed(2);
        const low = +(price - Math.random() * price * 0.02).toFixed(2);
        const volume = Math.floor(Math.random() * 80_000_000) + 5_000_000;

        // Generate history for chart (up to 90 days back)
        const history = generatePriceHistory(basePrice, 90);

        stockData[sym] = {
            price,
            change: +change.toFixed(2),
            changePct: +changePct.toFixed(2),
            volume,
            high,
            low,
            open: +(basePrice + (Math.random() - 0.5) * 2).toFixed(2),
            prevClose: basePrice,
            history,
        };
    });
}

function generatePriceHistory(basePrice, days) {
    const history = [];
    let price = basePrice * (1 - Math.random() * 0.12); // start slightly lower
    const now = new Date();

    for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;

        const dailyReturn = (Math.random() - 0.48) * 0.035; // slight upward drift
        price = price * (1 + dailyReturn);
        const dayHigh = price * (1 + Math.random() * 0.015);
        const dayLow = price * (1 - Math.random() * 0.015);
        const volume = Math.floor(Math.random() * 60_000_000) + 8_000_000;

        history.push({
            date: date.toISOString().split('T')[0],
            open: +(price * (1 + (Math.random() - 0.5) * 0.005)).toFixed(2),
            high: +dayHigh.toFixed(2),
            low: +dayLow.toFixed(2),
            close: +price.toFixed(2),
            volume,
        });
    }
    return history;
}

function generateIndexData() {
    const data = {};
    Object.entries(INDEX_TICKERS).forEach(([sym, info]) => {
        const pctChange = (Math.random() - 0.45) * 3;
        const change = +(info.base * pctChange / 100).toFixed(2);
        const price = +(info.base + change).toFixed(2);
        data[sym] = { price, change, changePct: +pctChange.toFixed(2) };
    });
    return data;
}

// ============================================================
//  FINNHUB API (Live Mode)
// ============================================================
async function fetchQuote(symbol) {
    try {
        const res = await fetch(`${CONFIG.API_BASE}/quote?symbol=${symbol}&token=${CONFIG.API_KEY}`);
        const d = await res.json();
        return {
            price: d.c,
            change: +(d.c - d.pc).toFixed(2),
            changePct: +(((d.c - d.pc) / d.pc) * 100).toFixed(2),
            high: d.h,
            low: d.l,
            open: d.o,
            prevClose: d.pc,
            volume: 0,  // quote endpoint doesn't give volume
        };
    } catch (e) {
        console.warn(`Failed to fetch quote for ${symbol}:`, e);
        return null;
    }
}

async function fetchCandles(symbol, fromTs, toTs) {
    try {
        const res = await fetch(
            `${CONFIG.API_BASE}/stock/candle?symbol=${symbol}&resolution=D&from=${fromTs}&to=${toTs}&token=${CONFIG.API_KEY}`
        );
        const d = await res.json();
        if (d.s !== 'ok') return [];
        return d.t.map((t, i) => ({
            date: new Date(t * 1000).toISOString().split('T')[0],
            open: d.o[i],
            high: d.h[i],
            low: d.l[i],
            close: d.c[i],
            volume: d.v[i],
        }));
    } catch (e) {
        console.warn(`Failed to fetch candles for ${symbol}:`, e);
        return [];
    }
}

async function loadLiveData() {
    const symbols = Object.keys(STOCKS);
    // Fetch quotes in small batches to respect rate limits (60/min)
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const promises = batch.map(async sym => {
            const quote = await fetchQuote(sym);
            if (quote && quote.price > 0) {
                // Try fetching candle history; fall back to generated data
                const now = Math.floor(Date.now() / 1000);
                const from = now - 90 * 24 * 60 * 60;
                let history = await fetchCandles(sym, from, now);
                if (!history || history.length < 5) {
                    // Generate synthetic history based on real current price
                    history = generatePriceHistory(quote.price, 90);
                }
                // Estimate volume if not provided
                if (!quote.volume || quote.volume === 0) {
                    quote.volume = Math.floor(Math.random() * 60_000_000) + 10_000_000;
                }
                stockData[sym] = { ...quote, history };
            }
        });
        await Promise.all(promises);
        // Delay between batches to stay under 60 calls/min
        if (i + batchSize < symbols.length) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

// Fetch live quotes for market indices
async function loadIndexData() {
    const indexData = {};
    const indexSymbols = Object.keys(INDEX_TICKERS);
    // Fetch one at a time with small delays to avoid 429
    for (let i = 0; i < indexSymbols.length; i++) {
        const sym = indexSymbols[i];
        const quote = await fetchQuote(sym);
        if (quote && quote.price > 0) {
            indexData[sym] = {
                price: quote.price,
                change: quote.change,
                changePct: quote.changePct,
            };
        }
        if (i < indexSymbols.length - 1) {
            await new Promise(r => setTimeout(r, 500));
        }
    }
    return indexData;
}

// ============================================================
//  RENDERING
// ============================================================

// ---- Market Indices ----
let liveIndexCache = {};

async function renderIndices() {
    let data;
    if (CONFIG.DEMO_MODE) {
        data = generateIndexData();
    } else {
        // Fetch live index quotes (or use cache)
        if (Object.keys(liveIndexCache).length === 0) {
            liveIndexCache = await loadIndexData();
        }
        data = liveIndexCache;
        // Refresh index cache periodically
        loadIndexData().then(d => { if (Object.keys(d).length) liveIndexCache = d; });
    }
    Object.entries(INDEX_TICKERS).forEach(([sym, info]) => {
        const d = data[sym];
        const priceEl = document.getElementById(`${sym.toLowerCase()}-price`);
        const changeEl = document.getElementById(`${sym.toLowerCase()}-change`);
        if (!d) return;
        priceEl.textContent = sym === 'VIX' ? d.price.toFixed(2) : formatNumber(d.price);
        changeEl.textContent = `${d.change >= 0 ? '+' : ''}${d.change.toFixed(2)} (${d.changePct >= 0 ? '+' : ''}${d.changePct.toFixed(2)}%)`;
        changeEl.className = `index-change ${d.changePct >= 0 ? 'positive' : 'negative'}`;
    });
}

// ---- Gainers / Losers ----
function renderGainersLosers() {
    const sorted = Object.entries(stockData)
        .sort((a, b) => b[1].changePct - a[1].changePct);

    const gainers = sorted.slice(0, 8);
    const losers = sorted.slice(-8).reverse();

    document.getElementById('gainersList').innerHTML = gainers.map(([sym, d]) =>
        createStockItem(sym, d, true)
    ).join('');

    document.getElementById('losersList').innerHTML = losers.map(([sym, d]) =>
        createStockItem(sym, d, false)
    ).join('');

    // Attach click handlers
    document.querySelectorAll('.stock-item').forEach(el => {
        el.addEventListener('click', () => {
            const sym = el.dataset.symbol;
            if (sym) selectStock(sym);
        });
    });
}

function createStockItem(sym, data, isGainer) {
    const colorClass = isGainer ? 'green' : 'red';
    const changeClass = data.changePct >= 0 ? 'positive' : 'negative';
    const arrow = data.changePct >= 0 ? '▲' : '▼';
    return `
        <div class="stock-item" data-symbol="${sym}">
            <div class="stock-item-left">
                <div class="stock-icon ${colorClass}">${sym.substring(0, 2)}</div>
                <div>
                    <div class="stock-symbol">${sym}</div>
                    <div class="stock-name">${STOCKS[sym]?.name || sym}</div>
                </div>
            </div>
            <div class="stock-item-right">
                <div class="stock-price">$${data.price.toFixed(2)}</div>
                <div class="stock-change ${changeClass}">${arrow} ${Math.abs(data.changePct).toFixed(2)}%</div>
            </div>
        </div>
    `;
}

// ---- Most Active ----
function renderMostActive() {
    const sorted = Object.entries(stockData)
        .sort((a, b) => b[1].volume - a[1].volume)
        .slice(0, 10);

    const tbody = document.getElementById('activeTableBody');
    tbody.innerHTML = sorted.map(([sym, d]) => {
        const changeClass = d.changePct >= 0 ? 'positive' : 'negative';
        const arrow = d.changePct >= 0 ? '▲' : '▼';
        return `
            <tr data-symbol="${sym}">
                <td class="td-symbol">${sym}</td>
                <td class="td-price">$${d.price.toFixed(2)}</td>
                <td class="td-change ${changeClass}">${arrow} ${Math.abs(d.changePct).toFixed(2)}%</td>
                <td class="td-volume">${formatVolume(d.volume)}</td>
                <td><canvas class="mini-chart" id="mini-${sym}"></canvas></td>
            </tr>
        `;
    }).join('');

    // Draw mini sparklines
    sorted.forEach(([sym, d]) => {
        drawMiniChart(sym, d);
    });

    // Attach row click
    tbody.querySelectorAll('tr').forEach(tr => {
        tr.addEventListener('click', () => {
            const sym = tr.dataset.symbol;
            if (sym) selectStock(sym);
        });
    });
}

function drawMiniChart(sym, data) {
    const canvas = document.getElementById(`mini-${sym}`);
    if (!canvas || !data.history || data.history.length < 5) return;

    const ctx = canvas.getContext('2d');
    const recent = data.history.slice(-10);
    const prices = recent.map(h => h.close);

    canvas.width = 80;
    canvas.height = 30;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const isPositive = prices[prices.length - 1] >= prices[0];
    const color = isPositive ? '#00d4aa' : '#ff4757';

    ctx.clearRect(0, 0, 80, 30);
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    prices.forEach((p, i) => {
        const x = (i / (prices.length - 1)) * 76 + 2;
        const y = 28 - ((p - min) / range) * 24;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

// ---- Main Chart ----
function renderChart() {
    const data = stockData[currentChartSymbol];
    if (!data || !data.history) return;

    const info = STOCKS[currentChartSymbol] || { name: currentChartSymbol };

    // Update header
    document.getElementById('chartStockName').textContent =
        `${currentChartSymbol} — ${info.name}`;
    document.getElementById('chartCurrentPrice').textContent =
        `$${data.price.toFixed(2)}`;

    const changeEl = document.getElementById('chartPriceChange');
    const sign = data.change >= 0 ? '+' : '';
    changeEl.textContent = `${sign}${data.change.toFixed(2)} (${sign}${data.changePct.toFixed(2)}%)`;
    changeEl.className = `chart-price-change ${data.changePct >= 0 ? 'positive' : 'negative'}`;

    // Slice history for selected range
    const rangeDays = { '5d': 5, '10d': 10, '1m': 22, '3m': 66 };
    const days = rangeDays[currentChartRange] || 10;
    const history = data.history.slice(-days);

    if (!history.length) return;

    const labels = history.map(h => {
        const d = new Date(h.date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const closes = history.map(h => h.close);
    const volumes = history.map(h => h.volume);

    const isPositive = closes[closes.length - 1] >= closes[0];
    const lineColor = isPositive ? '#00d4aa' : '#ff4757';
    const fillColor = isPositive ? 'rgba(0, 212, 170, 0.08)' : 'rgba(255, 71, 87, 0.08)';

    // Destroy existing charts
    if (priceChart) priceChart.destroy();
    if (volumeChart) volumeChart.destroy();

    // Price chart
    const priceCtx = document.getElementById('priceChart').getContext('2d');
    priceChart = new Chart(priceCtx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                data: closes,
                borderColor: lineColor,
                backgroundColor: fillColor,
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: lineColor,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                fill: true,
                tension: 0.35,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(148, 163, 184, 0.2)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: ctx => `$${ctx.parsed.y.toFixed(2)}`,
                    },
                },
            },
            scales: {
                x: {
                    grid: { color: 'rgba(148, 163, 184, 0.06)' },
                    ticks: { color: '#64748b', font: { size: 11, family: 'Inter' }, maxTicksLimit: 8 },
                    border: { display: false },
                },
                y: {
                    position: 'right',
                    grid: { color: 'rgba(148, 163, 184, 0.06)' },
                    ticks: {
                        color: '#64748b',
                        font: { size: 11, family: 'JetBrains Mono' },
                        callback: v => '$' + v.toFixed(0),
                    },
                    border: { display: false },
                },
            },
        },
    });

    // Volume chart
    const volCtx = document.getElementById('volumeChart').getContext('2d');
    volumeChart = new Chart(volCtx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data: volumes,
                backgroundColor: history.map((h, i) => {
                    if (i === 0) return 'rgba(59, 130, 246, 0.3)';
                    return h.close >= history[i - 1].close
                        ? 'rgba(0, 212, 170, 0.3)'
                        : 'rgba(255, 71, 87, 0.3)';
                }),
                borderRadius: 2,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    titleColor: '#e2e8f0',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(148, 163, 184, 0.2)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: ctx => formatVolume(ctx.parsed.y) + ' shares',
                    },
                },
            },
            scales: {
                x: { display: false },
                y: {
                    display: false,
                    beginAtZero: true,
                },
            },
        },
    });
}

// ---- Smart Suggestions ----
function renderSuggestions() {
    const suggestions = computeSuggestions();
    const container = document.getElementById('suggestionsList');

    container.innerHTML = suggestions.map(s => {
        const scoreClass = s.score >= 80 ? 'high' : 'medium';
        return `
            <div class="suggestion-item" data-symbol="${s.symbol}">
                <div class="suggestion-score ${scoreClass}">${s.score}</div>
                <div class="suggestion-info">
                    <div class="suggestion-header">
                        <span class="suggestion-symbol">${s.symbol}</span>
                        <span class="suggestion-tag ${s.tag}">${s.tagLabel}</span>
                    </div>
                    <div class="suggestion-reason">${s.reason}</div>
                </div>
                <div class="suggestion-price-target">
                    <div class="suggestion-current">$${s.currentPrice.toFixed(2)}</div>
                    <div class="suggestion-target">Target: $${s.target.toFixed(2)}</div>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('click', () => {
            const sym = el.dataset.symbol;
            if (sym) selectStock(sym);
        });
    });
}

function computeSuggestions() {
    const results = [];

    Object.entries(stockData).forEach(([sym, d]) => {
        if (!d.history || d.history.length < 20) return;

        const recent = d.history.slice(-20);
        const prices = recent.map(h => h.close);

        // Simple momentum: 5-day return
        const fiveDayReturn = (prices[prices.length - 1] - prices[prices.length - 6]) / prices[prices.length - 6] * 100;

        // Mean reversion: 20-day SMA vs current
        const sma20 = prices.reduce((a, b) => a + b, 0) / prices.length;
        const deviation = ((d.price - sma20) / sma20) * 100;

        // Volume spike
        const avgVol = d.history.slice(-20).reduce((a, h) => a + h.volume, 0) / 20;
        const volRatio = d.volume / avgVol;

        let score = 50;
        let tag = 'value';
        let tagLabel = 'Value';
        let reason = '';

        // Momentum play: strong recent uptrend with high volume
        if (fiveDayReturn > 3 && volRatio > 1.2) {
            score = Math.min(95, 70 + Math.round(fiveDayReturn * 2));
            tag = 'momentum';
            tagLabel = 'Momentum';
            reason = `Strong ${fiveDayReturn.toFixed(1)}% rally over 5 days with ${volRatio.toFixed(1)}x average volume. Trend may continue.`;
        }
        // Recovery play: oversold bounce potential
        else if (deviation < -4 && fiveDayReturn > -1) {
            score = Math.min(90, 65 + Math.round(Math.abs(deviation)));
            tag = 'recovery';
            tagLabel = 'Recovery';
            reason = `Trading ${Math.abs(deviation).toFixed(1)}% below 20-day average. Could be an oversold bounce opportunity.`;
        }
        // Value play: stable with slight dip
        else if (deviation < -1 && deviation > -4 && d.changePct > -1) {
            score = Math.min(85, 60 + Math.round(Math.abs(deviation) * 3));
            tag = 'value';
            tagLabel = 'Value';
            reason = `Slightly below fair value (20-day avg). Stable sector with low downside risk.`;
        }
        else {
            return; // Skip stocks that don't match any criteria
        }

        const upside = Math.abs(deviation) + Math.random() * 3 + 2;
        results.push({
            symbol: sym,
            score,
            tag,
            tagLabel,
            reason,
            currentPrice: d.price,
            target: +(d.price * (1 + upside / 100)).toFixed(2),
        });
    });

    return results.sort((a, b) => b.score - a.score).slice(0, 6);
}

// ---- Sector Performance ----
function renderSectors() {
    const sectorPerf = {};
    Object.entries(stockData).forEach(([sym, d]) => {
        const sector = STOCKS[sym]?.sector || 'Other';
        if (!sectorPerf[sector]) sectorPerf[sector] = { total: 0, count: 0 };
        sectorPerf[sector].total += d.changePct;
        sectorPerf[sector].count++;
    });

    const sectors = Object.entries(sectorPerf)
        .map(([name, d]) => ({ name, change: +(d.total / d.count).toFixed(2) }))
        .sort((a, b) => b.change - a.change);

    const grid = document.getElementById('sectorGrid');
    grid.innerHTML = sectors.map(s => `
        <div class="sector-item ${s.change >= 0 ? 'positive' : 'negative'}">
            <div class="sector-name">${s.name}</div>
            <div class="sector-change ${s.change >= 0 ? 'positive' : 'negative'}">
                ${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)}%
            </div>
        </div>
    `).join('');
}

// ---- Full Stock Table ----
function renderFullTable(sortBy = 'changePct', sortDir = 'desc') {
    const entries = Object.entries(stockData);

    entries.sort((a, b) => {
        const va = a[1][sortBy] ?? a[0];
        const vb = b[1][sortBy] ?? b[0];
        if (sortBy === 'symbol' || sortBy === 'name') {
            const sa = sortBy === 'name' ? (STOCKS[a[0]]?.name || a[0]) : a[0];
            const sb = sortBy === 'name' ? (STOCKS[b[0]]?.name || b[0]) : b[0];
            return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
        }
        return sortDir === 'asc' ? va - vb : vb - va;
    });

    document.getElementById('stockCount').textContent = `${entries.length} stocks tracked`;

    const tbody = document.getElementById('fullTableBody');
    tbody.innerHTML = entries.map(([sym, d]) => {
        const changeClass = d.changePct >= 0 ? 'positive' : 'negative';
        const arrow = d.changePct >= 0 ? '▲' : '▼';
        return `
            <tr data-symbol="${sym}">
                <td class="td-symbol">${sym}</td>
                <td>${STOCKS[sym]?.name || sym}</td>
                <td class="td-price">$${d.price.toFixed(2)}</td>
                <td class="td-change ${changeClass}">${d.change >= 0 ? '+' : ''}$${d.change.toFixed(2)}</td>
                <td class="td-change ${changeClass}">${arrow} ${Math.abs(d.changePct).toFixed(2)}%</td>
                <td class="td-volume">${formatVolume(d.volume)}</td>
                <td class="td-price">$${d.high.toFixed(2)}</td>
                <td class="td-price">$${d.low.toFixed(2)}</td>
                <td><canvas class="mini-chart" id="full-mini-${sym}"></canvas></td>
            </tr>
        `;
    }).join('');

    // Draw mini charts
    entries.forEach(([sym, d]) => {
        const canvas = document.getElementById(`full-mini-${sym}`);
        if (canvas && d.history && d.history.length >= 5) {
            const ctx = canvas.getContext('2d');
            const recent = d.history.slice(-10);
            const prices = recent.map(h => h.close);
            canvas.width = 80;
            canvas.height = 30;
            const min = Math.min(...prices);
            const max = Math.max(...prices);
            const range = max - min || 1;
            const isPos = prices[prices.length - 1] >= prices[0];
            ctx.beginPath();
            ctx.strokeStyle = isPos ? '#00d4aa' : '#ff4757';
            ctx.lineWidth = 1.5;
            ctx.lineJoin = 'round';
            prices.forEach((p, i) => {
                const x = (i / (prices.length - 1)) * 76 + 2;
                const y = 28 - ((p - min) / range) * 24;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }
    });

    // Click to select stock
    tbody.querySelectorAll('tr').forEach(tr => {
        tr.addEventListener('click', () => {
            const sym = tr.dataset.symbol;
            if (sym) selectStock(sym);
        });
    });
}

// ============================================================
//  INTERACTIONS
// ============================================================

function selectStock(symbol) {
    if (!stockData[symbol]) return;
    currentChartSymbol = symbol;
    renderChart();
    // Scroll to chart
    document.querySelector('.chart-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---- Search ----
function setupSearch() {
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');

    input.addEventListener('input', () => {
        const q = input.value.trim().toUpperCase();
        if (!q) {
            results.classList.add('hidden');
            return;
        }

        const matches = Object.entries(STOCKS)
            .filter(([sym, info]) => sym.includes(q) || info.name.toUpperCase().includes(q))
            .slice(0, 8);

        if (!matches.length) {
            results.classList.add('hidden');
            return;
        }

        results.classList.remove('hidden');
        results.innerHTML = matches.map(([sym, info]) => `
            <div class="search-result-item" data-symbol="${sym}">
                <div>
                    <span class="sr-symbol">${sym}</span>
                    <span class="sr-name"> — ${info.name}</span>
                </div>
            </div>
        `).join('');

        results.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', () => {
                selectStock(el.dataset.symbol);
                input.value = '';
                results.classList.add('hidden');
            });
        });
    });

    // Close on click outside
    document.addEventListener('click', e => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.classList.add('hidden');
        }
    });
}

// ---- Chart Range Toggles ----
function setupChartControls() {
    document.querySelectorAll('.chip[data-range]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.chip[data-range]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentChartRange = btn.dataset.range;
            renderChart();
        });
    });
}

// ---- Table Sorting ----
function setupTableSorting() {
    let sortBy = 'changePct';
    let sortDir = 'desc';

    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.sort;
            if (sortBy === col) {
                sortDir = sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                sortBy = col;
                sortDir = 'desc';
            }
            renderFullTable(sortBy, sortDir);
        });
    });
}

// ---- API Modal ----
function setupModal() {
    const modal = document.getElementById('apiModal');
    const saved = localStorage.getItem('finnhub_api_key');

    if (saved) {
        CONFIG.API_KEY = saved;
        CONFIG.DEMO_MODE = false;
    }

    document.getElementById('btnSettings').addEventListener('click', () => {
        document.getElementById('apiKeyInput').value = CONFIG.API_KEY;
        modal.classList.remove('hidden');
    });

    document.getElementById('btnSkipApi').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    document.getElementById('btnSaveApi').addEventListener('click', () => {
        const key = document.getElementById('apiKeyInput').value.trim();
        if (key) {
            CONFIG.API_KEY = key;
            CONFIG.DEMO_MODE = false;
            localStorage.setItem('finnhub_api_key', key);
            modal.classList.add('hidden');
            updateModeBadge();
            initDashboard();
        }
    });
}

// ---- Theme Toggle ----
function setupThemeToggle() {
    const btn = document.getElementById('btnTheme');
    const icon = btn.querySelector('i');
    const saved = localStorage.getItem('theme') || 'dark';
    applyTheme(saved);

    btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('theme', next);
    });

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'light') {
            icon.className = 'fa-solid fa-moon';
        } else {
            icon.className = 'fa-solid fa-sun';
        }
        // Re-render charts with updated colors if they exist
        if (priceChart || volumeChart) {
            setTimeout(() => renderChart(), 50);
        }
    }
}

function updateModeBadge() {
    const badge = document.getElementById('modeBadge');
    const footer = document.getElementById('footerMode');
    if (CONFIG.DEMO_MODE) {
        badge.textContent = 'DEMO';
        badge.classList.remove('live');
        footer.textContent = 'Demo Mode';
    } else {
        badge.textContent = 'LIVE';
        badge.classList.add('live');
        footer.textContent = 'Live Data via Finnhub API';
    }
}

// ---- Market Status ----
function updateMarketStatus() {
    const now = new Date();
    const nyHour = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hour = nyHour.getHours();
    const day = nyHour.getDay();
    const isOpen = day >= 1 && day <= 5 && hour >= 9 && hour < 16;

    const statusEl = document.getElementById('marketStatus');
    const statusText = statusEl.querySelector('.status-text');

    if (isOpen) {
        statusEl.classList.add('open');
        statusText.textContent = 'Market Open';
    } else {
        statusEl.classList.remove('open');
        if (hour >= 16 && hour < 20 && day >= 1 && day <= 5) {
            statusText.textContent = 'After Hours';
        } else if (hour >= 4 && hour < 9 && day >= 1 && day <= 5) {
            statusText.textContent = 'Pre-Market';
        } else {
            statusText.textContent = 'Market Closed';
        }
    }
}

function updateTimestamp() {
    const el = document.getElementById('lastUpdated');
    const now = new Date();
    el.querySelector('span').textContent = now.toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
}

// ============================================================
//  UTILITIES
// ============================================================

function formatNumber(n) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVolume(v) {
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
    if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
    return v.toString();
}

// ============================================================
//  INITIALIZATION
// ============================================================

async function initDashboard() {
    if (CONFIG.DEMO_MODE) {
        generateDemoData();
    } else {
        await loadLiveData();
    }

    renderIndices();
    renderGainersLosers();
    renderMostActive();
    renderChart();
    renderSuggestions();
    renderSectors();
    renderFullTable();
    updateTimestamp();
    updateMarketStatus();
}

function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(async () => {
        if (CONFIG.DEMO_MODE) {
            // Slightly vary existing prices to simulate real-time updates
            Object.keys(stockData).forEach(sym => {
                const d = stockData[sym];
                const microChange = (Math.random() - 0.5) * d.price * 0.002;
                d.price = +(d.price + microChange).toFixed(2);
                d.change = +(d.price - d.prevClose).toFixed(2);
                d.changePct = +((d.change / d.prevClose) * 100).toFixed(2);
                if (d.price > d.high) d.high = d.price;
                if (d.price < d.low) d.low = d.price;
            });
        } else {
            // Re-fetch live quotes
            const symbols = Object.keys(STOCKS);
            for (const sym of symbols.slice(0, 15)) {
                const q = await fetchQuote(sym);
                if (q) Object.assign(stockData[sym], q);
            }
        }

        renderIndices();
        renderGainersLosers();
        renderMostActive();
        renderChart();
        renderSectors();
        renderFullTable();
        updateTimestamp();
        updateMarketStatus();
    }, CONFIG.REFRESH_INTERVAL);
}

// ---- Boot ----
document.addEventListener('DOMContentLoaded', async () => {
    setupModal();
    setupThemeToggle();
    setupSearch();
    setupChartControls();
    setupTableSorting();
    updateModeBadge();

    await initDashboard();
    startAutoRefresh();
});
