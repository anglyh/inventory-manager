import express from "express";
import cors from "cors";
import { initDb } from './db/index.js';
import { env } from './config.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.middleware.js';
import userRouter from './routes/user.routes.js';
import productRouter from './routes/product.routes.js';
import { requireAuth } from './middlewares/auth.middleware.js';
import categoryRouter from './routes/category.routes.js';
import saleRouter from './routes/sale.routes.js';
import purchaseRouter from './routes/purchase.routes.js';

import { setupSwagger } from './config/swagger.js';


const app = express();

app.use(cors());
app.use(express.json())

// Configurar Swagger
setupSwagger(app);

app.get('/health', (req, res) => {
  res.json({ message: "Server working" })
});

import seedRouter from './routes/seed.routes.js';

app.use("/api/auth", userRouter);
app.use("/api/product", requireAuth, productRouter);
app.use("/api/category", requireAuth, categoryRouter);
app.use("/api/sale", requireAuth, saleRouter);
app.use("/api/purchase", requireAuth, purchaseRouter)
app.use("/api/seed", seedRouter)

app.use(notFoundHandler)
app.use(errorHandler);

(async () => {
  try {
    await initDb();
    app.listen(env.PORT, () => {
      console.log(`Server running on http://localhost:${env.PORT}`);
    });
  } catch (err) {
    console.error("Error on DB startup:", err);
    process.exit(1);
  }
})();
