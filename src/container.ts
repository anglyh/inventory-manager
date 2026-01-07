// Contenedor de Inyección de Dependencias
// Instancia y conecta todas las dependencias del sistema

import ProductRepository from './repositories/product.repository.js';
import PurchaseRepository from './repositories/purchase.repository.js';
import SaleRepository from './repositories/sale.repository.js';
import UserRepository from './repositories/user.repository.js';
import CategoryRepository from './repositories/category.repository.js';
import AdjustmentRepository from './repositories/adjustment.repository.js';

import ProductService from './services/product.service.js';
import PurchaseService from './services/purchase.service.js';
import SaleService from './services/sale.service.js';
import UserService from './services/user.service.js';
import CategoryService from './services/category.service.js';

// Instancias de repositorios
const productRepo = new ProductRepository();
const purchaseRepo = new PurchaseRepository();
const saleRepo = new SaleRepository();
const userRepo = new UserRepository();
const categoryRepo = new CategoryRepository();
const adjustmentRepo = new AdjustmentRepository();

// Instancias de servicios con sus dependencias inyectadas
export const productService = new ProductService(productRepo);
export const purchaseService = new PurchaseService(purchaseRepo, productRepo);
export const saleService = new SaleService(saleRepo, productRepo);
export const userService = new UserService(userRepo);
export const categoryService = new CategoryService(categoryRepo);

