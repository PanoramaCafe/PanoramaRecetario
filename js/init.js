/* Panorama Recetario — inicialización y código de enlace */


    var appState = loadAppState();
    appState.insumos = (appState.insumos || []).map(function(ins){
      if (ins.aprovechamiento === undefined) ins.aprovechamiento = Math.max(0, 100 - (Number(ins.merma)||0));
      const compra = String(ins.unidadCompra || '').toLowerCase();
      const rawUnit = String(ins.unidadBase || '').toLowerCase();
      // Normaliza registros antiguos/importados que guardaron L o kg como unidad de uso.
      // El Recetario trabaja siempre en ml, g o pza para que 150 ml se cobre como 150 ml.
      if (!ins.__recetarioUnidadNormalizada && compra === 'l' && ['l','lt','litro','litros'].includes(rawUnit)) {
        if (isFinite(Number(ins.costoPorUnidadUso))) ins.costoPorUnidadUso = Number(ins.costoPorUnidadUso) / 1000;
        ins.unidadBase = 'ml';
        ins.__recetarioUnidadNormalizada = true;
      } else if (!ins.__recetarioUnidadNormalizada && compra === 'kg' && ['kg','kilogramo','kilogramos'].includes(rawUnit)) {
        if (isFinite(Number(ins.costoPorUnidadUso))) ins.costoPorUnidadUso = Number(ins.costoPorUnidadUso) / 1000;
        ins.unidadBase = 'g';
        ins.__recetarioUnidadNormalizada = true;
      } else {
        ins.unidadBase = getInsumoUnidadBase(ins);
      }
      return ins;
    });
    // Persistir la normalización para que no vuelva a aparecer el precio por litro/kilo.
    try { safeStorage.setItem('recetario_pro_data_v5', JSON.stringify(appState)); } catch(e) {}
    let currentRecipeIngredients = [];
    let editingRecipeId = null;




    // --- MÓDULO 1: INSUMOS & PROVEEDORES ---












    // --- MÓDULO 1B: RECETAS / FICHAS TÉCNICAS ---













    // --- MÓDULO 4: EXPORTACIÓN & IMPORTACIÓN ---






    // Convierte el costo de Panorama Inventario a costo por unidad de uso base (ml, g o pza).
    // Panorama Inventario puede reportar `product.cost` en distintas unidades (L, kg, oz, onza, ml, g, pieza)
    // según cómo se dio de alta el producto. Aquí SIEMPRE se normaliza al costo por 1 ml, 1 g o 1 pza,
    // que es lo que espera el Recetario al multiplicar por la cantidad usada en una receta (ej. 150 ml).







    // --- HISTORIAL MODAL ---



    // --- MATRIZ BCG ---




    // Inicialización general
    window.addEventListener('DOMContentLoaded', function() {
      renderInsumos();
      renderRecipesTable();
      renderInsumoOptions();
      updateSummaryCounts();

      // El botón de añadir usa únicamente su handler inline para evitar doble inserción.
      // Enter en cantidad conserva el acceso rápido sin duplicar el click.
      const qty = document.getElementById('rec-cant-insumo');
      if (qty) qty.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); addIngredientToCurrentRecipe(e); }
      });
    });
  