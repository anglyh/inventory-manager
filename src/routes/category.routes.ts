import express, { Router } from "express";
import { validateBody, validateParams } from '../middlewares/zod-validation.middleware.js';
import { categoryIdParamSchema, createCategorySchema, updateCategorySchema } from '../schemas/category.schema.js';
import CategoryController from '../controllers/category.controller.js';
import { requireAdmin } from '../middlewares/auth.middleware.js';

const categoryRouter: Router = express.Router();

// Staff (GUEST) routes. Everything below requireAdmin is ADMIN-only by default.
categoryRouter.get("/", CategoryController.listCategories)

categoryRouter.use(requireAdmin);

categoryRouter.post("/", validateBody(createCategorySchema), CategoryController.createCategory)

categoryRouter.put(
  "/:id",
  validateParams(categoryIdParamSchema),
  validateBody(updateCategorySchema),
  CategoryController.updateCategory
);

categoryRouter.delete(
  "/:id",
  validateParams(categoryIdParamSchema),
  CategoryController.deleteCategory
);

export default categoryRouter;
