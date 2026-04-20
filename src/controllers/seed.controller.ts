import type { NextFunction, Request, Response } from 'express';
import { categoryService, inventoryMovementService, productService, userService } from '../container.js';
import { ConflictError } from '../errors/app.error.js';

export default class SeedController {
  static async runSeed(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Create Default User
      const defaultEmail = 'admin@example.com';
      const defaultPassword = 'password123';
      let adminUserId: string;
      let didCreateUser = false;

      try {
        const adminUser = await userService.register({
          name: 'Admin User',
          email: defaultEmail,
          password: defaultPassword
        });
        adminUserId = adminUser.user.id;
        didCreateUser = true;
        console.log('✅ Default user created:', defaultEmail);
      } catch (error) {
        if (error instanceof ConflictError) {
          const adminUser = await userService.login({
            email: defaultEmail,
            password: defaultPassword,
          });
          adminUserId = adminUser.user.id;
          console.log('⚠️ Default user already exists, continuing seed for:', defaultEmail);
        } else {
          throw error;
        }
      }

      // 2. Create Categories
      const categoriesSeed = [
        { name: 'Bebidas', icon: '🥤' },
        { name: 'Snacks', icon: '🍫' },
        { name: 'Aseo Personal', icon: '🧼' },
        { name: 'Electrónica', icon: '🔌' },
        { name: 'Farmacia', icon: '💊' },
        { name: 'Varios', icon: '🛒' }
      ];

      const existingCategories = await categoryService.listAll(adminUserId);
      const categoriesByName = new Map(existingCategories.map(c => [c.name, c]));

      const createdCategories = [...existingCategories];
      let categoriesCreatedCount = 0;

      for (const catData of categoriesSeed) {
        const existing = categoriesByName.get(catData.name);
        if (existing) continue;

        // Casting as any because the `create` service expects a full `Category` object with ID which we don't have yet
        const category = await categoryService.create(adminUserId, catData as any);
        categoriesByName.set(category.name, category);
        createdCategories.push(category);
        categoriesCreatedCount++;
      }
      console.log(`✅ ${categoriesCreatedCount} categories created (total: ${createdCategories.length}).`);

      // 3. Create Products
      const categoryIdByName = new Map(createdCategories.map(c => [c.name, c.id]));

      const productsSeed = [
        // Bebidas (createdCategories[0])
        { name: 'Agua Mineral 500ml', salePrice: 2.5, minStock: 10, barcode: '7501030301111', categoryId: categoryIdByName.get('Bebidas') },
        { name: 'Agua Mineral 1L', salePrice: 3.5, minStock: 10, barcode: '7501030302222', categoryId: categoryIdByName.get('Bebidas') },
        { name: 'Coca Cola 600ml', salePrice: 3.5, minStock: 15, barcode: '7501055310883', categoryId: categoryIdByName.get('Bebidas') },
        { name: 'Inka Kola 600ml', salePrice: 3.5, minStock: 15, barcode: '7501055310999', categoryId: categoryIdByName.get('Bebidas') },
        { name: 'Sprite 600ml', salePrice: 3.5, minStock: 10, barcode: '7501055310777', categoryId: categoryIdByName.get('Bebidas') },
        { name: 'Cerveza Pilsen 310ml', salePrice: 5.0, minStock: 20, barcode: '7750100010011', categoryId: categoryIdByName.get('Bebidas') },
        { name: 'Cerveza Cusqueña 310ml', salePrice: 6.0, minStock: 20, barcode: '7750100020022', categoryId: categoryIdByName.get('Bebidas') },
        { name: 'Gatorade Azul 500ml', salePrice: 4.5, minStock: 8, barcode: '7750100030033', categoryId: categoryIdByName.get('Bebidas') },
        { name: 'Jugo del Valle Durazno', salePrice: 3.0, minStock: 10, barcode: '7750100040044', categoryId: categoryIdByName.get('Bebidas') },
        { name: 'Red Bull 250ml', salePrice: 8.0, minStock: 5, barcode: '9002490100070', categoryId: categoryIdByName.get('Bebidas') },
        
        // Snacks
        { name: 'Papas Lays Clásicas', salePrice: 2.0, minStock: 15, barcode: '7501000111200', categoryId: categoryIdByName.get('Snacks') },
        { name: 'Papas Lays Onduladas', salePrice: 2.0, minStock: 15, barcode: '7501000111201', categoryId: categoryIdByName.get('Snacks') },
        { name: 'Doritos Queso', salePrice: 2.5, minStock: 15, barcode: '7501000111300', categoryId: categoryIdByName.get('Snacks') },
        { name: 'Cheetos Queso', salePrice: 2.0, minStock: 10, barcode: '7501000111400', categoryId: categoryIdByName.get('Snacks') },
        { name: 'Galletas Oreo', salePrice: 1.5, minStock: 20, barcode: '7622300732864', categoryId: categoryIdByName.get('Snacks') },
        { name: 'Galletas Ritz', salePrice: 1.5, minStock: 15, barcode: '7622300732865', categoryId: categoryIdByName.get('Snacks') },
        { name: 'Galletas Morochas', salePrice: 1.2, minStock: 15, barcode: '7622300732866', categoryId: categoryIdByName.get('Snacks') },
        { name: 'Chocolate Sublime', salePrice: 2.0, minStock: 20, barcode: '7750030001111', categoryId: categoryIdByName.get('Snacks') },
        { name: 'Gomitas Ambrosoli', salePrice: 1.5, minStock: 10, barcode: '7750030002222', categoryId: categoryIdByName.get('Snacks') },
        { name: 'Maní Karinto', salePrice: 1.8, minStock: 12, barcode: '7750030003333', categoryId: categoryIdByName.get('Snacks') },

        // Aseo Personal
        { name: 'Jabón Dove', salePrice: 4.0, minStock: 10, barcode: '7501002302309', categoryId: categoryIdByName.get('Aseo Personal') },
        { name: 'Jabón Protex', salePrice: 3.5, minStock: 10, barcode: '7501002302310', categoryId: categoryIdByName.get('Aseo Personal') },
        { name: 'Shampoo H&S 400ml', salePrice: 15.0, minStock: 5, barcode: '7500435123456', categoryId: categoryIdByName.get('Aseo Personal') },
        { name: 'Shampoo Pantene Sachet', salePrice: 1.5, minStock: 20, barcode: '7500435123457', categoryId: categoryIdByName.get('Aseo Personal') },
        { name: 'Pasta Dental Colgate 50g', salePrice: 3.0, minStock: 10, barcode: '7500435123458', categoryId: categoryIdByName.get('Aseo Personal') },
        { name: 'Cepillo Dental Oral-B', salePrice: 5.0, minStock: 8, barcode: '7500435123459', categoryId: categoryIdByName.get('Aseo Personal') },
        { name: 'Desodorante Rexona', salePrice: 12.0, minStock: 6, barcode: '7500435123460', categoryId: categoryIdByName.get('Aseo Personal') },
        { name: 'Papel Higiénico Suave', salePrice: 2.0, minStock: 20, barcode: '7500435123461', categoryId: categoryIdByName.get('Aseo Personal') },
        { name: 'Toallas Nosotras', salePrice: 4.5, minStock: 10, barcode: '7500435123462', categoryId: categoryIdByName.get('Aseo Personal') },
        { name: 'Afeitadora Gillette', salePrice: 3.5, minStock: 15, barcode: '7500435123463', categoryId: categoryIdByName.get('Aseo Personal') },

        // Electrónica
        { name: 'Cable USB-C Rápido', salePrice: 15.0, minStock: 5, barcode: '8880001110001', categoryId: categoryIdByName.get('Electrónica') },
        { name: 'Cable Lightning', salePrice: 18.0, minStock: 5, barcode: '8880001110002', categoryId: categoryIdByName.get('Electrónica') },
        { name: 'Cargador de Pared USB', salePrice: 25.0, minStock: 4, barcode: '8880001110003', categoryId: categoryIdByName.get('Electrónica') },
        { name: 'Audífonos Simples', salePrice: 20.0, minStock: 6, barcode: '8880001110004', categoryId: categoryIdByName.get('Electrónica') },

        // Farmacia
        { name: 'Paracetamol 500mg', salePrice: 2.0, minStock: 15, barcode: '9990001110001', categoryId: categoryIdByName.get('Farmacia') },
        { name: 'Ibuprofeno 400mg', salePrice: 2.5, minStock: 15, barcode: '9990001110002', categoryId: categoryIdByName.get('Farmacia') },
        { name: 'Sal de Andrews', salePrice: 1.0, minStock: 20, barcode: '9990001110003', categoryId: categoryIdByName.get('Farmacia') },
        { name: 'Curitas (Caja x10)', salePrice: 3.0, minStock: 10, barcode: '9990001110004', categoryId: categoryIdByName.get('Farmacia') },
        { name: 'Alcohol en Gel 50ml', salePrice: 3.5, minStock: 12, barcode: '9990001110005', categoryId: categoryIdByName.get('Farmacia') },

        // Varios
        { name: 'Encendedor BIC', salePrice: 3.0, minStock: 15, barcode: '1110001110001', categoryId: categoryIdByName.get('Varios') },
        { name: 'Adaptador Universal', salePrice: 8.0, minStock: 8, barcode: '1110001110002', categoryId: categoryIdByName.get('Varios') },
        { name: 'Candado Pequeño', salePrice: 12.0, minStock: 5, barcode: '1110001110003', categoryId: categoryIdByName.get('Varios') },
        { name: 'Pilas AA (Par)', salePrice: 4.0, minStock: 10, barcode: '1110001110004', categoryId: categoryIdByName.get('Varios') },
        { name: 'Preservativos (x3)', salePrice: 8.5, minStock: 10, barcode: '1110001110005', categoryId: categoryIdByName.get('Varios') }
      ];

      const existingProductsPage = await productService.listAll({
        userId: adminUserId,
        page: 1,
        limit: 100,
      });
      const existingProducts = existingProductsPage.data;
      const productsByName = new Map(existingProducts.map(p => [p.name, p]));

      const createdProducts = [...existingProducts];
      let productsCreatedCount = 0;

      for (const prodData of productsSeed) {
        const existing = productsByName.get(prodData.name);
        if (existing) continue;

        // Casting as any because the `create` service expects a full `Product` object with ID which we don't have yet
        const product = await productService.create(adminUserId, prodData as any);
        productsByName.set(product.name, product as any);
        createdProducts.push(product as any);
        productsCreatedCount++;
      }
      console.log(`✅ ${productsCreatedCount} products created (total: ${createdProducts.length}).`);

      // 4. Create Inventory Movements (100 total: 50 IN + 50 OUT) for this user
      const pickInt = (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1)) + min;

