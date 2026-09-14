/* Panorama Recetario — runtime estable.
   Punto único para mantenimiento, compatibilidad y sincronización. */
(function(){
  const SUPABASE_URL='https://dtmhffgpwxzdncbuoohb.supabase.co';
  const SUPABASE_KEY='sb_publishable_S_wZkfLNvx0mnHBLGHcfgg_Q_SkycdW';
  const TABLE_URL=SUPABASE_URL+'/rest/v1/panorama_recetario_state';
  const ROW_ID='default';
  const LOCAL_KEY='recetario_pro_data_v5';

  function removeDeadCode(html){
    const functionNames=['renderStockAuditTable','calculateAuditRow','resetStockAuditCounts','applyStockAudit','renderPurchaseSelectOptions','autoSuggestLowStockPurchases','addItemToPurchaseList','removePurchaseItem','renderCurrentPurchaseList','savePurchaseOrderAndOpenPdf','renderPurchaseHistory','viewHistoricalPoPdf','deleteHistoricalPo','openPurchaseOrderPdfModal','closePoPdfModal'];
    functionNames.forEach(function(name){
      const re=new RegExp('\\n?\\s*function\\s+'+name+'\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\s*\\}','m');
      html=html.replace(re,'');
    });
    return html;
  }

  function patchCore(html){
    html=html.replace("function addIngredientToCurrentRecipe(event) {","function addIngredientToCurrentRecipe(event) {\n      if (window.__addingIngredientLock) return false;\n      window.__addingIngredientLock = true;\n      setTimeout(function(){ window.__addingIngredientLock = false; }, 250);");
    html=html.replace(/function saveToStorage\(\) \{[\s\S]*?\n\s*\}/m,`function saveToStorage() {
      safeStorage.setItem('recetario_pro_data_v5', JSON.stringify(appState));
      updateSummaryCounts();
      if (typeof window.queueCloudSave === 'function') window.queueCloudSave();
    }`);
    return html;
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

  function syncScript(){return `<script>
(function(){
  const URL='${TABLE_URL}',KEY='${SUPABASE_KEY}',ROW='${ROW_ID}',LOCAL='${LOCAL_KEY}',H={apikey:KEY,Authorization:'Bearer '+KEY};
  let updatedAt=null,timer=null,busy=false,pending=false,hydrating=true;
  function normalize(data){return{insumos:Array.isArray(data&&data.insumos)?data.insumos:[],recetas:Array.isArray(data&&data.recetas)?data.recetas:[]};}
  function status(text,kind){let e=document.getElementById('cloud-sync-status');if(!e){e=document.createElement('button');e.id='cloud-sync-status';e.type='button';e.className='sync-status';e.title='Sincronizar ahora';e.onclick=function(){window.syncRecetarioNow();};document.body.appendChild(e);}e.textContent=text;e.dataset.state=kind||'info';}
  async function get(){const r=await fetch(URL+'?id=eq.'+encodeURIComponent(ROW)+'&select=data,updated_at',{cache:'no-store',headers:H});if(!r.ok)throw new Error('GET '+r.status+' '+await r.text());const rows=await r.json();return rows.length?rows[0]:null;}
  async function put(state){const r=await fetch(URL+'?on_conflict=id',{method:'POST',cache:'no-store',headers:Object.assign({'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},H),body:JSON.stringify({id:ROW,data:normalize(state),updated_at:new Date().toISOString()})});if(!r.ok)throw new Error('POST '+r.status+' '+await r.text());const rows=await r.json().catch(()=>[]);updatedAt=rows[0]&&rows[0].updated_at?rows[0].updated_at:new Date().toISOString();}
  function apply(row){appState=normalize(row&&row.data);updatedAt=row&&row.updated_at?row.updated_at:new Date().toISOString();safeStorage.setItem(LOCAL,JSON.stringify(appState));renderInsumos();renderRecipesTable();renderInsumoOptions();updateSummaryCounts();}
  async function hydrate(){status('☁️ Comprobando datos…','info');try{const row=await get();if(row){apply(row);status('☁️ Sincronizado','ok');}else{await put(appState);status('☁️ Datos guardados','ok');}}catch(e){console.error('Sincronización inicial:',e);status('⚠️ Error de sincronización','error');}finally{hydrating=false;}}
  window.queueCloudSave=function(){if(hydrating)return;pending=true;const online=navigator.onLine!==false;status(online?'☁️ Guardando…':'📴 Pendiente de conexión',online?'info':'error');clearTimeout(timer);timer=setTimeout(async function(){if(busy||!pending||navigator.onLine===false)return;busy=true;try{await put(appState);pending=false;status('☁️ Sincronizado','ok');}catch(e){console.error('Guardado cloud:',e);status('⚠️ No se pudo sincronizar','error');}finally{busy=false;}},450);};
  window.syncRecetarioNow=async function(){clearTimeout(timer);if(busy)return;busy=true;status('☁️ Sincronizando…','info');try{const row=await get();if(row&&row.updated_at&&updatedAt&&new Date(row.updated_at).getTime()>new Date(updatedAt).getTime())apply(row);else await put(appState);pending=false;status('☁️ Sincronizado','ok');}catch(e){console.error('Sincronización manual:',e);status('⚠️ Error de sincronización','error');}finally{busy=false;}};
  async function check(){if(busy||hydrating||pending||navigator.onLine===false)return;try{const row=await get();if(row&&row.updated_at&&updatedAt&&new Date(row.updated_at).getTime()>new Date(updatedAt).getTime()){apply(row);status('☁️ Actualizado','ok');}}catch(e){console.warn('Comprobación cloud:',e);}}
  window.addEventListener('online',function(){pending?window.queueCloudSave():check();});window.addEventListener('focus',check);document.addEventListener('visibilitychange',function(){if(!document.hidden)check();});hydrate();setInterval(check,15000);
})();<\\/script>`;}

  window.__panoramaBuild=function(html){return patchAnalysis(patchCore(removeDeadCode(html)));};
  window.__panoramaSyncScript=syncScript;
})();
