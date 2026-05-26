// TylerShop — E-Ticaret Ürün Açıklama Üretici
// DeepSeek API proxy üzerinden çalışır

const CONFIG = {
    API_ENDPOINT: '/api/generate',  // Serverless proxy endpoint
    MAX_FREE_USES: 3,
    MAX_BATCH_SIZE: 50,
    PRODUCTS: {
        '50': { name: '50 Ürün Paketi', price: 99 },
        '200': { name: '200 Ürün Paketi', price: 249 },
        'unlimited': { name: 'Sınırsız Aylık', price: 499 }
    }
};

// State
let state = {
    freeUsesLeft: parseInt(localStorage.getItem('ts_free_uses') || '3'),
    currentBatch: [],
    isGenerating: false
};

// DOM
document.addEventListener('DOMContentLoaded', () => {
    updateUsageDisplay();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('heroCta')?.addEventListener('click', () => {
        document.getElementById('generator').scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('generateBtn')?.addEventListener('click', generateSingle);
    document.getElementById('batchBtn')?.addEventListener('click', () => {
        document.getElementById('batchInput').click();
    });
    document.getElementById('batchInput')?.addEventListener('change', handleBatchUpload);
    document.getElementById('downloadCsv')?.addEventListener('click', downloadCSV);
}

function updateUsageDisplay() {
    const el = document.getElementById('usageCount');
    if (el) el.textContent = state.freeUsesLeft;
    
    const limitEl = document.getElementById('usageLimit');
    if (state.freeUsesLeft <= 0 && limitEl) {
        limitEl.style.display = 'block';
        document.getElementById('generateBtn')?.setAttribute('disabled', 'true');
        document.getElementById('batchBtn')?.setAttribute('disabled', 'true');
    }
}

async function generateSingle() {
    const productName = document.getElementById('productName')?.value.trim();
    const category = document.getElementById('category')?.value || 'Genel';

    if (!productName) {
        showError('Lütfen ürün adını girin.');
        return;
    }

    if (state.freeUsesLeft <= 0) {
        showPurchasePrompt();
        return;
    }

    state.isGenerating = true;
    showLoading(true);

    try {
        const response = await callDeepSeek(productName, category);
        displayResult(response);
        state.freeUsesLeft--;
        localStorage.setItem('ts_free_uses', state.freeUsesLeft.toString());
        updateUsageDisplay();
    } catch (err) {
        showError('Üretim sırasında hata oluştu. Lütfen tekrar deneyin.');
        console.error(err);
    } finally {
        state.isGenerating = false;
        showLoading(false);
    }
}

async function callDeepSeek(productName, category) {
    const response = await fetch(CONFIG.API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, category })
    });

    if (!response.ok) {
        throw new Error('API error: ' + response.status);
    }

    const data = await response.json();
    return data.description;
}

function displayResult(text) {
    const resultDiv = document.getElementById('result');
    const resultText = document.getElementById('resultText');
    if (resultDiv && resultText) {
        resultText.textContent = text;
        resultDiv.style.display = 'block';
    }
}

async function handleBatchUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (state.freeUsesLeft <= 0) {
        showPurchasePrompt();
        return;
    }

    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].toLowerCase();

    if (!headers.includes('ürün') && !headers.includes('product')) {
        showError('CSV dosyasında "ürün adı" sütunu olmalıdır.');
        return;
    }

    state.currentBatch = lines.slice(1).map(line => {
        const cols = line.split(',');
        return {
            name: cols[0]?.trim() || '',
            category: cols[1]?.trim() || 'Genel'
        };
    }).filter(item => item.name);

    document.getElementById('batchCount')!.textContent = state.currentBatch.length.toString();
    document.getElementById('batchInfo')!.style.display = 'block';

    await generateBatch();
}

async function generateBatch() {
    state.isGenerating = true;
    showLoading(true);

    const results = [];
    const toProcess = state.currentBatch.slice(0, CONFIG.MAX_BATCH_SIZE);

    try {
        for (const item of toProcess) {
            const desc = await callDeepSeek(item.name, item.category);
            results.push({ ...item, description: desc });
            
            const progress = Math.round((results.length / toProcess.length) * 100);
            document.getElementById('progressBar')!.style.width = progress + '%';
            document.getElementById('progressText')!.textContent = 
                `${results.length}/${toProcess.length} ürün tamamlandı`;
        }

        state.currentBatch = results;
        displayBatchResults(results);
        state.freeUsesLeft--;
        localStorage.setItem('ts_free_uses', state.freeUsesLeft.toString());
        updateUsageDisplay();
    } catch (err) {
        showError('Toplu üretim sırasında hata oluştu.');
        console.error(err);
    } finally {
        state.isGenerating = false;
        showLoading(false);
    }
}

function displayBatchResults(results) {
    const tbody = document.getElementById('batchResultsBody');
    if (!tbody) return;

    tbody.innerHTML = results.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${escapeHtml(r.category)}</td>
            <td>
                <button class="btn btn-sm" onclick="copyText('${escapeHtml(r.description).replace(/'/g, "\\'")}')">Kopyala</button>
            </td>
        </tr>
    `).join('');

    document.getElementById('batchResults')!.style.display = 'block';
}

function downloadCSV() {
    if (state.currentBatch.length === 0) return;

    const csv = [
        ['Ürün Adı', 'Kategori', 'Açıklama'].join(','),
        ...state.currentBatch.map(item => 
            [item.name, item.category, `"${(item.description || '').replace(/"/g, '""')}"`].join(',')
        )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'urun_aciklamalari.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.style.display = 'block';
            setTimeout(() => toast.style.display = 'none', 2000);
        }
    });
}

function showLoading(show) {
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = show ? 'block' : 'none';
}

function showError(msg) {
    const errorEl = document.getElementById('errorMsg');
    if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
        setTimeout(() => errorEl.style.display = 'none', 4000);
    }
}

function showPurchasePrompt() {
    const prompt = document.getElementById('purchasePrompt');
    if (prompt) prompt.style.display = 'block';
    document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
