/* Panorama Recetario — módulo recetas */

    function calculateRecipeCost(recipe) {
      if (!recipe || !Array.isArray(recipe.ingredientes)) return 0;
      return recipe.ingredientes.reduce(function(total, ing) {
        const ins = appState.insumos.find(function(i) { return i.id === ing.insumoId; });
        return total + (ins ? getInsumoUnitCost(ins) * (Number(ing.cantidad) || 0) : 0);
      }, 0);
    }


    function calculateCurrentRecipeCost() {
      const temp = { ingredientes: currentRecipeIngredients };
      const cost = calculateRecipeCost(temp);
      const price = parseFloat(document.getElementById('rec-precio').value) || 0;
      const margin = price - cost;
      const pct = price > 0 ? (cost / price) * 100 : 0;
      document.getElementById('rec-live-cost').innerText = '$' + cost.toFixed(2);
      document.getElementById('rec-live-margin').innerText = '$' + margin.toFixed(2);
      document.getElementById('rec-live-foodcost-pct').innerText = pct.toFixed(1) + '%';
      return cost;
    }


    function renderRecipeIngredientsTable() {
      const tbody = document.getElementById('recipe-ingredients-table');
      if (!tbody) return;
      if (!currentRecipeIngredients.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:1.5rem;">No hay ingredientes agregados.</td></tr>';
        calculateCurrentRecipeCost();
        return;
      }
      tbody.innerHTML = '';
      currentRecipeIngredients.forEach(function(ing, idx) {
        const ins = appState.insumos.find(function(i) { return i.id === ing.insumoId; });
        if (!ins) return;
        const unitCost = getInsumoUnitCost(ins);
        const subtotal = unitCost * (Number(ing.cantidad) || 0);
        tbody.innerHTML += '<tr>' +
          '<td><strong>' + ins.nombre + '</strong></td>' +
          '<td class="font-mono">' + Number(ing.cantidad).toFixed(2) + '</td>' +
          '<td>' + ins.unidadBase + '</td>' +
          '<td class="font-mono" style="text-align:right;">$' + subtotal.toFixed(2) + '</td>' +
          '<td style="text-align:center;"><button class="btn btn-danger btn-sm" onclick="removeIngredientFromCurrentRecipe(' + idx + ')">✕</button></td>' +
        '</tr>';
      });
      calculateCurrentRecipeCost();
    }


    function addIngredientToCurrentRecipe(event) {
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      const select = document.getElementById('rec-select-insumo');
      const qtyInput = document.getElementById('rec-cant-insumo');
      const searchInput = document.getElementById('rec-search-insumo');
      const rawSelectId = select ? String(select.value || '').trim() : '';
      const cantidad = qtyInput ? Number(qtyInput.value) : NaN;
      let resolvedId = rawSelectId;

      // Si el usuario buscó un insumo pero no abrió/seleccionó el select,
      // tomamos el único resultado coincidente automáticamente.
      if (!resolvedId && searchInput) {
        const q = String(searchInput.value || '').trim().toLocaleLowerCase('es-MX');
        if (q) {
          const matches = appState.insumos.filter(function(i) {
            return String(i.nombre || '').toLocaleLowerCase('es-MX').includes(q);
          });
          if (matches.length === 1) resolvedId = String(matches[0].id);
        }
      }

      const insumo = appState.insumos.find(function(i) { return String(i.id) === resolvedId; });
      if (!insumo) {
        alert('Selecciona un ingrediente de la lista.');
        if (select) select.focus();
        return false;
      }
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        alert('Ingresa una cantidad de uso mayor que 0.');
        if (qtyInput) qtyInput.focus();
        return false;
      }

      const existing = currentRecipeIngredients.find(function(i) { return String(i.insumoId) === resolvedId; });
      if (existing) existing.cantidad = Number(existing.cantidad || 0) + cantidad;
      else currentRecipeIngredients.push({ insumoId: resolvedId, cantidad: cantidad });

      if (qtyInput) qtyInput.value = '';
      renderRecipeIngredientsTable();
      updateSelectedInsumoInfo();
      return false;
    }


    function removeIngredientFromCurrentRecipe(index) {
      currentRecipeIngredients.splice(index, 1);
      renderRecipeIngredientsTable();
    }


    function resetRecipeForm() {
      editingRecipeId = null;
      currentRecipeIngredients = [];
      document.getElementById('recipe-form-title').innerText = 'Crear / Editar Ficha Técnica';
      document.getElementById('rec-nombre').value = '';
      document.getElementById('rec-precio').value = '';
      document.getElementById('rec-ventas').value = '';
      document.getElementById('rec-rendimiento').value = '1';
      document.getElementById('rec-procedimiento').value = '';
      document.getElementById('rec-notas').value = '';
      document.getElementById('rec-categoria').selectedIndex = 0;
      document.getElementById('rec-cant-insumo').value = '';
      renderRecipeIngredientsTable();
    }


    function editRecipe(id) {
      const rec = appState.recetas.find(function(r) { return r.id === id; });
      if (!rec) return;
      editingRecipeId = id;
      currentRecipeIngredients = JSON.parse(JSON.stringify(rec.ingredientes || []));
      document.getElementById('recipe-form-title').innerText = 'Editar Ficha Técnica';
      document.getElementById('rec-nombre').value = rec.nombre || '';
      document.getElementById('rec-categoria').value = rec.categoria || 'Bebidas Calientes';
      document.getElementById('rec-precio').value = rec.precio ?? '';
      document.getElementById('rec-ventas').value = rec.ventas ?? '';
      document.getElementById('rec-rendimiento').value = rec.rendimiento ?? 1;
      document.getElementById('rec-procedimiento').value = rec.procedimiento || '';
      document.getElementById('rec-notas').value = rec.notas || '';
      renderRecipeIngredientsTable();
      document.getElementById('tab-recetas').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }


    function deleteRecipe(id) {
      const rec = appState.recetas.find(function(r) { return r.id === id; });
      if (!rec || !confirm('¿Eliminar la ficha técnica de "' + rec.nombre + '"?')) return;
      appState.recetas = appState.recetas.filter(function(r) { return r.id !== id; });
      if (editingRecipeId === id) resetRecipeForm();
      saveToStorage();
      renderRecipesTable();
    }


    function saveRecipe() {
      const nombre = document.getElementById('rec-nombre').value.trim();
      const categoria = document.getElementById('rec-categoria').value;
      const precio = parseFloat(document.getElementById('rec-precio').value);
      const ventas = parseInt(document.getElementById('rec-ventas').value, 10) || 0;
      const rendimiento = parseFloat(document.getElementById('rec-rendimiento').value) || 1;
      const procedimiento = document.getElementById('rec-procedimiento').value.trim();
      const notas = document.getElementById('rec-notas').value.trim();
      if (!nombre || !isFinite(precio) || precio < 0) {
        alert('Completa el nombre y un precio de venta válido.');
        return;
      }
      if (!currentRecipeIngredients.length) {
        if (!confirm('La receta no tiene ingredientes. ¿Deseas guardarla de todos modos?')) return;
      }
      const cost = calculateRecipeCost({ ingredientes: currentRecipeIngredients });
      const now = new Date();
      const entry = { fecha: now.toLocaleDateString('es-MX'), costo: cost, precio: precio, motivo: editingRecipeId ? 'Actualización' : 'Creación' };
      let rec;
      if (editingRecipeId) {
        rec = appState.recetas.find(function(r) { return r.id === editingRecipeId; });
        if (!rec) { editingRecipeId = null; return saveRecipe(); }
        rec.nombre = nombre; rec.categoria = categoria; rec.precio = precio; rec.ventas = ventas; rec.rendimiento = rendimiento; rec.procedimiento = procedimiento; rec.notas = notas;
        rec.ingredientes = JSON.parse(JSON.stringify(currentRecipeIngredients));
        rec.historial = Array.isArray(rec.historial) ? rec.historial : [];
        rec.historial.push(entry);
      } else {
        rec = { id: 'rec_' + Date.now(), nombre: nombre, categoria: categoria, precio: precio, ventas: ventas, rendimiento: rendimiento, procedimiento: procedimiento, notas: notas, ingredientes: JSON.parse(JSON.stringify(currentRecipeIngredients)), historial: [entry] };
        appState.recetas.push(rec);
      }
      saveToStorage();
      renderRecipesTable();
      resetRecipeForm();
      alert('Ficha técnica guardada correctamente.');
    }


    function renderRecipesTable() {
      const tbody = document.getElementById('recipes-list-table');
      if (!tbody) return;
      if (!appState.recetas.length) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:1.5rem;">No hay fichas técnicas registradas.</td></tr>';
        return;
      }
      tbody.innerHTML = '';
      appState.recetas.forEach(function(r) {
        const cost = calculateRecipeCost(r);
        const margin = (Number(r.precio) || 0) - cost;
        const foodPct = r.precio > 0 ? (cost / r.precio) * 100 : 0;
        const rid = String(r.id).replace(/[^a-zA-Z0-9_-]/g, '');
        const detailId = 'recipe-detail-' + rid;
        const ingredients = (r.ingredientes || []).map(function(ing) {
          const ins = appState.insumos.find(function(i) { return i.id === ing.insumoId; });
          if (!ins) return '<li>Insumo eliminado — ' + Number(ing.cantidad || 0).toFixed(2) + '</li>';
          const unitCost = getInsumoUnitCost(ins);
          const sub = unitCost * (Number(ing.cantidad) || 0);
          return '<li style="margin:.3rem 0;display:flex;justify-content:space-between;gap:1rem;"><span>' + ins.nombre + ' — <strong>' + Number(ing.cantidad || 0).toFixed(2) + ' ' + (ins.unidadBase || '') + '</strong></span><span class="font-mono">$' + sub.toFixed(2) + '</span></li>';
        }).join('');
        tbody.innerHTML += '<tr>' +
          '<td><button class="btn btn-secondary btn-sm" onclick="toggleRecipeDetails(\'' + detailId + '\')">▸</button> <strong>' + r.nombre + '</strong></td>' +
          '<td><span class="badge badge-neutral">' + (r.categoria || '') + '</span></td>' +
          '<td class="font-mono" style="text-align:right;">$' + cost.toFixed(2) + '</td>' +
          '<td class="font-mono" style="text-align:right;">$' + Number(r.precio).toFixed(2) + '</td>' +
          '<td class="font-mono" style="text-align:right;">$' + margin.toFixed(2) + '</td>' +
          '<td class="font-mono" style="text-align:right;">' + foodPct.toFixed(1) + '%</td>' +
          '<td class="font-mono" style="text-align:center;">' + (r.ventas || 0) + '</td>' +
          '<td style="text-align:center;"><button class="btn btn-gold btn-sm" onclick="exportSingleRecipeExcel(\'' + r.id + '\')">📥</button></td>' +
          '<td style="text-align:center;"><div style="display:inline-flex;gap:.3rem;flex-wrap:wrap;justify-content:center;">' +
            '<button class="btn btn-secondary btn-sm" onclick="editRecipe(\'' + r.id + '\')">Editar</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="viewRecipePdf(\'' + r.id + '\')">PDF</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="viewHistory(\'' + r.id + '\')">Hist.</button>' +
            '<button class="btn btn-gold btn-sm" onclick="duplicateRecipe(\'' + r.id + '\')">Duplicar</button>' +
            '<button class="btn btn-danger btn-sm" onclick="deleteRecipe(\'' + r.id + '\')">🗑️</button>' +
          '</div></td>' +
        '</tr>' +
        '<tr id="' + detailId + '" style="display:none;"><td colspan="9" style="background:var(--bg-subtle);padding:1rem 1.25rem;">' +
          '<div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(220px,1fr);gap:1rem;">' +
            '<div><strong>Ingredientes</strong><ul style="list-style:none;margin-top:.5rem;padding:0;">' + (ingredients || '<li>Sin ingredientes.</li>') + '</ul></div>' +
            '<div><strong>Información</strong><div style="margin-top:.5rem;font-size:.82rem;color:var(--text-muted);">Rendimiento: <strong>' + (r.rendimiento || 1) + '</strong><br>Última actualización: ' + ((r.historial && r.historial.length) ? r.historial[r.historial.length-1].fecha : '—') + '</div></div>' +
          '</div>' +
          (r.procedimiento ? '<div style="margin-top:1rem;"><strong>Preparación</strong><p style="white-space:pre-wrap;margin-top:.4rem;line-height:1.5;">' + r.procedimiento + '</p></div>' : '') +
          (r.notas ? '<div style="margin-top:1rem;"><strong>Notas / estándar</strong><p style="white-space:pre-wrap;margin-top:.4rem;line-height:1.5;">' + r.notas + '</p></div>' : '') +
        '</td></tr>';
      });
    }


    function toggleRecipeDetails(id) {
      const row = document.getElementById(id);
      if (!row) return;
      row.style.display = row.style.display === 'none' ? 'table-row' : 'none';
    }

    function exportSingleRecipeExcel(id) {
      const rec = appState.recetas.find(function(r) { return r.id === id; });
      if (!rec) return;

      const cost = calculateRecipeCost(rec);
      const margin = rec.precio - cost;
      const foodCostPct = rec.precio > 0 ? (cost / rec.precio) * 100 : 0;

      let csv = "\uFEFF";
      csv += "FICHA TECNICA: " + rec.nombre.toUpperCase() + "\n";
      csv += "Categoria;" + rec.categoria + "\n";
      csv += "Precio de Venta ($);" + rec.precio.toFixed(2) + "\n";
      csv += "Costo Receta ($);" + cost.toFixed(2) + "\n";
      csv += "Margen Bruto ($);" + margin.toFixed(2) + "\n";
      csv += "Food Cost (%);" + foodCostPct.toFixed(2) + "%\n\n";

      csv += "DESGLOSE DE INGREDIENTES\n";
      csv += "Ingrediente;Categoria;Cantidad;Unidad Base;Merma (%);Costo Unitario ($);Costo Insumo ($);% del Costo\n";

      (rec.ingredientes || []).forEach(function(ing) {
        const ins = appState.insumos.find(function(i) { return i.id === ing.insumoId; });
        const unitCost = ins ? getInsumoUnitCost(ins) : 0;
        const totalIngCost = unitCost * ing.cantidad;
        const pct = cost > 0 ? (totalIngCost / cost) * 100 : 0;

        csv += '"' + (ins ? ins.nombre : 'Eliminado') + '";"' + (ins ? ins.categoria : '') + '";' + ing.cantidad + ';"' + (ins ? ins.unidadBase : '') + '";' + (ins ? ins.merma : 0) + '%;' + unitCost.toFixed(4) + ';' + totalIngCost.toFixed(2) + ';' + pct.toFixed(1) + '%\n';
      });

      csv += "\nTOTAL FOOD COST;;;;;;" + cost.toFixed(2) + ";100.0%\n";
      downloadFile(csv, "Escandallo_" + rec.nombre.replace(/\s+/g, '_') + ".csv", "text/csv;charset=utf-8;");
    }


    function exportInsumosCsv() {
      let csv = "\uFEFF";
      csv += "ID;Nombre;Categoria;Proveedor;Contacto;UnidadCompra;UnidadBase;CostoModo;CostoPorUnidadUso;AprovechamientoPct;PrecioCompra;ContenidoPresentacion\n";
      appState.insumos.forEach(function(i) {
        csv += '"' + i.id + '";"' + i.nombre + '";"' + (i.categoria || '') + '";"' + (i.proveedor || '') + '";"' + (i.contacto || '') + '";"' + i.unidadCompra + '";' + i.costoCompra + ';' + i.merma + ';"' + i.unidadBase + '";' + (i.stockActual || 0) + ';' + (i.stockMin || 0) + '\n';
      });
      downloadFile(csv, "Insumos_Inventario_" + new Date().toISOString().split('T')[0] + ".csv", "text/csv;charset=utf-8;");
    }


    function exportRecipesCsv() {
      let csv = "\uFEFF";
      csv += "ID;Producto;Categoria;PrecioVenta;VentasMes;CostoTotal;MargenBruto;FoodCostPct\n";
      appState.recetas.forEach(function(r) {
        const cost = calculateRecipeCost(r);
        const margin = r.precio - cost;
        const foodCostPct = r.precio > 0 ? (cost / r.precio) * 100 : 0;
        csv += '"' + r.id + '";"' + r.nombre + '";"' + r.categoria + '";' + r.precio.toFixed(2) + ';' + r.ventas + ';' + cost.toFixed(2) + ';' + margin.toFixed(2) + ';' + foodCostPct.toFixed(1) + '%\n';
      });
      downloadFile(csv, "Catalogo_Recetas_" + new Date().toISOString().split('T')[0] + ".csv", "text/csv;charset=utf-8;");
    }


    function exportMasterExcel() {
      let csv = "\uFEFF";
      csv += "LIBRO MAESTRO DE CAFETERIA: RECETAS E INSUMOS\n";
      csv += "Fecha de emision;" + new Date().toLocaleDateString('es-MX') + "\n\n";

      csv += "SECCION 1: CATALOGO DE RECETAS & ESCANDALLOS\n";
      csv += "ID;Producto;Categoria;Precio Venta ($);Costo Receta ($);Margen Bruto ($);Food Cost (%);Ventas Mensuales (Uds);Ganancia Mensual ($)\n";
      appState.recetas.forEach(function(r) {
        const cost = calculateRecipeCost(r);
        const margin = r.precio - cost;
        const foodCostPct = r.precio > 0 ? (cost / r.precio) * 100 : 0;
        const profit = margin * r.ventas;
        csv += '"' + r.id + '";"' + r.nombre + '";"' + r.categoria + '";' + r.precio.toFixed(2) + ';' + cost.toFixed(2) + ';' + margin.toFixed(2) + ';' + foodCostPct.toFixed(1) + '%;' + r.ventas + ';' + profit.toFixed(2) + '\n';
      });

      csv += "\n\nSECCION 2: INSUMOS & PROVEEDORES\n";
      csv += "ID;Insumo;Categoria;Proveedor;Contacto;Presentacion;Costo Compra ($);Merma (%);Costo Neto Unidad Base ($)\n";
      appState.insumos.forEach(function(i) {
        const uCost = getInsumoUnitCost(i);
        csv += '"' + i.id + '";"' + i.nombre + '";"' + (i.categoria || '') + '";"' + (i.proveedor || '') + '";"' + (i.contacto || '') + '";"1 ' + i.unidadCompra + '";' + Number(i.costoCompra).toFixed(2) + ';' + i.merma + '%;' + uCost.toFixed(4) + '\n';
      });


      downloadFile(csv, "Libro_Maestro_Cafeteria_" + new Date().toISOString().split('T')[0] + ".csv", "text/csv;charset=utf-8;");
    }
