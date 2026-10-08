/**
 * Importante: NO conectamos a la BD en el top-level (`await initDb()`),
 * porque si Supabase no es resoluble (ENOTFOUND) la Function crashea y
 * ni siquiera responde el preflight CORS (OPTIONS). Conexión lazy + cache.
 */
import express from "express";
import cors from "cors";
import { initDb } from './db/index.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.middleware.js';
import userRouter from './routes/user.routes.js';
import productRouter from './routes/product.routes.js';
import { requireAdmin, requireAuth } from './middlewares/auth.middleware.js';
import categoryRouter from './routes/category.routes.js';
import inventoryMovementRouter from './routes/inventory-movement.routes.js';
import reportRouter from './routes/report.routes.js';
import seedRouter from './routes/seed.routes.js';
import cashRegisterRouter from './routes/cash-register.routes.js';
import supplierRouter from './routes/supplier.routes.js';
import storeUserRouter from './routes/store-user.routes.js';
import { setupSwagger } from './config/swagger.js';
import { env } from './config.js';

const app = express();

const corsOptions: cors.CorsOptions = {
  origin: [
    "https://inventory-manager-angular.vercel.app",
    "https://inventory-manager-angular.pages.dev",
    "http://localhost:3000",
    "http://localhost:4200",
  ],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false,
};

app.use(cors(corsOptions));
// Express 5 no acepta `*` como path en route matching.
// El middleware `cors()` ya responde preflights por defecto.
app.use(express.json());

let dbInitPromise: Promise<void> | undefined;
function ensureDb() {
  if (!dbInitPromise) {
    dbInitPromise = initDb().catch(err => {
      dbInitPromise = undefined;
      throw err;
    });
  }
  return dbInitPromise;
}

// Evita que el preflight CORS dependa de la BD.
app.use(async (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  try {
    await ensureDb();
    return next();
  } catch (err) {
    console.error("Error connecting to database", err);
    // Respuesta JSON consistente (y con CORS, porque el middleware cors ya corrió)
    return res.status(503).json({ success: false, error: { code: 'DB_ERROR', message: 'Base de datos no disponible' } });
  }
});

if (env.NODE_ENV !== "production") {
  setupSwagger(app);
}

app.get('/health', (req, res) => {
  res.json({ message: "Server working" });
});

app.use("/api/auth", userRouter);
app.use("/api/product", requireAuth, productRouter);
app.use("/api/category", requireAuth, categoryRouter);
app.use("/api/inventory-movement", requireAuth, inventoryMovementRouter);
app.use("/api/cash-register", requireAuth, cashRegisterRouter);
app.use('/api/supplier', requireAuth, supplierRouter);
app.use('/api/store-user', requireAuth, storeUserRouter);
app.use("/api/report", requireAuth, reportRouter);
app.use("/api/seed", seedRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
})
