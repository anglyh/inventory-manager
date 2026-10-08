# Contrato de integración: tienda de abarrotes

Esta guía complementa `cash-register.md`. La API se monta bajo `/api`.
Revisar Swagger junto con los schemas antes de construir formularios.

## Estado del esquema

Los cambios están en `migrations/001_init_schema.sql`, por tratarse del esquema inicial
de desarrollo. Cambiar ese archivo no actualiza una base que ya lo aplicó.
No se ha reseteado ni migrado la base del usuario. La versión actual se verificó en
un PostgreSQL 16 temporal y aislado, eliminado después de la comprobación.

Los modelos de entidad representan filas; los tipos de listado y caja representan
las proyecciones SQL de la API. Por ejemplo, `status` de caja se deriva de `closed_at`,
y `summary` representa el resumen calculado o el `closing_summary` guardado.
Los importes de respuesta son strings decimales. Las fechas del cursor se devuelven
como strings ISO UTC con seis decimales y deben reenviarse sin convertirlas a Date.

## Autenticación y responsabilidades

Enviar `Authorization: Bearer <token>`. El servidor determina la tienda y el usuario;
no aceptar ni enviar responsables o tienda desde los formularios de operaciones.
Todos los usuarios de una tienda pueden operar inventario y caja.

- `POST /auth/register` crea una cuenta administradora y una tienda nueva.
- `GET /store-user` lista `{id,name,email,role}` de la tienda. Sirve también para
  resolver los responsables de apertura/cierre, aportes y retiros.
- `POST /store-user` permite a ADMIN crear un trabajador en la misma tienda con
  `{name,email,password}`. Devuelve 201 con el usuario, sin contraseña ni token.
  Su rol es GUEST; ese nombre interno no impide usar ventas, compras o caja.
- La contraseña nueva exige al menos 12 caracteres y una mayúscula.

## Catálogo y proveedores

| Endpoint | Contrato |
|---|---|
| GET `/product` | Paginación por página, búsqueda y categoría existentes. Solo activos; el total cuenta los mismos filtros. |
| GET `/product/options` | Opciones con id, nombre, precio, código, stock y nombre de categoría. |
| GET `/product/{id}` | Producto de la tienda con stock; incluye productos desactivados. |
| POST `/product` | Crear producto sin stock. Devuelve 201 con el producto. |
| PUT `/product/{id}` | Requiere name y salePrice. Omitir barcode/categoryId/minStock conserva su valor; null borra barcode/categoryId. |
| DELETE `/product/{id}` | Desactiva el producto; devuelve 204. No elimina su historial. |
| GET `/supplier` | Array de proveedores `{id,storeId,name,createdAt}` de la tienda. |
| POST `/supplier` | `{name}`; devuelve 201 con el proveedor. Nombre de 1 a 50 caracteres. |
| PUT `/supplier/{id}` | `{name}`; devuelve 200 con el proveedor. |
| DELETE `/supplier/{id}` | 204 si no tiene compras; 409 si está referenciado, incluso por compras anuladas. |

Las categorías y proveedores referenciados deben pertenecer a la tienda. Un producto
ajeno, categoría ajena o proveedor ajeno no se puede utilizar y se responde 404.
Los códigos de barras vacíos se guardan como null. Los nombres de proveedores no se
pueden repetir dentro de la tienda, sin distinguir mayúsculas.

## Registro de inventario

Todos los POST siguientes devuelven **204 sin cuerpo**. No usar su respuesta como
un objeto de venta. Actualizar productos, historial, reportes y caja según corresponda.
Las cantidades son enteras positivas salvo `countedQuantity`, que admite cero.
Los importes son números no negativos con máximo dos decimales y hasta 99999999.99.
Las observaciones admiten hasta 500 caracteres.

### Ventas

POST `/inventory-movement/sales`:

```json
{
  "paymentMethod": "CASH",
  "cashRegisterId": "UUID-de-caja",
  "notes": "",
  "items": [{ "productId": "UUID-producto", "quantity": 2, "salePrice": 5.50 }]
}
```

`paymentMethod` es CASH o YAPE. Ambas modalidades requieren caja abierta.
`cashRegisterId` es opcional: omitirlo selecciona la caja abierta de la tienda;
enviarlo comprueba esa sesión concreta. No admite null explícito.
No enviar reason, movementType ni unitPrice en una venta.

### Compras

POST `/inventory-movement/purchases`:

```json
{
  "supplierId": "UUID-proveedor",
  "notes": "Reposición",
  "items": [{ "productId": "UUID-producto", "quantity": 10, "unitCost": 3.20 }]
}
```

El proveedor es opcional; si no se elige, omitir supplierId. Aumenta stock y actualiza
el costo promedio. No requiere caja, no registra método de pago y no descuenta efectivo.

### Carga inicial

POST `/inventory-movement/initial-loads`:

```json
{
  "notes": "Existencias al comenzar",
  "items": [{ "productId": "UUID-producto", "quantity": 20, "unitPrice": 3.00 }]
}
```

En este contrato `unitPrice` es el costo inicial unitario. Solo se permite en productos
sin movimientos previos, incluso anulados; 409 si alguno ya tiene historial.
La carga completa es transaccional: si falla un producto, no se registra ninguno.
No afecta caja. Stock cero no requiere crear un movimiento.

Usar una pantalla de carga por varios productos. Después de crear un producto puede
ofrecerse un acceso a esa pantalla con el producto preseleccionado. Crear producto y
cargar existencias son operaciones independientes: no presentarlas como un único
guardado indivisible ni recrear el producto si solo falla la carga.

### Mermas y ajustes por cantidad

