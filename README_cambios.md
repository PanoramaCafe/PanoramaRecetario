# Cambios aplicados — Panorama Recetario

## Bug corregido: costo por ml/g contaba el precio completo del litro/kilo

**Causa real (confirmada con tu inventario):** Panorama Inventario guarda el costo de
algunos productos por **litro** o por **kilo** (ej. "Leche Members" = $24.92 por L,
"queso" = $100 por kg), no por ml/g. El Recetario copiaba ese número tal cual como
"costo por unidad de uso", así que al usar 150 ml en una receta cobraba
150 × $24.92 = $3,737 en vez de $3.74.

**Insumos de tu inventario afectados por este bug (ya corregidos al reimportar):**
Leche Members, col, queso, Café de olla, perla explosiva mango, perla explosiva
manzana, Bufalo Clasica, Jugo de Naranja, harina 3 estrellas, Harina Hot Cake
Members, lechera, mapple members, Mermelada Members, Queso Crema, tajin.

**Insumos en onzas (43 productos, ej. Catsup, tequilas, jugos, refrescos):**
antes no se convertían. Ahora se convierten automáticamente (1 oz = 29.57 ml).
Si alguno de esos productos en realidad se mide por peso (onza de sólido) y no
por volumen, edítalo manualmente en "Registrar/Modificar Insumo".

**"metro" (1 producto):** unidad no reconocida por el Recetario; se importa sin
convertir y aparece en el aviso al importar para que lo revises a mano.

## Qué hacer ahora
1. Sube este `index.html` a tu repositorio de GitHub (reemplaza el actual).
2. Vuelve a importar tu respaldo de Panorama Inventario (Import/Export → Importar
   inventario) para que los costos existentes se recalculen con la corrección.
3. Revisa la alerta que aparece al importar: lista los insumos en onzas u otras
   unidades no reconocidas para que confirmes que la conversión tiene sentido.

## También corregido
- La etiqueta del campo "Contenido de la presentación" en el alta manual de
  insumos ahora aclara que debe ir en Litros/Kilos (ej. "1"), no en ml/g
  ("1000"), que era la fuente de confusión original.
