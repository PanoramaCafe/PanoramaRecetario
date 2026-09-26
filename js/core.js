/* Panorama Recetario — módulo core */


    function loadAppState() {
      try {
        const raw = safeStorage.getItem('recetario_pro_data_v5');
        if (!raw) return JSON.parse(JSON.stringify(defaultData));
        const parsed = JSON.parse(raw);
        return {
          insumos: Array.isArray(parsed.insumos) ? parsed.insumos : [],
          recetas: Array.isArray(parsed.recetas) ? parsed.recetas : [],
        };
      } catch (e) {
        console.warn('Datos locales inválidos; se inicia con estructura vacía.', e);
        return JSON.parse(JSON.stringify(defaultData));
      }
    }


    function saveToStorage() {
      safeStorage.setItem('recetario_pro_data_v5', JSON.stringify(appState));
      updateSummaryCounts();
      if (typeof window.queueCloudSave === 'function') window.queueCloudSave();
    }


    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.remove('active'); });
      document.querySelectorAll('.nav-btn').forEach(function(el) { el.classList.remove('active'); });
      
      const tabEl = document.getElementById('tab-' + tabId);
      if (tabEl) tabEl.classList.add('active');
      
      const btnEl = document.getElementById('btn-tab-' + tabId);
      if (btnEl) btnEl.classList.add('active');

      if (tabId === 'matriz') renderBCGMatrix();
      if (tabId === 'analisis') renderAnalysis();
      if (tabId === 'insumos') renderInsumos();
      if (tabId === 'recetas') { renderInsumoOptions(); renderRecipeIngredientsTable(); }
      if (tabId === 'import-export') updateSummaryCounts();
    }


    function updateSummaryCounts() {
      if (document.getElementById('stat-count-insumos')) {
        document.getElementById('stat-count-insumos').innerText = appState.insumos.length;
        document.getElementById('stat-count-recetas').innerText = appState.recetas.length;
      }
    }

    function getInsumoUnitCost(ins) {
      if (!ins) return 0;
      if (ins.costoModo === 'directo' && isFinite(Number(ins.costoDirecto))) return Number(ins.costoDirecto) || 0;
      if (ins.costoPorUnidadUso !== undefined && isFinite(Number(ins.costoPorUnidadUso))) return Number(ins.costoPorUnidadUso) || 0;
      const purchase = Number(ins.costoCompra) || 0;
      const contenido = Number(ins.contenidoPresentacion || ins.contenido || 0);
      const unidades = Math.max(1, Number(ins.unidadesPorCompra || ins.unitsPerPurchase || 1));
      const factor = Number(ins.factor) || ((String(ins.unidadCompra || '').toLowerCase() === 'kg' || String(ins.unidadCompra || '').toLowerCase() === 'l') ? 1000 : 1);
      const base = contenido > 0 ? purchase / (unidades * contenido * factor) : purchase / (unidades * factor);
      const aprovechamiento = Math.max(0.0001, Math.min(1, (Number(ins.aprovechamiento ?? (100 - Number(ins.merma || 0)))) / 100));
      return base / aprovechamiento;
    }


    function getInsumoAprovechamiento(ins) {
      if (!ins) return 100;
      if (ins.aprovechamiento !== undefined) return Number(ins.aprovechamiento) || 0;
      return Math.max(0, 100 - (Number(ins.merma) || 0));
    }


    function getInsumoUnidadBase(ins) {
      const raw = String(ins?.unidadBase || '').trim().toLowerCase();
      const compra = String(ins?.unidadCompra || '').trim().toLowerCase();
      if (raw === 'kg' || raw === 'kilogramo' || raw === 'kilogramos' || compra === 'kg') return 'g';
      if (raw === 'l' || raw === 'lt' || raw === 'litro' || raw === 'litros' || compra === 'l') return 'ml';
      if (raw === 'ml' || raw === 'mililitro' || raw === 'mililitros') return 'ml';
      if (raw === 'g' || raw === 'gramo' || raw === 'gramos') return 'g';
      return raw || 'pza';
    }
