/* Panorama Recetario — módulo analysis */

    function viewHistory(id) {
      const rec = appState.recetas.find(function(r) { return r.id === id; });
      if (!rec) return;
      document.getElementById('history-product-title').innerText = 'Historial: ' + rec.nombre;
      const container = document.getElementById('history-list');
      container.innerHTML = '';

      (rec.historial || []).forEach(function(h, idx) {
        const prev = rec.historial[idx - 1];
        let diffText = '';
        if (prev) {
          const diff = h.costo - prev.costo;
          const diffPct = prev.costo > 0 ? ((diff / prev.costo) * 100).toFixed(1) : '0';
          diffText = diff >= 0 
            ? '<span class="font-mono" style="color: var(--status-danger-text);">🔺 +$' + diff.toFixed(2) + ' (+' + diffPct + '%)</span>' 
            : '<span class="font-mono" style="color: var(--status-success-text);">🔻 -$' + Math.abs(diff).toFixed(2) + ' (' + diffPct + '%)</span>';
        }
        container.innerHTML += '<div class="history-item">' +
          '<div style="display: flex; justify-content: space-between; font-weight: 700;">' +
            '<span class="font-mono">📅 ' + h.fecha + '</span>' +
            '<span>Costo: <span class="font-mono">$' + h.costo.toFixed(2) + '</span> ' + diffText + '</span>' +
          '</div>' +
          '<div style="color: var(--text-muted); margin-top: 0.25rem;">' +
            'Precio venta: <span class="font-mono">$' + h.precio.toFixed(2) + '</span> | Motivo: ' + (h.motivo || 'Actualización') +
          '</div>' +
        '</div>';
      });

      document.getElementById('history-modal').style.display = 'flex';
    }


    function closeHistoryModal() {
      document.getElementById('history-modal').style.display = 'none';
    }

    function renderBCGMatrix() {
      if (!appState.recetas || appState.recetas.length === 0) return;

      let totalMarginTimesUnits = 0;
      let totalUnits = 0;
      let totalProfit = 0;

      const analyzed = appState.recetas.map(function(rec) {
        const cost = calculateRecipeCost(rec);
        const margin = rec.precio - cost;
        const profit = margin * rec.ventas;
        totalMarginTimesUnits += margin * rec.ventas;
        totalUnits += rec.ventas;
        totalProfit += profit;
        return { id: rec.id, nombre: rec.nombre, precio: rec.precio, ventas: rec.ventas, cost: cost, margin: margin, profit: profit };
      });

      const avgMargin = totalUnits > 0 ? totalMarginTimesUnits / totalUnits : 0;
      const avgPop = (totalUnits / analyzed.length) * 0.7;

      document.getElementById('bcg-avg-margin').innerText = '$' + avgMargin.toFixed(2);
      document.getElementById('bcg-avg-pop').innerText = Math.round(avgPop) + ' uds';
      document.getElementById('bcg-total-profit').innerText = '$' + totalProfit.toLocaleString('es-MX', { minimumFractionDigits: 2 });

      const stars = [];
      const plowhorses = [];
      const puzzles = [];
      const dogs = [];

      analyzed.forEach(function(item) {
        const isHighMargin = item.margin >= avgMargin;
        const isHighPop = item.ventas >= avgPop;

        if (isHighMargin && isHighPop) stars.push(item);
        else if (!isHighMargin && isHighPop) plowhorses.push(item);
        else if (isHighMargin && !isHighPop) puzzles.push(item);
        else dogs.push(item);
      });

      document.getElementById('count-stars').innerText = stars.length;
      document.getElementById('count-plowhorses').innerText = plowhorses.length;
      document.getElementById('count-puzzles').innerText = puzzles.length;
      document.getElementById('count-dogs').innerText = dogs.length;

      renderQuadrantList('list-stars', stars, 'Proteger receta y visibilidad.');
      renderQuadrantList('list-plowhorses', plowhorses, 'Subir precio gradualmente.');
      renderQuadrantList('list-puzzles', puzzles, 'Impulsar con meseros.');
      renderQuadrantList('list-dogs', dogs, 'Evaluar retiro de carta.');

      const optSelect = document.getElementById('opt-select-product');
      optSelect.innerHTML = '<option value="">-- Seleccionar producto --</option>';
      plowhorses.forEach(function(p) {
        optSelect.innerHTML += '<option value="' + p.id + '">' + p.nombre + ' (Precio: $' + p.precio + ', Margen: $' + p.margin.toFixed(2) + ')</option>';
      });
    }


    function renderQuadrantList(elementId, items, tip) {
      const el = document.getElementById(elementId);
      if (items.length === 0) {
        el.innerHTML = '<div style="color: var(--text-muted); padding: 0.5rem 0; font-size: 0.8rem;">Ningún producto en este cuadrante.</div>';
        return;
      }
      let html = '<div style="color: var(--text-muted); font-size: 0.75rem; margin-bottom: 0.6rem;">💡 ' + tip + '</div>';
      items.forEach(function(i) {
        html += '<div style="background: var(--bg-subtle); padding: 0.55rem 0.75rem; border-radius: 0.5rem; margin-bottom: 0.4rem; display: flex; justify-content: space-between; border: 1px solid var(--border-subtle);">' +
          '<strong>' + i.nombre + '</strong>' +
          '<span class="font-mono" style="font-weight: 700;">$' + i.margin.toFixed(2) + ' <span style="color: var(--text-muted); font-size: 0.75rem;">(' + i.ventas + 'u)</span></span>' +
        '</div>';
      });
      el.innerHTML = html;
    }


    function runOptimizationSimulation() {
      const recId = document.getElementById('opt-select-product').value;
      const rec = appState.recetas.find(function(r) { return r.id === recId; });
      if (!rec) {
        document.getElementById('opt-results').innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 1.5rem; background: var(--bg-subtle); border-radius: 0.75rem;">Selecciona un producto para simular.</div>';
        return;
      }

      const cost = calculateRecipeCost(rec);
      const simPriceInput = document.getElementById('opt-sim-price');
      if (!simPriceInput.value) simPriceInput.value = Math.ceil(rec.precio * 1.12);

      const simPrice = parseFloat(simPriceInput.value) || rec.precio;
      const costReductionPct = (parseFloat(document.getElementById('opt-cost-reduction').value) || 0) / 100;
      const optimizedCost = cost * (1 - costReductionPct);

      const elasticity = -0.75;
      const priceChangePct = (simPrice - rec.precio) / rec.precio;
      const salesChangePct = elasticity * priceChangePct;
      const projectedSales = Math.max(0, Math.round(rec.ventas * (1 + salesChangePct)));

      const currentMargin = rec.precio - cost;
      const newMargin = simPrice - optimizedCost;
      const currentProfit = rec.ventas * currentMargin;
      const newProfit = projectedSales * newMargin;
      const netGain = newProfit - currentProfit;

      document.getElementById('opt-results').innerHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.85rem; text-align: center;">' +
        '<div style="background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 1rem; border-radius: 0.75rem;">' +
          '<div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Nuevo Margen Unitario</div>' +
          '<div class="font-mono" style="font-size: 1.25rem; font-weight: 900; color: var(--status-success-text); margin-top: 0.25rem;">$' + newMargin.toFixed(2) + '</div>' +
        '</div>' +
        '<div style="background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 1rem; border-radius: 0.75rem;">' +
          '<div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Ventas Proyectadas</div>' +
          '<div class="font-mono" style="font-size: 1.25rem; font-weight: 900; color: var(--text-main); margin-top: 0.25rem;">' + projectedSales + ' uds <span style="font-size: 0.7rem; color: var(--status-danger-text);">(' + Math.round(salesChangePct * 100) + '%)</span></div>' +
        '</div>' +
        '<div style="background: var(--bg-card); border: 1px solid var(--border-subtle); padding: 1rem; border-radius: 0.75rem;">' +
          '<div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Ganancia Mensual Neta</div>' +
          '<div class="font-mono" style="font-size: 1.25rem; font-weight: 900; color: ' + (netGain >= 0 ? 'var(--status-success-text)' : 'var(--status-danger-text)') + '; margin-top: 0.25rem;">' +
            (netGain >= 0 ? '+' : '') + '$' + netGain.toFixed(2) + ' MXN' +
          '</div>' +
        '</div>' +
      '</div>';
    }
