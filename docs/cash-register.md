# Integración de caja

Para compras, carga inicial, conteos, anulación, proveedores y responsables, consultar
también `frontend-integration.md`.

El esquema de caja forma parte de `migrations/001_init_schema.sql`, junto al resto
del esquema inicial de desarrollo. En una base vacía se instala con `bun run db:migrate`.

Si `001_init_schema.sql` ya figura como aplicado, el ejecutor no vuelve a aplicarlo
al cambiar el archivo. Para usar este esquema actualizado hay que recrear previamente
la base de desarrollo; eso elimina sus datos. No basta con ejecutar `db:migrate` otra vez.

Todas las rutas requieren `Authorization: Bearer <token>`. La tienda y el responsable
se obtienen del usuario autenticado. Una caja se comparte entre los usuarios de su tienda.

## Flujo del frontend

1. Consultar `GET /api/cash-register/current`. Devuelve `200` con la caja abierta y su
   resumen, o `null` si no hay caja. Recargar la aplicación no abre ni cierra la caja.
2. Abrir mediante `POST /api/cash-register/open` con `{"openingAmount":100}`.
   Devuelve `201` con `{"id":"...","status":"OPEN"}`. Consultar de nuevo la caja actual.
3. Vender usando el POST de ventas existente. Toda venta requiere caja abierta, incluso
   Yape. `cashRegisterId` es opcional; el servidor selecciona la caja abierta si falta.
   Si se envía, debe pertenecer a la tienda y estar abierta. La respuesta sigue siendo `204`.
   No registrar la venta otra vez como un aporte: su importe ya se incluye automáticamente.
4. Para agregar efectivo: `POST /api/cash-register/{id}/movements` con
   `{"type":"CASH_IN","amount":20,"reason":"Dinero para vuelto"}`.
   Para retirar: `{"type":"CASH_OUT","amount":10,"reason":"Depósito en banco"}`.
   Ambas operaciones devuelven `204`. Actualizar el resumen después del éxito.
5. Pausar operaciones y contar el efectivo. Cerrar mediante
   `POST /api/cash-register/{id}/close` con `{"closingAmount":155,"notes":"Faltan 5 soles"}`.
   Si hay diferencia, `notes` es obligatorio y no puede estar vacío. Devuelve `204`.
   Consultar `GET /api/cash-register/{id}` para mostrar el arqueo definitivo.

No intentar leer JSON en respuestas `204`. Ante `409`, mostrar el mensaje y actualizar
la caja consultada; no reintentar automáticamente una operación manual de dinero.
Estas operaciones manuales no admiten una clave de idempotencia: deshabilitar el botón
durante el envío y, si se pierde la respuesta, revisar el historial antes de repetirlo.

## Resumen y consultas

La respuesta de caja incluye `id`, `status`, `openedAt`, `openingAmount`, `openedBy`,
`openedByName`, `notes`, `closedAt`, `closingAmount`, `closedBy`, `closedByName`,
`closingNotes` y `summary`. Los nombres son null si el usuario ya no existe; los IDs
se mantienen y las fechas son ISO 8601 UTC. `storeId` no se envía en las respuestas.

`summary` contiene `cashSales`, `yapeSales`, `totalSales`, `salesCount`, `cashIn`,
`cashOut`, `expectedCash` y `difference`. Los importes son strings decimales; el conteo
de ventas es un número. Mientras está abierta, `difference` es null. `expectedCash` es
opcional: solo se envía a ADMIN; para GUEST se omite por completo tanto en cajas abiertas
como cerradas. Después del cierre, `difference` sigue visible para ambos roles. El resto
del resumen y los campos null de cierre en una caja abierta se conservan.

Ejemplo: apertura 100 + ventas CASH 50 + aporte 20 − retiro 10 = efectivo esperado 160.
Una venta YAPE de 30 eleva las ventas totales a 80, sin cambiar el efectivo esperado.
Si al cerrar se cuentan 155, la diferencia es −5 y requiere explicación.

El cierre guarda los totales definitivos. En cierres anteriores a esta implementación,
`summary` puede ser null: no se inventan arqueos ni responsables históricos.
Las compras afectan inventario/costos, sin descontar efectivo de caja.

| Consulta | Uso |
|---|---|
| `GET /api/cash-register?status=CLOSED` | Historial de cajas cerradas |
| `GET /api/cash-register/current/movements` | Movimientos de la caja abierta |
| `GET /api/cash-register/{id}` | Resumen de la sesión |
| `GET /api/cash-register/{id}/movements` | Aportes/retiros manuales con motivo, fecha y responsable |
| `GET /api/inventory-movement?cashRegisterId={id}&group=sales` | Ventas completadas de la caja |

El historial de cajas usa `?page=1&limit=12`, con `limit` máximo 100, y responde
`{data,meta:{page,limit,total,totalPages}}`. Su orden es por apertura e id descendentes;
conservar el filtro `status` al cambiar de página.
Los movimientos manuales usan `?page=1&limit=20`, con `limit` máximo 100, y responden
`{data,meta:{page,limit,total,totalPages}}`; su orden es por creación e id descendentes.
Cada movimiento incluye `createdByName` (null si el usuario fue eliminado) junto con
`createdBy`. `amount` permanece visible para ambos roles.

`GET /api/cash-register/current/movements` devuelve los movimientos de la caja abierta
con el mismo formato y orden. Su límite predeterminado es 5; acepta `page` y `limit`
para avanzar por offset. Si no hay caja abierta, devuelve `data: []` y metadatos con
total cero.

## Errores y operación

- `404`: la caja no existe o pertenece a otra tienda.
- `409`: caja ya abierta/cerrada, venta sin caja abierta o retiro mayor al efectivo esperado.
- `422`: datos inválidos, página/límite inválidos en los historiales o falta de
  explicación de la diferencia.

Se admiten importes de entrada con máximo dos decimales y hasta 99999999.99.
Apertura y conteo de cierre pueden ser cero; los movimientos manuales deben ser positivos.
Motivos/observaciones tienen un máximo de 500 caracteres.

No hay cierre a medianoche, reapertura, edición de movimientos manuales ni estado CLOSING.
El usuario debe pausar ventas y movimientos mientras cuenta. El bloqueo transaccional
impide que una operación se guarde después del cierre, pero no impide que otra persona
mueva dinero físico durante el conteo.

Los datos antiguos sin caja se conservan.

El SQL inicial actualizado exige caja en cada venta. Esa restricción solo se instala
en una base que reciba este esquema; editar el archivo no cambia bases ya creadas.
Los responsables pueden resolverse con GET `/api/store-user`.
Anular una venta desde el nuevo endpoint de inventario solo se permite con su caja
original abierta y las restricciones documentadas en `frontend-integration.md`.
