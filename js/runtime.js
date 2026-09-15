/* Panorama Recetario — runtime estable.
   Capa única para compatibilidad, correcciones puntuales, UI de sincronización y acciones de recetas. */
(function(){
  function removeDeadCode(html){
    return html;
  }

  function patchCore(html){
    if(html.indexOf('window.__addingIngredientLock')===-1){
      html=html.replace(
        "function addIngredientToCurrentRecipe(event) {",
        "function addIngredientToCurrentRecipe(event) {\n      if (window.__addingIngredientLock) return false;\n      window.__addingIngredientLock = true;\n      setTimeout(function(){ window.__addingIngredientLock = false; }, 250);"
      );
    }

    html=html.replace(/function saveToStorage\(\) \{[\s\S]*?\n\s*\}/m,
`function saveToStorage() {
      safeStorage.setItem('recetario_pro_data_v5', JSON.stringify(appState));
      updateSummaryCounts();
      if (typeof window.queueCloudSave === 'function') window.queueCloudSave();
    }`);

    // Duplicar una ficha técnica: conserva la estructura completa, pero crea un registro independiente.
    if(html.indexOf('function duplicateRecipe(id)')===-1){
      const duplicateFn=`
    function duplicateRecipe(id) {
      const original = appState.recetas.find(function(r) { return r.id === id; });
      if (!original) return;
      const suggested = String(original.nombre || '') + ' — Variante';
      const requested = window.prompt('Nombre de la nueva ficha técnica:', suggested);
      if (requested === null) return;
      const newName = requested.trim();
      if (!newName) {
        alert('Escribe un nombre para la nueva ficha técnica.');
        return;
      }
      const clone = JSON.parse(JSON.stringify(original));
      clone.id = 'rec_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
      clone.nombre = newName;
      clone.ventas = 0;
      clone.historial = [{
        fecha: new Date().toLocaleDateString('es-MX'),
        costo: calculateRecipeCost(clone),
        precio: Number(clone.precio) || 0,
        motivo: 'Duplicada de ' + (original.nombre || 'receta original')
      }];
      appState.recetas.push(clone);
      saveToStorage();
      renderRecipesTable();
      editRecipe(clone.id);
    }
`;
      html=html.replace(/\n\s*function saveRecipe\(\) \{/, duplicateFn+'\n    function saveRecipe() {');
    }

    const oldActions="'<button class=\"btn btn-secondary btn-sm\" onclick=\"viewHistory(\\\'' + r.id + '\\\')\">Hist.</button>' +";
    const newActions="'<button class=\"btn btn-secondary btn-sm\" onclick=\"viewHistory(\\\'' + r.id + '\\\')\">Hist.</button>' +\n            '<button class=\"btn btn-gold btn-sm\" onclick=\"duplicateRecipe(\\\'' + r.id + '\\\')\">Duplicar</button>' +";
    if(html.indexOf('onclick=\\\"duplicateRecipe')===-1){
      html=html.replace(oldActions,newActions);
    }
    return html;
  }

  function patchQuantityInput(html){
    // La cantidad de uso se expresa en unidades reales (g, ml o pza).
    // El control debe avanzar de 1 en 1, no de 0.1 en 0.1.
    const script=`
<script id="panorama-quantity-fix">
(function(){
  function fixQuantityInput(){
    var input=document.getElementById('rec-cant-insumo');
    if(!input) return;
    input.setAttribute('step','1');
    input.setAttribute('min','0');
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fixQuantityInput);
  else fixQuantityInput();
  window.fixRecipeQuantityInput=fixQuantityInput;
})();
<\\/script>`;
    return html.replace('</body>',script+'\n</body>');
  }

  function patchSyncUI(html){
    const css=`
<style id="panorama-sync-ui">
#cloud-sync-status{
  position:fixed!important;
  right:18px!important;
  bottom:18px!important;
  z-index:99999!important;
  border:1px solid rgba(28,25,23,.12)!important;
  border-radius:999px!important;
  padding:10px 14px!important;
  min-height:42px!important;
  max-width:calc(100vw - 36px)!important;
  box-sizing:border-box!important;
  background:#fff!important;
  color:#1c1917!important;
  box-shadow:0 8px 24px rgba(0,0,0,.12)!important;
  font:700 13px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;
  cursor:pointer!important;
  -webkit-tap-highlight-color:transparent!important;
}
#cloud-sync-status[data-state="ok"]{border-color:rgba(22,101,52,.18)!important}
#cloud-sync-status[data-state="error"]{border-color:rgba(185,28,28,.25)!important;color:#991b1b!important}
#cloud-sync-status[data-state="info"]{border-color:rgba(180,83,9,.20)!important}
@media(max-width:600px){#cloud-sync-status{right:12px!important;bottom:12px!important;font-size:12px!important;padding:9px 12px!important}}
</style>`;
    return html.replace('</head>',css+'\n</head>');
  }

  function patchAnalysis(html){
    if(/function renderAnalysis\s*\(/.test(html)) return html;
    const fn=`
function renderAnalysis(){
  const recipes=Array.isArray(appState.recetas)?appState.recetas:[];
  const food=document.getElementById('analysis-foodcost'),margin=document.getElementById('analysis-margin'),profit=document.getElementById('analysis-profit'),table=document.getElementById('analysis-table'),insights=document.getElementById('analysis-insights');
  if(!recipes.length){if(food)food.innerText='0.0%';if(margin)margin.innerText='$0.00';if(profit)profit.innerText='$0.00';if(table)table.innerHTML='<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:1.5rem">No hay recetas registradas.</td></tr>';if(insights)insights.innerText='Registra recetas para obtener el análisis.';return;}
  let units=0,foodSum=0,marginSum=0,totalProfit=0;
  const rows=recipes.map(function(r){const c=calculateRecipeCost(r),p=Number(r.precio)||0,v=Number(r.ventas)||0,m=p-c,f=p>0?c/p*100:0,pr=m*v;units+=v;foodSum+=f*v;marginSum+=m*v;totalProfit+=pr;return{r:r,c:c,p:p,v:v,m:m,f:f,pr:pr};});
  const avgFood=units?foodSum/units:rows.reduce((s,x)=>s+x.f,0)/rows.length;
  const avgMargin=units?marginSum/units:rows.reduce((s,x)=>s+x.m,0)/rows.length;
  if(food)food.innerText=avgFood.toFixed(1)+'%';if(margin)margin.innerText='$'+avgMargin.toFixed(2);if(profit)profit.innerText='$'+totalProfit.toLocaleString('es-MX',{minimumFractionDigits:2});
  if(table)table.innerHTML=rows.map(function(x){return '<tr><td><strong>'+x.r.nombre+'</strong></td><td class="font-mono" style="text-align:right">$'+x.c.toFixed(2)+'</td><td class="font-mono" style="text-align:right">$'+x.p.toFixed(2)+'</td><td class="font-mono" style="text-align:right">'+x.f.toFixed(1)+'%</td><td class="font-mono" style="text-align:right">$'+x.m.toFixed(2)+'</td><td class="font-mono" style="text-align:right">'+x.v+'</td><td class="font-mono" style="text-align:right">$'+x.pr.toFixed(2)+'</td></tr>';}).join('');
  if(insights){const best=rows.slice().sort((a,b)=>b.pr-a.pr)[0];insights.innerHTML=best?'Mayor ganancia mensual estimada: <strong>'+best.r.nombre+'</strong> ($'+best.pr.toFixed(2)+').':'Sin datos suficientes.';}
}
`;
    return html.replace('</body>','<script>'+fn+'<\\/script></body>');
  }

  window.__panoramaBuild=function(html){
    return patchQuantityInput(patchSyncUI(patchAnalysis(patchCore(removeDeadCode(html)))));
  };

  window.__panoramaSyncScript=function(){ return ''; };
})();
