import type { NextFunction, Request, Response } from 'express';
import { categoryService, productService, userService } from '../container.js';
import { ConflictError } from '../errors/app.error.js';

export default class SeedController {
  static async runSeed(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Create Default User
      const defaultEmail = 'admin@example.com';
      let adminUserId: string;

      try {
        const adminUser = await userService.register({
          name: 'Admin User',
          email: defaultEmail,
          password: 'password123'
        });
        adminUserId = adminUser.user.id;
        console.log('✅ Default user created:', defaultEmail);
      } catch (error) {
        if (error instanceof ConflictError) {
          console.log('⚠️ Default user already exists, skipping seed.');
          res.status(200).json({ message: 'Seed already applied or user admin@example.com exists.' });
          return;
        }
        throw error;
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

      const createdCategories = [];
      for (const catData of categoriesSeed) {
        // Casting as any because the `create` service expects a full `Category` object with ID which we don't have yet
        const category = await categoryService.create(adminUserId, catData as any);
        createdCategories.push(category);
      }
      console.log(`✅ ${createdCategories.length} categories created.`);

      // 3. Create Products
      const productsSeed = [
        // Bebidas (createdCategories[0])
        { name: 'Agua Mineral 500ml', salePrice: 2.5, minStock: 10, barcode: '7501030301111', categoryId: createdCategories[0]!.id },
        { name: 'Agua Mineral 1L', salePrice: 3.5, minStock: 10, barcode: '7501030302222', categoryId: createdCategories[0]!.id },
        { name: 'Coca Cola 600ml', salePrice: 3.5, minStock: 15, barcode: '7501055310883', categoryId: createdCategories[0]!.id },
        { name: 'Inka Kola 600ml', salePrice: 3.5, minStock: 15, barcode: '7501055310999', categoryId: createdCategories[0]!.id },
        { name: 'Sprite 600ml', salePrice: 3.5, minStock: 10, barcode: '7501055310777', categoryId: createdCategories[0]!.id },
        { name: 'Cerveza Pilsen 310ml', salePrice: 5.0, minStock: 20, barcode: '7750100010011', categoryId: createdCategories[0]!.id },
        { name: 'Cerveza Cusqueña 310ml', salePrice: 6.0, minStock: 20, barcode: '7750100020022', categoryId: createdCategories[0]!.id },
        { name: 'Gatorade Azul 500ml', salePrice: 4.5, minStock: 8, barcode: '7750100030033', categoryId: createdCategories[0]!.id },
        { name: 'Jugo del Valle Durazno', salePrice: 3.0, minStock: 10, barcode: '7750100040044', categoryId: createdCategories[0]!.id },
        { name: 'Red Bull 250ml', salePrice: 8.0, minStock: 5, barcode: '9002490100070', categoryId: createdCategories[0]!.id },
        
        // Snacks (createdCategories[1])
        { name: 'Papas Lays Clásicas', salePrice: 2.0, minStock: 15, barcode: '7501000111200', categoryId: createdCategories[1]!.id },
        { name: 'Papas Lays Onduladas', salePrice: 2.0, minStock: 15, barcode: '7501000111201', categoryId: createdCategories[1]!.id },
        { name: 'Doritos Queso', salePrice: 2.5, minStock: 15, barcode: '7501000111300', categoryId: createdCategories[1]!.id },
        { name: 'Cheetos Queso', salePrice: 2.0, minStock: 10, barcode: '7501000111400', categoryId: createdCategories[1]!.id },
        { name: 'Galletas Oreo', salePrice: 1.5, minStock: 20, barcode: '7622300732864', categoryId: createdCategories[1]!.id },
        { name: 'Galletas Ritz', salePrice: 1.5, minStock: 15, barcode: '7622300732865', categoryId: createdCategories[1]!.id },
        { name: 'Galletas Morochas', salePrice: 1.2, minStock: 15, barcode: '7622300732866', categoryId: createdCategories[1]!.id },
        { name: 'Chocolate Sublime', salePrice: 2.0, minStock: 20, barcode: '7750030001111', categoryId: createdCategories[1]!.id },
        { name: 'Gomitas Ambrosoli', salePrice: 1.5, minStock: 10, barcode: '7750030002222', categoryId: createdCategories[1]!.id },
        { name: 'Maní Karinto', salePrice: 1.8, minStock: 12, barcode: '7750030003333', categoryId: createdCategories[1]!.id },

        // Aseo Personal (createdCategories[2])
        { name: 'Jabón Dove', salePrice: 4.0, minStock: 10, barcode: '7501002302309', categoryId: createdCategories[2]!.id },
        { name: 'Jabón Protex', salePrice: 3.5, minStock: 10, barcode: '7501002302310', categoryId: createdCategories[2]!.id },
        { name: 'Shampoo H&S 400ml', salePrice: 15.0, minStock: 5, barcode: '7500435123456', categoryId: createdCategories[2]!.id },
        { name: 'Shampoo Pantene Sachet', salePrice: 1.5, minStock: 20, barcode: '7500435123457', categoryId: createdCategories[2]!.id },
        { name: 'Pasta Dental Colgate 50g', salePrice: 3.0, minStock: 10, barcode: '7500435123458', categoryId: createdCategories[2]!.id },
        { name: 'Cepillo Dental Oral-B', salePrice: 5.0, minStock: 8, barcode: '7500435123459', categoryId: createdCategories[2]!.id },
        { name: 'Desodorante Rexona', salePrice: 12.0, minStock: 6, barcode: '7500435123460', categoryId: createdCategories[2]!.id },
        { name: 'Papel Higiénico Suave', salePrice: 2.0, minStock: 20, barcode: '7500435123461', categoryId: createdCategories[2]!.id },
        { name: 'Toallas Nosotras', salePrice: 4.5, minStock: 10, barcode: '7500435123462', categoryId: createdCategories[2]!.id },
        { name: 'Afeitadora Gillette', salePrice: 3.5, minStock: 15, barcode: '7500435123463', categoryId: createdCategories[2]!.id },

        // Electrónica (createdCategories[3])
        { name: 'Cable USB-C Rápido', salePrice: 15.0, minStock: 5, barcode: '8880001110001', categoryId: createdCategories[3]!.id },
        { name: 'Cable Lightning', salePrice: 18.0, minStock: 5, barcode: '8880001110002', categoryId: createdCategories[3]!.id },
        { name: 'Cargador de Pared USB', salePrice: 25.0, minStock: 4, barcode: '8880001110003', categoryId: createdCategories[3]!.id },
        { name: 'Audífonos Simples', salePrice: 20.0, minStock: 6, barcode: '8880001110004', categoryId: createdCategories[3]!.id },

        // Farmacia (createdCategories[4])
        { name: 'Paracetamol 500mg', salePrice: 2.0, minStock: 15, barcode: '9990001110001', categoryId: createdCategories[4]!.id },
        { name: 'Ibuprofeno 400mg', salePrice: 2.5, minStock: 15, barcode: '9990001110002', categoryId: createdCategories[4]!.id },
        { name: 'Sal de Andrews', salePrice: 1.0, minStock: 20, barcode: '9990001110003', categoryId: createdCategories[4]!.id },
        { name: 'Curitas (Caja x10)', salePrice: 3.0, minStock: 10, barcode: '9990001110004', categoryId: createdCategories[4]!.id },
        { name: 'Alcohol en Gel 50ml', salePrice: 3.5, minStock: 12, barcode: '9990001110005', categoryId: createdCategories[4]!.id },

        // Varios (createdCategories[5])
        { name: 'Encendedor BIC', salePrice: 3.0, minStock: 15, barcode: '1110001110001', categoryId: createdCategories[5]!.id },
        { name: 'Adaptador Universal', salePrice: 8.0, minStock: 8, barcode: '1110001110002', categoryId: createdCategories[5]!.id },
        { name: 'Candado Pequeño', salePrice: 12.0, minStock: 5, barcode: '1110001110003', categoryId: createdCategories[5]!.id },
        { name: 'Pilas AA (Par)', salePrice: 4.0, minStock: 10, barcode: '1110001110004', categoryId: createdCategories[5]!.id },
        { name: 'Preservativos (x3)', salePrice: 8.5, minStock: 10, barcode: '1110001110005', categoryId: createdCategories[5]!.id }
      ];

      const createdProducts = [];
      for (const prodData of productsSeed) {
        // Casting as any because the `create` service expects a full `Product` object with ID which we don't have yet
        const product = await productService.create(adminUserId, prodData as any);
        createdProducts.push(product);
      }
      console.log(`✅ ${createdProducts.length} products created.`);

      res.status(201).json({
        message: 'Database seeded successfully',
        data: {
          user: {
            email: defaultEmail,
            password: 'password123'
          },
          categoriesCreated: createdCategories.length,
          productsCreated: createdProducts.length
        }
      });
    } catch (err) {
      next(err);
    }
  }
}