      const toNumber = (value: unknown) => {
        const n = typeof value === 'number' ? value : parseFloat(String(value));
        return Number.isFinite(n) ? n : 0;
      };

      const shuffle = <T,>(arr: T[]) => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const ai = arr[i]!;
          const aj = arr[j]!;
          arr[i] = aj;
          arr[j] = ai;
        }
        return arr;
      };

      const allProducts = shuffle([...createdProducts]);
      if (allProducts.length === 0) {
        throw new Error('No hay productos para generar movimientos de inventario.');
      }

      const buildItems = (productStartIndex: number, movementType: 'IN' | 'OUT') => {
        const itemsCount = pickInt(1, 3);
        const items = [];

        for (let i = 0; i < itemsCount; i++) {
          const p = allProducts[(productStartIndex + i) % allProducts.length] as any;
          const salePrice = toNumber(p.salePrice);
          const quantity = pickInt(1, 8);

          const unitPrice =
            movementType === 'IN'
              ? Math.max(0.1, Math.round(salePrice * (0.55 + Math.random() * 0.25) * 100) / 100)
              : Math.max(0.1, Math.round(salePrice * 100) / 100);

          items.push({
            productId: p.id,
            unitPrice,
            quantity,
          });
        }
        return items;
      };

      let entriesCreated = 0;
      let exitsCreated = 0;

      // Create 50 entries first to guarantee stock for exits
      for (let i = 0; i < 50; i++) {
        await inventoryMovementService.registerEntry(adminUserId, {
          entityName: 'Seed - Proveedor',
          notes: `Seed IN #${i + 1}`,
          items: buildItems(i, 'IN'),
        });
        entriesCreated++;
      }

      for (let i = 0; i < 50; i++) {
        await inventoryMovementService.registerExit(adminUserId, {
          entityName: 'Seed - Cliente',
          notes: `Seed OUT #${i + 1}`,
          items: buildItems(i + 50, 'OUT'),
        });
        exitsCreated++;
      }

      res.status(201).json({
        message: 'Database seeded successfully',
        data: {
          user: {
            email: defaultEmail,
            password: defaultPassword,
            created: didCreateUser,
          },
          categoriesCreated: categoriesCreatedCount,
          productsCreated: productsCreatedCount,
          inventoryMovementsCreated: {
            entries: entriesCreated,
            exits: exitsCreated,
            total: entriesCreated + exitsCreated,
          },
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
