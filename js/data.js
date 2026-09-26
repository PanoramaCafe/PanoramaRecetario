/* Panorama Recetario — módulo data */


    function downloadInsumosTemplate() {
      let csv = "\uFEFF";
      csv += "Nombre;Categoria;Proveedor;Contacto;UnidadCompra;CostoCompra;MermaPct;StockMin\n";
      csv += "Café de Especialidad (Grano);Café & Granos;Finca San Agustín;951 112 3344;kg;320.00;3.0;3.0\n";
      csv += "Leche Entera;Lácteos & Bebidas;Lácteos de Oaxaca;951 223 4455;l;28.00;5.0;8.0\n";
      csv += "Vaso Desechable 12oz;Desechables & Empaque;Empaques del Sur;951 445 6677;pza;4.50;0.0;100.0\n";
      downloadFile(csv, "Plantilla_Importar_Insumos.csv", "text/csv;charset=utf-8;");
    }

    function normalizeInventoryProductCost(product) {
      const rawUnit = String(product.unit || '').trim().toLowerCase();
      const cost = Number(product.cost);
      const hasCost = Number.isFinite(cost);
      let unidadBase = 'pza', factor = 1, aviso = null;
      if (['kg','kilo','kilogramo','kilogramos'].includes(rawUnit)) { unidadBase = 'g'; factor = 1/1000; }
      else if (['l','lt','litro','litros'].includes(rawUnit)) { unidadBase = 'ml'; factor = 1/1000; }
      else if (['g','gr','gramo','gramos'].includes(rawUnit)) { unidadBase = 'g'; factor = 1; }
      else if (['ml','mililitro','mililitros'].includes(rawUnit)) { unidadBase = 'ml'; factor = 1; }
      else if (['pieza','pza','pz','unidad','pieces','pc'].includes(rawUnit)) { unidadBase = 'pza'; factor = 1; }
      else if (['onza','oz'].includes(rawUnit)) { unidadBase = 'ml'; factor = 1/29.5735; aviso = 'onza_convertida_a_ml'; }
      else if (rawUnit) { unidadBase = rawUnit; factor = 1; aviso = 'unidad_no_reconocida'; }
      return { unidadBase: unidadBase, costoPorUnidadUso: hasCost ? cost * factor : 0, hasCost: hasCost, aviso: aviso, rawUnit: rawUnit };
    }


    function importInventoryBackup() {
      const input = document.getElementById('inventory-import-input');
      const status = document.getElementById('inventory-import-status');
      if (!input || !input.files || input.files.length === 0) {
        alert('Selecciona primero el respaldo JSON de Panorama Inventario.');
        return;
      }
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed || !Array.isArray(parsed.products)) {
            alert('Este archivo no parece ser un respaldo de Panorama Inventario.');
            return;
          }

          const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
          const suppliers = Array.isArray(parsed.suppliers) ? parsed.suppliers : [];
          let created = 0, updated = 0;
          const avisosUnidad = []; // productos con unidad de onza (convertida) o no reconocida, para revisar

          const categoryName = function(id) {
            const c = categories.find(function(x) { return x.id === id; });
            return c && c.name ? c.name : 'Sin Categoría';
          };
          const supplierData = function(id) {
            const s = suppliers.find(function(x) { return x.id === id; });
            return s || null;
          };
          const normalize = function(v) {
            return String(v || '').trim().toLowerCase();
          };

          parsed.products.forEach(function(product) {
            const name = String(product.name || '').trim();
            if (!name) return;

            const cat = categoryName(product.categoryId);
            const sup = supplierData(product.supplierId);
            const purchasePrice = Number(product.purchasePrice);
            const hasPurchasePrice = Number.isFinite(purchasePrice);

            // El costo de Panorama Inventario puede venir en L, kg, oz, onza, ml, g o pieza
            // según cómo se dio de alta el producto (campo `unit`). Se normaliza SIEMPRE
            // al costo por 1 ml / 1 g / 1 pza, que es lo que usa el Recetario al multiplicar
            // por la cantidad de una receta (ej. 150 ml). Antes se copiaba tal cual y
            // provocaba que 150 ml de un insumo con costo por litro cobrara ~150 litros.
            const norm = normalizeInventoryProductCost(product);
            if (norm.aviso) avisosUnidad.push(name + ' (' + norm.rawUnit + ')');

            const incoming = {
              categoria: cat,
              proveedor: sup && sup.name ? sup.name : 'Proveedor General',
              contacto: sup && sup.contact ? sup.contact : '',
              unidadCompra: product.purchaseUnit || 'pza',
              costoCompra: hasPurchasePrice ? purchasePrice : (norm.hasCost ? Number(product.cost) : 0),
              costoPorUnidadUso: norm.costoPorUnidadUso,
              costoModo: norm.hasCost ? 'inventario' : 'conversion',
              aprovechamiento: 100,
              merma: 0,
              unidadBase: norm.unidadBase,
              factor: 1,
              stockActual: Number(product.stock) || 0,
              stockMin: product.minStock === '' || product.minStock == null ? 0 : (Number(product.minStock) || 0),
              unidadUso: norm.unidadBase,
              precioCompraPresentacion: hasPurchasePrice ? purchasePrice : null,
              origenInventario: true,
              inventarioProductId: product.id || ''
            };

            const existing = appState.insumos.find(function(i) {
              return normalize(i.nombre) === normalize(name);
            });

            if (existing) {
              existing.categoria = incoming.categoria;
              existing.proveedor = incoming.proveedor;
              existing.contacto = incoming.contacto;
              existing.unidadCompra = incoming.unidadCompra;
              existing.costoCompra = incoming.costoCompra;
              existing.costoPorUnidadUso = incoming.costoPorUnidadUso;
              existing.costoModo = incoming.costoModo;
              existing.aprovechamiento = incoming.aprovechamiento;
              existing.merma = incoming.merma;
              existing.unidadBase = incoming.unidadBase;
              existing.factor = incoming.factor;
              existing.stockActual = incoming.stockActual;
              existing.stockMin = incoming.stockMin;
              existing.unidadUso = incoming.unidadUso;
              existing.precioCompraPresentacion = incoming.precioCompraPresentacion;
              existing.origenInventario = true;
              existing.inventarioProductId = incoming.inventarioProductId;
              updated++;
            } else {
              appState.insumos.push(Object.assign({ id: 'ins_' + Date.now() + '_' + Math.random().toString(36).slice(2,7), nombre: name }, incoming));
              created++;
            }
          });

          saveToStorage();
          renderInsumos();
          renderRecipesTable();
          updateSummaryCounts();
          const avisoTxt = avisosUnidad.length ? ('\n\n⚠️ Revisa estos ' + avisosUnidad.length + ' insumos (unidad en onzas convertida a ml, o unidad no reconocida):\n' + avisosUnidad.slice(0,15).join('\n') + (avisosUnidad.length>15 ? '\n…' : '') + '\n\nEdítalos manualmente en "Registrar/Modificar Insumo" si la conversión automática (1 oz = 29.57 ml) no aplica para ese producto.') : '';
          if (status) status.innerText = '✓ ' + created + ' nuevos · ' + updated + ' actualizados. Costo por ml/g/pza normalizado según la unidad de Panorama Inventario.' + (avisosUnidad.length ? (' ⚠️ ' + avisosUnidad.length + ' requieren revisión.') : '');
          alert('Inventario importado correctamente.\n\nNuevos: ' + created + '\nActualizados: ' + updated + '\n\nTus recetas existentes no fueron reemplazadas.' + avisoTxt);
          input.value = '';
        } catch (err) {
          console.error(err);
          alert('No se pudo leer el respaldo de inventario: ' + err.message);
        }
      };
      reader.readAsText(file);
    }


    function processImportFile() {
      const fileInput = document.getElementById('file-import-input');
      if (!fileInput.files || fileInput.files.length === 0) {
        alert('Por favor selecciona un archivo (.csv o .json) para importar.');
        return;
      }

      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = function(e) {
        const text = e.target.result;

        if (file.name.toLowerCase().endsWith('.json')) {
          try {
            const parsed = JSON.parse(text);
            // Backup propio del Recetario: reemplaza solo si tiene la estructura exacta.
            if (parsed.insumos && parsed.recetas) {
              appState = {
                insumos: Array.isArray(parsed.insumos) ? parsed.insumos : [],
                recetas: Array.isArray(parsed.recetas) ? parsed.recetas : [],
                    };
              saveToStorage();
              renderInsumos();
              renderRecipesTable();
              alert('¡Backup del Recetario restaurado! Se cargaron ' + appState.insumos.length + ' insumos y ' + appState.recetas.length + ' recetas.');
              return;
            }
            // Si es un backup de Panorama Inventario, lo enviamos al importador puente.
            if (Array.isArray(parsed.products)) {
              importInventoryObject(parsed);
              return;
            }
          } catch(err) {
            alert('Error al leer el archivo JSON: formato inválido.');
            return;
          }
        }

        try {
          const lines = text.split(/\r\n|\n/).filter(function(l) { return l.trim().length > 0; });
          if (lines.length <= 1) {
            alert('El archivo CSV está vacío.');
            return;
          }

          let addedCount = 0;
          const separator = lines[0].includes(';') ? ';' : ',';

          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(separator).map(function(c) { return c.replace(/^"|"$/g, '').trim(); });
            if (cols.length >= 6) {
              const nombre = cols[0];
              const categoria = cols[1] || 'Abarrotes & Especias';
              const proveedor = cols[2] || 'General';
              const contacto = cols[3] || '';
              const unidadCompra = cols[4] || 'pza';
              const costo = parseFloat(cols[5]) || 0;
              const merma = cols[6] ? parseFloat(cols[6]) : 0;
              const stockMin = cols[7] ? parseFloat(cols[7]) : 2;

              if (nombre && !isNaN(costo)) {
                const factor = (unidadCompra === 'kg' || unidadCompra === 'l') ? 1000 : 1;
                const unidadBase = (unidadCompra === 'kg') ? 'g' : (unidadCompra === 'l') ? 'ml' : 'pza';

                appState.insumos.push({
                  id: 'ins_' + Date.now() + '_' + i,
                  nombre: nombre,
                  categoria: categoria,
                  proveedor: proveedor,
                  contacto: contacto,
                  unidadCompra: unidadCompra,
                  costoCompra: costo,
                  merma: merma,
                  unidadBase: unidadBase,
                  factor: factor,
                  stockActual: 0,
                  stockMin: stockMin
                });
                addedCount++;
              }
            }
          }

          saveToStorage();
          renderInsumos();
          renderRecipesTable();
          alert('¡Importación completada! Se agregaron ' + addedCount + ' nuevos insumos al inventario.');
          fileInput.value = '';
        } catch(err) {
          alert('Error al procesar el archivo CSV: ' + err.message);
        }
      };

      reader.readAsText(file);
    }


    function importInventoryObject(parsed) {
      const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
      const suppliers = Array.isArray(parsed.suppliers) ? parsed.suppliers : [];
      const catNameById = function(id) { const c=categories.find(function(x){return x.id===id;}); return c&&c.name?c.name:'Sin Categoría'; };
      const supById = function(id) { return suppliers.find(function(x){return x.id===id;}) || null; };
      const norm = function(v){ return String(v||'').trim().toLowerCase(); };
      let created=0, updated=0;
      const avisosUnidad=[];
      parsed.products.forEach(function(p){
        const name=String(p.name||'').trim(); if(!name) return;
        const s=supById(p.supplierId);
        const existing=appState.insumos.find(function(i){return norm(i.nombre)===norm(name);});
        const nrm = normalizeInventoryProductCost(p);
        if (nrm.aviso) avisosUnidad.push(name + ' (' + nrm.rawUnit + ')');
        const purchasePrice = Number(p.purchasePrice);
        const hasPurchasePrice = Number.isFinite(purchasePrice);
        const incoming={
          categoria:catNameById(p.categoryId), proveedor:s&&s.name?s.name:'Proveedor General', contacto:s&&s.contact?s.contact:'',
          unidadCompra:p.purchaseUnit||'pza', costoCompra: hasPurchasePrice ? purchasePrice : (nrm.hasCost?Number(p.cost):0),
          costoPorUnidadUso: nrm.costoPorUnidadUso, costoModo: nrm.hasCost?'inventario':'conversion', merma:0, unidadBase:nrm.unidadBase, factor:1,
          stockActual:Number(p.stock)||0, stockMin:p.minStock===''||p.minStock==null?0:(Number(p.minStock)||0),
          unidadUso:nrm.unidadBase, precioCompraPresentacion: hasPurchasePrice ? purchasePrice : null,
          origenInventario:true, inventarioProductId:p.id||''
        };
        if(existing){ Object.assign(existing,incoming); updated++; }
        else { appState.insumos.push(Object.assign({id:'ins_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),nombre:name},incoming)); created++; }
      });
      saveToStorage(); renderInsumos(); renderRecipesTable(); updateSummaryCounts();
      const avisoTxt = avisosUnidad.length ? ('\n\n⚠️ Revisa estos ' + avisosUnidad.length + ' insumos (unidad en onzas convertida a ml, o no reconocida):\n' + avisosUnidad.slice(0,15).join('\n')) : '';
      alert('Inventario importado correctamente.\n\nNuevos: '+created+'\nActualizados: '+updated+'\n\nTus recetas existentes no fueron reemplazadas.' + avisoTxt);
    }


    function exportBackupJSON() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "backup_recetario_completo.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }


    function downloadFile(content, fileName, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
