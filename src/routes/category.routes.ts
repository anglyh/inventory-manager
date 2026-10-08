import express, { Router } from "express";
import { validateBody, validateParams } from '../middlewares/zod-validation.middleware.js';
import { categoryIdParamSchema, createCategorySchema, updateCategorySchema } from '../schemas/category.schema.js';
import CategoryController from '../controllers/category.controller.js';

const categoryRouter: Router = express.Router();

categoryRouter.post("/", validateBody(createCategorySchema), CategoryController.createCategory)

categoryRouter.get("/", CategoryController.listCategories)

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