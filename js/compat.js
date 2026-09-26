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
  const style=document.createElement('style');style.textContent='#cloud-sync-status{position:fixed!important;right:18px!important;bottom:18px!important;z-index:99999!important;border:1px solid rgba(28,25,23,.12)!important;border-radius:999px!important;padding:10px 14px!important;min-height:42px!important;max-width:calc(100vw - 36px)!important;box-sizing:border-box!important;background:#fff!important;color:#1c1917!important;box-shadow:0 8px 24px rgba(0,0,0,.12)!important;font:700 13px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;cursor:pointer!important}#cloud-sync-status[data-state="error"]{border-color:rgba(185,28,28,.25)!important;color:#991b1b!important}';document.head.appendChild(style);
})();
