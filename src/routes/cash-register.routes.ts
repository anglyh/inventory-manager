import { Router } from 'express';
import CashRegisterController from '../controllers/cash-register.controller.js';
import { validateBody, validateParams, validateQuery } from '../middlewares/zod-validation.middleware.js';
import {
  cashMovementHistorySchema, cashMovementSchema, cashRegisterHistorySchema, cashRegisterIdSchema,
  currentCashMovementHistorySchema,
  closeCashRegisterSchema, openCashRegisterSchema,
} from '../schemas/cash-register.schema.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: CashRegisters
 *   description: Caja compartida por los usuarios de la tienda. Pausar las operaciones mientras se cuenta el efectivo; no hay cierre automático a medianoche.
 * /api/cash-register/current:
 *   get:
 *     tags: [CashRegisters]
 *     summary: Consultar la caja abierta de la tienda
 *     responses:
 *       200:
 *         description: Caja abierta con resumen actualizado, o null si no existe.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NullableCashRegister'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 * /api/cash-register/current/movements:
 *   get:
 *     tags: [CashRegisters]
 *     summary: Movimientos de la caja abierta
 *     description: Lista aportes y retiros de la caja actual, ordenados por fecha e id descendentes. La página predeterminada contiene 5 movimientos.
 *     parameters:
 *       - $ref: '#/components/parameters/CurrentCashMovementPage'
 *       - $ref: '#/components/parameters/CurrentCashMovementLimit'
 *     responses:
 *       200:
 *         description: Página de movimientos, vacía si no hay caja abierta.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CashMovementPage'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/CashMovementQueryValidation'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 * /api/cash-register/open:
 *   post:
 *     tags: [CashRegisters]
 *     summary: Abrir caja con el efectivo inicial
 *     description: Una sola caja abierta por tienda. El servidor registra fecha y responsable autenticado.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OpenCashRegister'
 *     responses:
 *       201:
 *         description: Caja abierta.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CashRegisterOpened'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         $ref: '#/components/responses/CashRegisterAlreadyOpen'
 *       422:
 *         $ref: '#/components/responses/CashRegisterOpeningValidation'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 * /api/cash-register:
 *   get:
 *     tags: [CashRegisters]
 *     summary: Historial de cajas
 *     description: Orden descendente por apertura e id. Usa page (predeterminado 1) y limit (predeterminado 12, máximo 100); conserva el filtro status entre páginas. El summary depende del rol autenticado; expectedCash solo se entrega a ADMIN.
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, CLOSED]
 *       - $ref: '#/components/parameters/CashRegisterPage'
 *       - $ref: '#/components/parameters/CashRegisterLimit'
 *     responses:
 *       200:
 *         description: Página de cajas de la tienda.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CashRegisterPage'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       422:
 *         $ref: '#/components/responses/CashRegisterQueryValidation'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 * /api/cash-register/{id}:
 *   get:
 *     tags: [CashRegisters]
 *     summary: Consultar una caja y su arqueo
 *     description: El resumen de una caja abierta se calcula en el momento. El de una caja cerrada es el guardado al cerrar. Los cierres antiguos sin arqueo guardado tienen summary null. El summary depende del rol autenticado; expectedCash solo se entrega a ADMIN.
 *     parameters:
 *       - $ref: '#/components/parameters/CashRegisterId'
 *     responses:
 *       200:
 *         description: Datos y resumen de la caja.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CashRegister'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/CashRegisterNotFound'
 *       422:
 *         $ref: '#/components/responses/CashRegisterIdValidation'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 * /api/cash-register/{id}/movements:
 *   get:
 *     tags: [CashRegisters]
 *     summary: Consultar aportes y retiros manuales
 *     description: No incluye ventas. Orden descendente por fecha e id. Usa page (predeterminado 1) y limit (predeterminado 20, máximo 100).
 *     parameters:
 *       - $ref: '#/components/parameters/CashRegisterId'
 *       - $ref: '#/components/parameters/CashMovementPage'
 *       - $ref: '#/components/parameters/CashMovementLimit'
 *     responses:
 *       200:
 *         description: Página de movimientos manuales de efectivo.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CashMovementPage'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/CashRegisterNotFound'
 *       422:
 *         $ref: '#/components/responses/CashMovementQueryValidation'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 *   post:
 *     tags: [CashRegisters]
 *     summary: Registrar un aporte o retiro de efectivo
 *     description: Requiere caja abierta. El motivo es obligatorio y un retiro no puede superar el efectivo esperado. No registrar aquí el efecto de una venta.
 *     parameters:
 *       - $ref: '#/components/parameters/CashRegisterId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCashMovement'
 *     responses:
 *       204:
 *         description: Movimiento registrado, sin cuerpo de respuesta.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/CashRegisterNotFound'
 *       409:
 *         $ref: '#/components/responses/CashMovementConflict'
 *       422:
 *         $ref: '#/components/responses/CashMovementValidation'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 * /api/cash-register/{id}/close:
 *   post:
 *     tags: [CashRegisters]
 *     summary: Cerrar caja con el efectivo contado
 *     description: Pausar ventas y movimientos mientras se cuenta. Si hay diferencia, notes debe explicar el motivo. El servidor calcula y conserva el arqueo definitivo; no se permite reabrir.
 *     parameters:
 *       - $ref: '#/components/parameters/CashRegisterId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CloseCashRegister'
 *     responses:
 *       204:
 *         description: Caja cerrada. Consultar GET /api/cash-register/{id} para ver el arqueo.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/CashRegisterNotFound'
 *       409:
 *         $ref: '#/components/responses/CashRegisterClosed'
 *       422:
 *         $ref: '#/components/responses/CashRegisterClosingValidation'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *       503:
 *         $ref: '#/components/responses/DatabaseUnavailable'
 */
router.get('/current', CashRegisterController.current);
router.get('/current/movements', validateQuery(currentCashMovementHistorySchema), CashRegisterController.currentMovements);
router.post('/open', validateBody(openCashRegisterSchema), CashRegisterController.open);
router.get('/', validateQuery(cashRegisterHistorySchema), CashRegisterController.list);
router.get('/:id', validateParams(cashRegisterIdSchema), CashRegisterController.getById);
router.get('/:id/movements', validateParams(cashRegisterIdSchema), validateQuery(cashMovementHistorySchema), CashRegisterController.listMovements);
router.post('/:id/movements', validateParams(cashRegisterIdSchema), validateBody(cashMovementSchema), CashRegisterController.addMovement);
router.post('/:id/close', validateParams(cashRegisterIdSchema), validateBody(closeCashRegisterSchema), CashRegisterController.close);

export default router;
