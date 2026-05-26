(function () {
  'use strict';

  // ============================================================
  // CONFIG
  // ============================================================
  const CONFIG = {
    // DEEPSEEK API — ücretsiz bir API key kullanın
    // https://platform.deepseek.com/ adresinden alabilirsiniz
    DEEPSEEK_API_KEY: 'sk-eeb…948c',
    DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions',
    DEEPSEEK_MODEL: 'deepseek-chat',

    // Kullanım limitleri
    FREE_TRIALS: 3,

    // Fiyatlandırma
    PRICES: {
      mini: { name: 'Mini Paket (50 Ürün)', price: '99 TL', credits: 50 },
      pro: { name: 'Pro Paket (200 Ürün)', price: '249 TL', credits: 200 },
      ultra: { name: 'Ultra Paket (Sınırsız / Aylık)', price: '499 TL / ay', credits: Infinity },
    },
  };

  // ============================================================
  // STATE (localStorage'ta saklanır)
  // ============================================================
  const STATE_KEY = 'tylershop_state';

  function getState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) { /* ignore */ }
    return { usage: 0, credits: 0, refCodes: [] };
  }

  function saveState(state) {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  function getCredits(state) {
    return Math.max(0, (state.credits || 0));
  }

  function canGenerate(state) {
    const freeLeft = Math.max(0, CONFIG.FREE_TRIALS - (state.usage || 0));
    const paidLeft = getCredits(state);
    // Ultra (sınırsız) durumunda credits = Infinity
    if (paidLeft === Infinity) return true;
    return freeLeft > 0 || paidLeft > 0;
  }

  function consumeCredit(state) {
    const freeLeft = Math.max(0, CONFIG.FREE_TRIALS - (state.usage || 0));
    if (freeLeft > 0) {
      state.usage = (state.usage || 0) + 1;
    } else if (getCredits(state) > 0) {
      state.credits = Math.max(0, (state.credits || 0) - 1);
    }
    saveState(state);
  }

  function getFreeRemaining(state) {
    return Math.max(0, CONFIG.FREE_TRIALS - (state.usage || 0));
  }

  function getPaidRemaining(state) {
    const c = getCredits(state);
    return c === Infinity ? '∞' : c;
  }

  // ============================================================
  // DOM REFS
  // ============================================================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const el = {
    heroCta: $('#heroCta'),
    generateBtn: $('#generateBtn'),
    regenerateBtn: $('#regenerateBtn'),
    copyBtn: $('#copyBtn'),
    productName: $('#productName'),
    productCategory: $('#productCategory'),
    productFeatures: $('#productFeatures'),
    toneSelect: $('#toneSelect'),
    loading: $('#loadingIndicator'),
    resultArea: $('#resultArea'),
    resultText: $('#resultText'),
    seoPreview: $('#seoPreview'),
    seoTitle: $('#seoTitle'),
    seoDesc: $('#seoDesc'),
    usageCount: $('#usageCount'),
    usageLimit: $('#usageLimit'),
    usageRemaining: $('#usageRemaining'),

    tabSingle: $('#tabSingle'),
    tabBatch: $('#tabBatch'),
    singleTab: $('#singleTab'),
    batchTab: $('#batchTab'),

    csvFile: $('#csvFile'),
    fileUploadArea: $('#fileUploadArea'),
    csvPreview: $('#csvPreview'),
    csvCount: $('#csvCount'),
    csvTableWrapper: $('#csvTableWrapper'),
    batchGenerateBtn: $('#batchGenerateBtn'),
    batchProgress: $('#batchProgress'),
    progressFill: $('#progressFill'),
    batchProgressText: $('#batchProgressText'),
    batchResults: $('#batchResults'),
    batchResultTable: $('#batchResultTable'),
    downloadCsvBtn: $('#downloadCsvBtn'),
    sampleCsvLink: $('#sampleCsvLink'),

    purchaseModal: $('#purchaseModal'),
    modalClose: $('#modalClose'),
    modalTitle: $('#modalTitle'),
    modalPackage: $('#modalPackage'),
    modalAmount: $('#modalAmount'),
    ibanDisplay: $('#ibanDisplay'),
    refCode: $('#refCode'),

    toast: $('#toast'),
  };

  // ============================================================
  // TOAST & HELPERS
  // ============================================================
  let toastTimer;

  function showToast(msg, type) {
    clearTimeout(toastTimer);
    el.toast.textContent = msg;
    el.toast.className = 'toast show' + (type ? ' ' + type : '');
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2500);
  }

  function showError(msg) { showToast(msg || 'Bir hata oluştu.', 'error'); }

  function deepCopy(text) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Kopyalandı! 📋', 'success'))
      .catch(() => {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast('Kopyalandı! 📋', 'success');
      });
  }

  function scrollTo(el, offset) {
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.pageYOffset - (offset || 80);
    window.scrollTo({ top, behavior: 'smooth' });
  }

  // ============================================================
  // DEEPSEEK API CALL
  // ============================================================
  async function generateDescription(name, category, features, tone) {
    const systemPrompt = `Sen profesyonel bir e-ticaret metin yazarısın. Ürün açıklamaları yazıyorsun.

Stil: ${tone || 'profesyonel'}
Dil: Türkçe

Kurallar:
- 80-150 kelime arası olsun
- SEO uyumlu olsun (anahtar kelimeleri doğal geçirin)
- Satış odaklı, ikna edici olsun
- HTML etiketi kullanma, düz metin yaz
- Madde işareti kullanma, akıcı paragraflar halinde yaz
- Ürünün faydalarına odaklan, özelliklerini öv
- Harekete geçirici ifade ile bitir (örn: "Hemen sipariş verin!")

Ürün adı: ${name}
Kategori: ${category || 'Genel'}
Öne çıkan özellikler: ${features || 'Belirtilmemiş'}`;

    const userPrompt = `"${name}" ürünü için ${category || 'genel'} kategorisinde, ${tone || 'profesyonel'} tonda bir açıklama yaz.`;

    const response = await fetch(CONFIG.DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: CONFIG.DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const errData = await response.text();
      let msg = `API Hatası: ${response.status}`;
      try {
        const j = JSON.parse(errData);
        if (j.error && j.error.message) msg = j.error.message;
      } catch (_) {}
      throw new Error(msg);
    }

    const data = await response.json();
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('DeepSeek yanıtında açıklama bulunamadı.');
    return content.trim();
  }

  // ============================================================
  // UI — KULLANIM GÖSTERGESİ
  // ============================================================
  function updateUsageUI() {
    const state = getState();
    const freeLeft = getFreeRemaining(state);
    const paidLeft = getPaidRemaining(state);

    el.usageCount.textContent = (state.usage || 0);
    el.usageLimit.textContent = CONFIG.FREE_TRIALS;

    const remainingEl = el.usageRemaining;
    if (freeLeft > 0) {
      remainingEl.textContent = `${freeLeft} ücretsiz kullanım kaldı`;
      remainingEl.className = 'usage-remaining ok';
    } else if (paidLeft === Infinity) {
      remainingEl.textContent = 'Sınırsız 🌟';
      remainingEl.className = 'usage-remaining ok';
    } else if (paidLeft > 0) {
      remainingEl.textContent = `${paidLeft} kredi kaldı`;
      remainingEl.className = 'usage-remaining warn';
    } else {
      remainingEl.textContent = 'Kredi bitti — Satın Al';
      remainingEl.className = 'usage-remaining full';
    }
  }

  // ============================================================
  // UI — TEK ÜRÜN ÜRETİMİ
  // ============================================================
  async function handleGenerate() {
    const state = getState();
    if (!canGenerate(state)) {
      showPurchase('mini');
      return;
    }

    const name = el.productName.value.trim();
    if (!name) {
      showError('Lütfen ürün adını girin.');
      el.productName.focus();
      return;
    }

    const category = el.productCategory.value;
    const features = el.productFeatures.value.trim();
    const tone = el.toneSelect.value;

    // Butonu devre dışı bırak
    el.generateBtn.disabled = true;
    el.generateBtn.textContent = '⏳ Oluşturuluyor...';
    el.loading.classList.remove('hidden');
    el.resultArea.classList.add('hidden');

    try {
      const description = await generateDescription(name, category, features, tone);
      consumeCredit(getState()); // state güncellenir
      el.resultText.textContent = description;
      el.resultArea.classList.remove('hidden');
      el.seoPreview.classList.remove('hidden');
      el.seoTitle.textContent = `${name} | ${category || 'Kaliteli Ürün'} | TylerShop`;
      el.seoDesc.textContent = description.substring(0, 155) + '...';
      updateUsageUI();
      showToast('✅ Açıklama oluşturuldu!', 'success');
      scrollTo(el.resultArea, 20);
    } catch (err) {
      console.error('Generate error:', err);
      showError('Hata: ' + err.message);
    } finally {
      el.generateBtn.disabled = false;
      el.generateBtn.textContent = '🚀 Açıklama Üret';
      el.loading.classList.add('hidden');
    }
  }

  async function handleRegenerate() {
    const name = el.productName.value.trim();
    if (!name) {
      showError('Lütfen ürün adını girin.');
      return;
    }

    const state = getState();
    if (!canGenerate(state)) {
      showPurchase('mini');
      return;
    }

    el.regenerateBtn.disabled = true;
    el.regenerateBtn.textContent = '⏳...';

    try {
      const description = await generateDescription(
        name,
        el.productCategory.value,
        el.productFeatures.value.trim(),
        el.toneSelect.value
      );
      consumeCredit(getState());
      el.resultText.textContent = description;
      el.seoTitle.textContent = `${name} | ${el.productCategory.value || 'Kaliteli Ürün'} | TylerShop`;
      el.seoDesc.textContent = description.substring(0, 155) + '...';
      updateUsageUI();
      showToast('✅ Yeniden oluşturuldu!', 'success');
    } catch (err) {
      console.error('Regenerate error:', err);
      showError('Hata: ' + err.message);
    } finally {
      el.regenerateBtn.disabled = false;
      el.regenerateBtn.textContent = '🔄 Yeniden Üret';
    }
  }

  // ============================================================
  // COPY
  // ============================================================
  function handleCopy() {
    const text = el.resultText.textContent.trim();
    if (!text) {
      showError('Kopyalanacak açıklama yok.');
      return;
    }
    deepCopy(text);
  }

  // ============================================================
  // CSV — SAMPLE
  // ============================================================
  function downloadSampleCsv(e) {
    e.preventDefault();
    const header = 'ürün_adı,kategori,özellikler,ton';
    const rows = [
      'Deri Cüzdan,Aksesuar,"Gerçek deri, 10 kartlık, RFID korumalı",lüks',
      'Bluetooth Kulaklık,Elektronik,"Aktif gürültü önleme, 30 saat pil, IPX5",profesyonel',
      'El Yapımı Lavanta Mumu,Ev & Yaşam,"Soya mumu, 60 saat yanma, cam kavanoz",samimi',
    ];
    const csv = header + '\n' + rows.join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ornek_urunler.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ============================================================
  // CSV PARSE & PREVIEW
  // ============================================================
  let parsedCsv = [];

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return { header: [], rows: [] };

    // BOM temizliği
    const header = lines[0].replace(/^\ufeff/, '').split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      // Basit CSV parser (tırnak içindeki virgülleri korur)
      const vals = parseCSVLine(lines[i]);
      const obj = {};
      header.forEach((h, idx) => { obj[h] = (vals[idx] || '').trim(); });
      rows.push(obj);
    }
    return { header, rows };
  }

  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result.map(v => v.replace(/^"|"$/g, ''));
  }

  function displayCsvPreview(rows) {
    const maxShow = Math.min(rows.length, 50);
    const limited = rows.slice(0, maxShow);
    el.csvCount.textContent = limited.length;

    let html = '<table><thead><tr><th>#</th><th>Ürün Adı</th><th>Kategori</th>';
    if (limited[0] && limited[0]['özellikler'] !== undefined) html += '<th>Özellikler</th>';
    if (limited[0] && limited[0]['ton'] !== undefined) html += '<th>Ton</th>';
    html += '<th>Durum</th></tr></thead><tbody>';

    limited.forEach((row, i) => {
      const name = row['ürün_adı'] || row['urun_adi'] || row['ürün'] || '-';
      const cat = row['kategori'] || '';
      const feat = row['özellikler'] || '';
      const tone = row['ton'] || '';
      const status = '<span class="usage-remaining ok">Bekliyor</span>';
      html += `<tr><td>${i + 1}</td><td>${escapeHtml(name)}</td><td>${escapeHtml(cat)}</td>`;
      if (row['özellikler'] !== undefined) html += `<td>${escapeHtml(feat)}</td>`;
      if (row['ton'] !== undefined) html += `<td>${escapeHtml(tone)}</td>`;
      html += `<td>${status}</td></tr>`;
    });

    html += '</tbody></table>';
    el.csvTableWrapper.innerHTML = html;
    el.csvPreview.classList.remove('hidden');
    el.batchResults.classList.add('hidden');
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ============================================================
  // CSV — FILE HANDLER
  // ============================================================
  function handleCsvFile(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const text = e.target.result;
      const result = parseCSV(text);
      if (result.rows.length === 0) {
        showError('CSV dosyasında ürün bulunamadı. Başlık ve en az 1 ürün satırı olmalı.');
        return;
      }
      if (result.rows.length > 50) {
        showError(`Maksimum 50 ürün desteklenir. Dosyada ${result.rows.length} ürün var.`);
        return;
      }
      parsedCsv = result.rows;
      displayCsvPreview(parsedCsv);
      showToast(`📄 ${parsedCsv.length} ürün yüklendi`, 'success');
    };
    reader.onerror = function () {
      showError('Dosya okunamadı.');
    };
    reader.readAsText(file, 'UTF-8');
  }

  // ============================================================
  // BATCH GENERATE
  // ============================================================
  let batchAbort = false;

  function enableBatchUI(enabled) {
    el.batchGenerateBtn.disabled = !enabled;
    el.batchGenerateBtn.textContent = enabled ? '🚀 Tümünü Üret' : '⏳ Üretiliyor...';
  }

  async function handleBatchGenerate() {
    if (parsedCsv.length === 0) {
      showError('Önce bir CSV dosyası yükleyin.');
      return;
    }

    const state = getState();
    const needed = parsedCsv.length;
    const freeLeft = getFreeRemaining(state);
    const paidLeft = getCredits(state);

    // Kredi kontrolü (tekli kullanım gibi ücretsiz + kredi toplamı)
    const totalAvailable = freeLeft + (paidLeft === Infinity ? Infinity : paidLeft);
    if (totalAvailable < needed && totalAvailable !== Infinity) {
      showError(`Yetersiz kredi. ${needed} ürün için satın almanız gerekiyor.`);
      return;
    }

    batchAbort = false;
    enableBatchUI(false);
    el.batchProgress.classList.remove('hidden');
    el.batchResults.classList.add('hidden');

    const results = [];
    let completed = 0;

    for (let i = 0; i < parsedCsv.length; i++) {
      if (batchAbort) break;
      const row = parsedCsv[i];

      try {
        const name = row['ürün_adı'] || row['urun_adi'] || row['ürün'] || '';
        const category = row['kategori'] || '';
        const features = row['özellikler'] || '';
        const tone = row['ton'] || 'profesyonel';

        if (!name) {
          results.push({ ...row, açıklama: '(ürün adı eksik)', hata: 'Eksik ad' });
        } else {
          const desc = await generateDescription(name, category, features, tone);
          results.push({ ...row, açıklama: desc });
          consumeCredit(getState());
        }
      } catch (err) {
        console.error(`Batch error row ${i}:`, err);
        results.push({ ...row, açıklama: '(hata oluştu)', hata: err.message });
      }

      completed++;
      const pct = Math.round((completed / parsedCsv.length) * 100);
      el.progressFill.style.width = pct + '%';
      el.batchProgressText.textContent = `${completed} / ${parsedCsv.length}`;

      // UI güncelle
      const statusCells = el.csvTableWrapper.querySelectorAll('tbody td:last-child');
      if (statusCells[i]) {
        const hasError = results[i] && results[i].hata;
        statusCells[i].innerHTML = hasError
          ? '<span class="usage-remaining full">Hata ❌</span>'
          : '<span class="usage-remaining ok">✓ Tamam</span>';
      }
    }

    parsedCsv = results;
    el.batchProgress.classList.add('hidden');
    enableBatchUI(true);
    updateUsageUI();

    if (results.some(r => r.açıklama && !r.hata)) {
      displayBatchResults(results);
      showToast(`✅ ${results.filter(r => r.açıklama && !r.hata).length}/${results.length} ürün tamamlandı!`, 'success');
    } else {
      showError('Hiçbir açıklama oluşturulamadı. Lütfen API anahtarınızı kontrol edin.');
    }
  }

  function displayBatchResults(rows) {
    let html = '<table><thead><tr><th>#</th><th>Ürün Adı</th><th>Açıklama</th>';
    if (rows[0] && rows[0].hata !== undefined) html += '<th>Durum</th>';
    html += '</tr></thead><tbody>';

    rows.forEach((row, i) => {
      const name = row['ürün_adı'] || row['urun_adi'] || row['ürün'] || '-';
      const desc = row.açıklama || '';
      const hata = row.hata || '';
      html += `<tr><td>${i + 1}</td><td>${escapeHtml(name)}</td>`;
      html += `<td>${desc ? escapeHtml(desc.substring(0, 120)) + (desc.length > 120 ? '...' : '') : '-'}`;
      if (row.hata !== undefined) html += `<td>${hata ? '❌' : '✅'}</td>`;
      html += '</td></tr>';
    });

    html += '</tbody></table>';
    el.batchResultTable.innerHTML = html;
    el.batchResults.classList.remove('hidden');
    scrollTo(el.batchResults, 20);
  }

  // ============================================================
  // CSV DOWNLOAD
  // ============================================================
  function handleBatchDownload() {
    if (parsedCsv.length === 0) {
      showError('İndirilecek veri yok.');
      return;
    }

    // Başlık: orijinal sütunlar + açıklama
    const originalKeys = Object.keys(parsedCsv[0]).filter(k => k !== 'açıklama' && k !== 'hata');
    const header = [...originalKeys, 'açıklama'];
    const lines = [header.join(',')];

    parsedCsv.forEach(row => {
      const vals = header.map(key => {
        const val = row[key] || '';
        // Virgül, tırnak veya newline varsa tırnakla sar
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return '"' + val.replace(/"/g, '""') + '"';
        }
        return val;
      });
      lines.push(vals.join(','));
    });

    const csv = '\ufeff' + lines.join('\n'); // BOM ile UTF-8
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'urun_aciklamalari.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('📥 CSV indirildi!', 'success');
  }

  // ============================================================
  // PURCHASE MODAL
  // ============================================================
  function generateRefCode() {
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `TS-${date}-${rand}`;
  }

  function showPurchase(pkg) {
    const info = CONFIG.PRICES[pkg];
    if (!info) return;

    const refCode = generateRefCode();
    const state = getState();
    if (!state.refCodes) state.refCodes = [];
    state.refCodes.push({ code: refCode, package: pkg, date: new Date().toISOString() });
    saveState(state);

    el.modalTitle.textContent = 'Satın Al';
    el.modalPackage.textContent = info.name;
    el.modalAmount.textContent = info.price;
    el.refCode.textContent = refCode;

    el.purchaseModal.classList.remove('hidden');
  }

  function closeModal() {
    el.purchaseModal.classList.add('hidden');
  }

  function copyIBAN() {
    deepCopy('TR12 0006 2001 2345 6789 0000 11');
  }

  // ============================================================
  // TABS
  // ============================================================
  function switchTab(tab) {
    const isSingle = tab === 'single';
    el.tabSingle.classList.toggle('active', isSingle);
    el.tabBatch.classList.toggle('active', !isSingle);
    el.singleTab.classList.toggle('active', isSingle);
    el.batchTab.classList.toggle('active', !isSingle);
  }

  // ============================================================
  // DRAG & DROP
  // ============================================================
  let dragCounter = 0;

  function setupDragDrop() {
    const area = el.fileUploadArea;

    ['dragenter', 'dragover'].forEach(ev => {
      area.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        area.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(ev => {
      area.addEventListener(ev, (e) => {
        e.preventDefault();
        e.stopPropagation();
        area.classList.remove('drag-over');
      });
    });

    area.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].name.endsWith('.csv')) {
        handleCsvFile(files[0]);
      } else {
        showError('Lütfen .csv dosyası yükleyin.');
      }
    });

    // File input change
    el.csvFile.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleCsvFile(e.target.files[0]);
      }
    });
  }

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    // Usage
    el.usageLimit.textContent = CONFIG.FREE_TRIALS;
    updateUsageUI();

    // EVENTS — Single
    el.heroCta.addEventListener('click', () => {
      document.getElementById('app-section').scrollIntoView({ behavior: 'smooth' });
    });

    el.generateBtn.addEventListener('click', handleGenerate);
    el.regenerateBtn.addEventListener('click', handleRegenerate);
    el.copyBtn.addEventListener('click', handleCopy);

    // Enter tuşu ile üret
    el.productName.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleGenerate();
    });

    // Tabs
    el.tabSingle.addEventListener('click', () => switchTab('single'));
    el.tabBatch.addEventListener('click', () => switchTab('batch'));

    // CSV
    el.sampleCsvLink.addEventListener('click', downloadSampleCsv);
    el.batchGenerateBtn.addEventListener('click', handleBatchGenerate);
    el.downloadCsvBtn.addEventListener('click', handleBatchDownload);
    setupDragDrop();

    // Modal
    el.modalClose.addEventListener('click', closeModal);
    el.purchaseModal.addEventListener('click', (e) => {
      if (e.target === el.purchaseModal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Global for onclick handlers
    window.showPurchase = showPurchase;
    window.copyIBAN = copyIBAN;

    // Hızlı başlangıç için ürün adına odaklan
    el.productName.focus();

    console.log('✅ TylerShop başlatıldı!');
    console.log(`📊 Kullanım: ${getState().usage}/${CONFIG.FREE_TRIALS} ücretsiz`);
  }

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
