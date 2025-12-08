import express, { Router } from "express";
import { validateBody } from '../middlewares/zod-validation.middleware.js';
import { createCategorySchema } from '../schemas/category.schema.js';
import CategoryController from '../controllers/category.controller.js';

const categoryRouter: Router = express.Router();

categoryRouter.post("/", validateBody(createCategorySchema), CategoryController.createCategory)
categoryRouter.get("/", CategoryController.listCategories)

export default categoryRouter;