/* Panorama Recetario — compatibilidad y correcciones validadas */
(function(){
  window.duplicateRecipe = window.duplicateRecipe || function(id){
    const original=appState.recetas.find(function(r){return r.id===id;}); if(!original)return;
    const requested=window.prompt('Nombre de la nueva ficha técnica:',String(original.nombre||'')+' — Variante'); if(requested===null)return;
    const newName=requested.trim(); if(!newName){alert('Escribe un nombre para la nueva ficha técnica.');return;}
    const clone=JSON.parse(JSON.stringify(original)); clone.id='rec_'+Date.now()+'_'+Math.random().toString(36).slice(2,7); clone.nombre=newName; clone.ventas=0;
    clone.historial=[{fecha:new Date().toLocaleDateString('es-MX'),costo:calculateRecipeCost(clone),precio:Number(clone.precio)||0,motivo:'Duplicada de '+(original.nombre||'receta original')}];
    appState.recetas.push(clone); saveToStorage(); renderRecipesTable(); editRecipe(clone.id);
  };
  function fixQuantityInput(){var input=document.getElementById('rec-cant-insumo');if(!input)return;input.setAttribute('step','1');input.setAttribute('min','0');}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fixQuantityInput);else fixQuantityInput();
  if(window.MutationObserver&&document.documentElement)new MutationObserver(fixQuantityInput).observe(document.documentElement,{childList:true,subtree:true});
  const style=document.createElement('style');
  style.textContent='#cloud-sync-status{position:fixed!important;right:18px!important;bottom:18px!important;z-index:99999!important;border:1px solid rgba(28,25,23,.12)!important;border-radius:999px!important;padding:10px 14px!important;min-height:42px!important;max-width:calc(100vw - 36px)!important;box-sizing:border-box!important;background:#fff!important;color:#1c1917!important;box-shadow:0 8px 24px rgba(0,0,0,.12)!important;font:700 13px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;cursor:pointer!important}#cloud-sync-status[data-state="error"]{border-color:rgba(185,28,28,.25)!important;color:#991b1b!important}';
  document.head.appendChild(style);

  window.renderAnalysis = window.renderAnalysis || function(){
    const recipes=Array.isArray(appState.recetas)?appState.recetas:[];
    const food=document.getElementById('analysis-foodcost'),margin=document.getElementById('analysis-margin'),profit=document.getElementById('analysis-profit'),table=document.getElementById('analysis-table'),insights=document.getElementById('analysis-insights');
    if(!recipes.length){if(food)food.innerText='0.0%';if(margin)margin.innerText='$0.00';if(profit)profit.innerText='$0.00';if(table)table.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:1.5rem">No hay recetas registradas.</td></tr>';if(insights)insights.innerText='Registra recetas para obtener el análisis.';return;}
    let units=0,foodSum=0,marginSum=0,totalProfit=0;
    const rows=recipes.map(function(r){const c=calculateRecipeCost(r),p=Number(r.precio)||0,v=Number(r.ventas)||0,m=p-c,f=p>0?c/p*100:0,pr=m*v;units+=v;foodSum+=f*v;marginSum+=m*v;totalProfit+=pr;return{r:r,c:c,p:p,v:v,m:m,f:f,pr:pr};});
    const avgFood=units?foodSum/units:rows.reduce((a,x)=>a+x.f,0)/rows.length,avgMargin=units?marginSum/units:rows.reduce((a,x)=>a+x.m,0)/rows.length;
    if(food)food.innerText=avgFood.toFixed(1)+'%';if(margin)margin.innerText='$'+avgMargin.toFixed(2);if(profit)profit.innerText='$'+totalProfit.toLocaleString('es-MX',{minimumFractionDigits:2});
    if(table)table.innerHTML=rows.map(function(x){return '<tr><td><strong>'+x.r.nombre+'</strong></td><td class="font-mono" style="text-align:right">$'+x.c.toFixed(2)+'</td><td class="font-mono" style="text-align:right">$'+x.p.toFixed(2)+'</td><td class="font-mono" style="text-align:right">'+x.f.toFixed(1)+'%</td><td class="font-mono" style="text-align:right">$'+x.m.toFixed(2)+'</td><td class="font-mono" style="text-align:right">'+x.v+'</td><td class="font-mono" style="text-align:right">$'+x.pr.toFixed(2)+'</td></tr>';}).join('');
    if(insights){const best=rows.slice().sort((a,b)=>b.pr-a.pr)[0];insights.innerHTML=best?'Mayor ganancia mensual estimada: <strong>'+best.r.nombre+'</strong> ($'+best.pr.toFixed(2)+').':'Sin datos suficientes.';}
  };
  window.viewRecipePdf = window.viewRecipePdf || function(id){
    const rec=appState.recetas.find(function(r){return r.id===id;}); if(!rec)return;
    const modal=document.getElementById('pdf-modal'),target=document.getElementById('printable-escandallo'); if(!modal||!target)return;
    const cost=calculateRecipeCost(rec),price=Number(rec.precio)||0,food=price>0?cost/price*100:0;
    target.innerHTML='<h1 style="margin-bottom:.5rem;">'+rec.nombre+'</h1><p><strong>Categoría:</strong> '+(rec.categoria||'')+' | <strong>Precio:</strong> $'+price.toFixed(2)+' | <strong>Costo:</strong> $'+cost.toFixed(2)+' | <strong>Food Cost:</strong> '+food.toFixed(1)+'%</p><hr style="margin:1rem 0"><h3>Ingredientes</h3>'+((rec.ingredientes||[]).map(function(x){return '<p>'+x.nombre+' — '+x.cantidad+' '+(x.unidad||'')+'</p>';}).join('')||'<p>Sin ingredientes.</p>')+'<h3 style="margin-top:1rem;">Procedimiento</h3><p style="white-space:pre-wrap;">'+(rec.procedimiento||'')+'</p><h3 style="margin-top:1rem;">Notas</h3><p style="white-space:pre-wrap;">'+(rec.notas||'')+'</p>';
    modal.style.display='flex';
  };
  window.closePdfModal = window.closePdfModal || function(){const modal=document.getElementById('pdf-modal');if(modal)modal.style.display='none';};
  window.printAllRecipes = window.printAllRecipes || function(){window.print();};
})();