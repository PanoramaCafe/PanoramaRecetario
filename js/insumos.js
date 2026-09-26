/* Panorama Recetario — módulo insumos */


    function renderInsumoOptions() {
      const select = document.getElementById('rec-select-insumo');
      if (!select) return;
      const search = (document.getElementById('rec-search-insumo')?.value || '').trim().toLowerCase();
      const current = select.value;
      const list = appState.insumos.slice().sort((a,b) => String(a.nombre||'').localeCompare(String(b.nombre||''),'es',{sensitivity:'base'}))
        .filter(ins => !search || String(ins.nombre||'').toLowerCase().includes(search) || String(ins.categoria||'').toLowerCase().includes(search));
      select.innerHTML = '<option value="">-- Seleccionar ingrediente --</option>' + list.map(ins => '<option value="'+ins.id+'">'+ins.nombre+' — $'+getInsumoUnitCost(ins).toFixed(6)+'/'+getInsumoUnidadBase(ins)+'</option>').join('');
      if (list.some(x => x.id === current)) select.value = current;
      updateSelectedInsumoInfo();
    }


    function updateSelectedInsumoInfo() {
      const id = document.getElementById('rec-select-insumo')?.value;
      const ins = appState.insumos.find(i => i.id === id);
      const info = document.getElementById('rec-selected-insumo-info');
      const cost = document.getElementById('rec-selected-insumo-cost');
      if (!ins) { if(info) info.innerText=''; if(cost) cost.innerText='$0.0000 / unidad'; return; }
      const unit = getInsumoUnidadBase(ins), unitCost = getInsumoUnitCost(ins), appr = getInsumoAprovechamiento(ins);
      if(info) info.innerText = (ins.costoModo === 'directo' ? 'Costo directo' : (ins.costoModo === 'inventario' ? 'Costo tomado de Panorama Inventario' : 'Costo derivado de presentación')) + ' · '+appr.toFixed(1)+'% aprovechamiento · unidad: '+unit;
      if(cost) cost.innerText = '$'+unitCost.toFixed(4)+' / '+unit;
    }


    function renderInsumos() {
      const tbody = document.getElementById('insumos-list-table');
      if (!tbody) return;
      const search = (document.getElementById('ins-search')?.value || '').trim().toLowerCase();
      const cat = document.getElementById('filter-ins-categoria')?.value || 'TODAS';
      const list = appState.insumos.slice().sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es',{sensitivity:'base'})).filter(ins =>
        (cat==='TODAS'||ins.categoria===cat) && (!search || String(ins.nombre||'').toLowerCase().includes(search) || String(ins.proveedor||'').toLowerCase().includes(search))
      );
      tbody.innerHTML = list.length ? list.map(ins => '<tr><td><strong>'+ins.nombre+'</strong></td><td><span class="badge badge-neutral">'+(ins.categoria||'Otros')+'</span></td><td>'+(ins.proveedor||'—')+'</td><td class="font-mono">'+getInsumoUnidadBase(ins)+'</td><td class="font-mono" style="text-align:right;font-weight:700">$'+getInsumoUnitCost(ins).toFixed(4)+'</td><td class="font-mono" style="text-align:center">'+getInsumoAprovechamiento(ins).toFixed(1)+'%</td><td style="text-align:center"><button class="btn btn-secondary btn-sm" onclick="editInsumo(\''+ins.id+'\')">Editar</button> <button class="btn btn-danger btn-sm" onclick="deleteInsumo(\''+ins.id+'\')">🗑️</button></td></tr>').join('') : '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:1.5rem">No hay insumos que coincidan.</td></tr>';
      renderInsumoOptions();
    }


    function toggleDirectCostFields() {
      const direct = document.getElementById('ins-costo-tipo')?.value === 'directo';
      if(document.getElementById('ins-directo-wrap')) document.getElementById('ins-directo-wrap').style.display = direct ? '' : 'none';
      if(document.getElementById('ins-compra-wrap')) document.getElementById('ins-compra-wrap').style.display = direct ? 'none' : '';
      if(document.getElementById('ins-contenido-wrap')) document.getElementById('ins-contenido-wrap').style.display = direct ? 'none' : '';
    }


    function resetInsumoForm() {
      ['ins-edit-id','ins-nombre','ins-proveedor','ins-contacto-prov','ins-costo','ins-contenido','ins-costo-directo'].forEach(id=>{const e=document.getElementById(id); if(e)e.value='';});
      document.getElementById('ins-costo-tipo').value='conversion';
      document.getElementById('ins-aprovechamiento').value='95';
      document.getElementById('ins-save-btn').innerText='Guardar Insumo';
      toggleDirectCostFields();
    }


    function editInsumo(id) {
      const ins = appState.insumos.find(i=>i.id===id); if(!ins)return;
      document.getElementById('ins-edit-id').value=ins.id;
      document.getElementById('ins-nombre').value=ins.nombre||'';
      document.getElementById('ins-categoria').value=ins.categoria||'Otros';
      document.getElementById('ins-proveedor').value=ins.proveedor||'';
      document.getElementById('ins-contacto-prov').value=ins.contacto||'';
      document.getElementById('ins-unidad-compra').value=ins.unidadCompra||'pza';
      document.getElementById('ins-costo-tipo').value=ins.costoModo||'conversion';
      document.getElementById('ins-costo').value=ins.costoCompra ?? '';
      document.getElementById('ins-contenido').value=ins.contenidoPresentacion ?? ((ins.factor&&ins.unidadCompra!=='pza')?ins.factor:1);
      document.getElementById('ins-costo-directo').value=ins.costoDirecto ?? '';
      document.getElementById('ins-aprovechamiento').value=getInsumoAprovechamiento(ins);
      document.getElementById('ins-save-btn').innerText='Actualizar Insumo'; toggleDirectCostFields();
      switchTab('insumos'); window.scrollTo({top:0,behavior:'smooth'});
    }


    function saveInsumo() {
      const id=document.getElementById('ins-edit-id').value;
      const nombre=document.getElementById('ins-nombre').value.trim(), categoria=document.getElementById('ins-categoria').value, proveedor=document.getElementById('ins-proveedor').value.trim(), contacto=document.getElementById('ins-contacto-prov').value.trim(), unidadCompra=document.getElementById('ins-unidad-compra').value, modo=document.getElementById('ins-costo-tipo').value;
      const aprovechamiento=Math.max(0,Math.min(100,parseFloat(document.getElementById('ins-aprovechamiento').value)||0));
      const costoCompra=parseFloat(document.getElementById('ins-costo').value)||0, contenido=parseFloat(document.getElementById('ins-contenido').value)||0, costoDirecto=parseFloat(document.getElementById('ins-costo-directo').value)||0;
      if(!nombre){alert('Escribe el nombre del insumo.');return;}
      if(modo==='directo' && costoDirecto<=0){alert('Ingresa un costo directo por unidad de uso.');return;}
      if(modo==='conversion' && (costoCompra<=0||contenido<=0)){alert('Ingresa precio de compra y contenido de la presentación.');return;}
      const factor = unidadCompra==='kg'||unidadCompra==='l' ? 1000 : 1;
      const unidadBase = unidadCompra==='kg'?'g':unidadCompra==='l'?'ml':'pza';
      const costoPorUnidadUso = modo==='directo' ? costoDirecto : (costoCompra / Math.max(0.0001, contenido * factor)) / Math.max(0.0001,aprovechamiento/100);
      const data={nombre,categoria,proveedor:proveedor||'Proveedor General',contacto,unidadCompra,unidadBase,factor,contenidoPresentacion:contenido,costoCompra, costoModo:modo,costoDirecto:modo==='directo'?costoDirecto:null,costoPorUnidadUso,aprovechamiento,merma:100-aprovechamiento};
      if(id){const ins=appState.insumos.find(i=>i.id===id);if(ins)Object.assign(ins,data);}else{appState.insumos.push(Object.assign({id:'ins_'+Date.now()},data));}
      saveToStorage(); renderInsumos(); resetInsumoForm(); alert(id?'Insumo actualizado correctamente.':'Insumo registrado correctamente.');
    }


    function deleteInsumo(id) { const ins=appState.insumos.find(i=>i.id===id); if(!ins||!confirm('¿Eliminar "'+ins.nombre+'"? Las recetas que lo usen quedarán sin referencia.'))return; appState.insumos=appState.insumos.filter(i=>i.id!==id); saveToStorage(); renderInsumos(); renderRecipesTable(); }