POST `/inventory-movement/losses`:

```json
{
  "reason": "LOSS_DAMAGED",
  "notes": "Envases rotos",
  "items": [{ "productId": "UUID-producto", "quantity": 2, "unitPrice": 3.00 }]
}
```

Motivos admitidos: LOSS_DAMAGED y LOSS_EXPIRED. No existe LOSS_THEFT.
El costo histórico real se toma del costo promedio del producto. El unitPrice del
contrato genérico se usa como valor de referencia; no pedir un precio de venta al usuario.

POST `/inventory-movement/adjustments` usa los mismos items. Solo acepta
MANUAL_CORRECTION y requiere movementType IN/OUT. Las diferencias de conteo
(COUNT_SURPLUS/COUNT_SHORTAGE) se registran únicamente con `/stock-counts`.
Aquí quantity es la cantidad que se agrega o retira, no el stock final.
No afecta caja. Los productos desactivados y las salidas sin stock se rechazan con 409.

### Conteo físico

POST `/inventory-movement/stock-counts`:

```json
{
  "notes": "Conteo de estante",
  "items": [{ "productId": "UUID-producto", "countedQuantity": 8 }]
}
```

El usuario indica lo que contó. El servidor bloquea los productos y compara con su
stock real. Registra hasta dos movimientos —sobrantes y faltantes— en una transacción.
Las notas son obligatorias; no se admiten productos repetidos. Si todo coincide,
responde 409 con un mensaje indicando que no hay ajustes; no crea movimientos vacíos.
Pausar operaciones de esos productos mientras se cuenta: la transacción protege el
guardado, pero no bloquea ventas durante el tiempo que una persona cuenta físicamente.

## Historial y detalle

GET `/inventory-movement` devuelve `{data,nextCursor}`. Límite predeterminado 12,
máximo 100. nextCursor siempre existe: es un objeto o null.

Filtros que se pueden combinar:

- `group=sales|purchase|loss|voids`. Sin grupo: todos los completados. voids: anulados.
- `movementType=IN|OUT`.
- `reason`: motivo exacto, por ejemplo INITIAL_LOAD o COUNT_SURPLUS.
- `productId`: movimientos que contienen ese producto; conserva el detalle completo.
- `cashRegisterId`: movimientos de esa sesión de caja.
- `from` inclusivo y `to` exclusivo: fechas ISO con zona horaria, from anterior a to.
- `cursorDate` y `cursorId`: enviar ambos valores del cursor sin perder precisión.

Al cambiar filtros, vaciar resultados y comenzar sin cursor. No filtrar solo la página
cargada cuando se necesita un filtro del historial completo. Los filtros se combinan
con AND: combinaciones incompatibles pueden devolver una página vacía.

GET `/inventory-movement/{id}` devuelve el detalle de un movimiento completado o
anulado, o 404 si no pertenece a la tienda. Los listados y el detalle incluyen
createdBy, createdByName, supplierName, voidedBy y el unitCost de cada artículo,
además de los campos ya existentes. No se envía `unitCostBefore` al frontend.

## Anulación conservadora

POST `/inventory-movement/{id}/void` recibe `{ "reason": "Registro equivocado" }`.
Devuelve 204. Exige motivo y rechaza:

- Movimiento ya anulado.
- Algún movimiento completado posterior de cualquiera de sus productos.
- Entrada cuya anulación dejaría stock negativo.
- Compra/carga sin el costo anterior guardado, necesario para restaurar costos.
- Venta cuya caja original esté cerrada o no exista.
- Venta CASH si no queda efectivo esperado suficiente para revertir su importe.

La operación revierte el movimiento completo. Las compras/cargas restauran el costo
promedio anterior. Las ventas dejan de sumarse al resumen de la caja. No registrar
además un retiro por esa misma reversión. Es una corrección de registro, no un flujo
de devoluciones parciales ni una autorización para reescribir cierres históricos.
Refrescar productos, historiales, reportes y caja. Ante 409 mostrar el motivo del servidor;
no resolverlo creando automáticamente una operación compensatoria.

## Caja y estado compartido en Angular

Seguir `cash-register.md`. Mantener la caja actual en un servicio compartido con
signals o un recurso compartido, separado del carrito y de los productos.
`providedIn: 'root'` comparte la instancia, pero no guarda respuestas HTTP por sí solo.

- Consultar al entrar en ventas o caja, no necesariamente al abrir cualquier página.
- Compartir resultado, estado de carga y error; evitar solicitudes simultáneas duplicadas.
- Actualizar después de abrir/cerrar, vender/anular venta y aportar/retirar.
- Refrescar al recuperar el foco cuando estas pantallas estén activas.
- Limpiar al cerrar sesión/cambiar usuario y descartar respuestas de la sesión anterior.
- No persistir caja en localStorage. Un error de red no equivale a respuesta null.

## Errores y límites de esta versión

Usar `{success:false,error:{code,message,...}}`; la indisponibilidad de base también
usa ese formato con 503 y code DB_ERROR. Validación usa 422 y error.fields; conflictos
409; recursos inexistentes o ajenos 404. Preservar carrito/formulario si una operación falla.
Los mensajes propios del servidor deben mostrarse con las utilidades de errores existentes.

Las operaciones no tienen claves de idempotencia. Deshabilitar el envío mientras se
procesa y no reintentar automáticamente si se pierde la respuesta: revisar el historial.
Esta versión usa unidades enteras; no incluye productos vendidos por peso, devoluciones
parciales, cuentas por pagar ni gestión avanzada de permisos. No añadir pantallas para
contratos que no existen. Las preferencias visuales y el prompt están en
`frontend-development-prompt.md`.
