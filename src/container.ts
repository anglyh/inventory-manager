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

// Instancias de repositorios
const productRepo = new ProductRepository();
const inventoryMovementRepo = new InventoryMovementRepository();
const userRepo = new UserRepository();
const categoryRepo = new CategoryRepository();
const reportRepo = new ReportRepository();

// Instancias de servicios con sus dependencias inyectadas
export const productService = new ProductService(productRepo);
export const inventoryMovementService = new InventoryMovementService(
  inventoryMovementRepo,
  productRepo
);
export const userService = new UserService(userRepo);
export const categoryService = new CategoryService(categoryRepo);
export const reportService = new ReportService(reportRepo);
