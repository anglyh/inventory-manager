/**
 * Igual que el template de Vercel: un solo módulo con `export default app`.
 * `await initDb()` aquí para que Vercel arranque la BD antes de servir.
 */
import express from "express";
import cors from "cors";
import { initDb } from './db/index.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.middleware.js';
import userRouter from './routes/user.routes.js';
import productRouter from './routes/product.routes.js';
import { requireAuth } from './middlewares/auth.middleware.js';
import categoryRouter from './routes/category.routes.js';
import inventoryMovementRouter from './routes/inventory-movement.routes.js';
import seedRouter from './routes/seed.routes.js';
import { setupSwagger } from './config/swagger.js';

const app = express();

const corsOptions: cors.CorsOptions = {
  origin: [
    "https://inventory-manager-angular.vercel.app",
    "http://localhost:3000",
    "http://localhost:4200",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());

setupSwagger(app);

app.get('/health', (req, res) => {
  res.json({ message: "Server working" });
});

app.use("/api/auth", userRouter);
app.use("/api/product", requireAuth, productRouter);
app.use("/api/category", requireAuth, categoryRouter);
app.use("/api/inventory-movement", requireAuth, inventoryMovementRouter);
app.use("/api/seed", seedRouter);

app.use(notFoundHandler);
app.use(errorHandler);

await initDb();
export default app;
