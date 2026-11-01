// Contenedor de Inyección de Dependencias
// Instancia y conecta todas las dependencias del sistema

import ProductRepository from './repositories/product.repository.js';
import InventoryMovementRepository from './repositories/inventory-movement.repository.js';
import UserRepository from './repositories/user.repository.js';
import CategoryRepository from './repositories/category.repository.js';
import ReportRepository from './repositories/report.repository.js';

import ProductService from './services/product.service.js';
import InventoryMovementService from './services/inventory-movement.service.js';
import UserService from './services/user.service.js';
import CategoryService from './services/category.service.js';
import ReportService from './services/report.service.js';
import CashRegisterRepository from './repositories/cash-register.repository.js';
import CashRegisterService from './services/cash-register.service.js';
import SupplierRepository from './repositories/supplier.repository.js';
import SupplierService from './services/supplier.service.js';
import RoomRepository from './repositories/room.repository.js';
import RoomService from './services/room.service.js';
import StoreRepository from './repositories/store.repository.js';
import StoreService from './services/store.service.js';
import StayRepository from './repositories/stay.repository.js';
import StayService from './services/stay.service.js';
import ExpenseRepository from './repositories/expense.repository.js';
import ExpenseService from './services/expense.service.js';
import BarcodeLookupService from './services/barcode-lookup.service.js';

// Instancias de repositorios
const productRepo = new ProductRepository();
const inventoryMovementRepo = new InventoryMovementRepository();
const userRepo = new UserRepository();
const categoryRepo = new CategoryRepository();
const reportRepo = new ReportRepository();
const cashRegisterRepo = new CashRegisterRepository();
const supplierRepo = new SupplierRepository();
const roomRepo = new RoomRepository();
const storeRepo = new StoreRepository();
const stayRepo = new StayRepository();
const expenseRepo = new ExpenseRepository();

// Instancias de servicios con sus dependencias inyectadas
export const productService = new ProductService(productRepo);
export const barcodeLookupService = new BarcodeLookupService(productRepo);
export const inventoryMovementService = new InventoryMovementService(
  inventoryMovementRepo,
  productRepo,
  cashRegisterRepo,
  supplierRepo
);
export const userService = new UserService(userRepo);
export const categoryService = new CategoryService(categoryRepo);
export const reportService = new ReportService(reportRepo);
export const cashRegisterService = new CashRegisterService(cashRegisterRepo);
export const supplierService = new SupplierService(supplierRepo);
export const roomService = new RoomService(roomRepo);
export const storeService = new StoreService(storeRepo);
export const stayService = new StayService(stayRepo, cashRegisterRepo, storeRepo);
export const expenseService = new ExpenseService(expenseRepo, cashRegisterRepo);
