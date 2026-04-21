/**
 * Entrada para Vercel: `export default app`.
 *
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

let dbInitPromise: Promise<void> | undefined;
function ensureDb() {
  if (!dbInitPromise) dbInitPromise = initDb();
  return dbInitPromise;
}

// Evita que el preflight CORS dependa de la BD.
app.use(async (req, res, next) => {
  if (req.method === "OPTIONS") return next();
  try {
    await ensureDb();
    return next();
  } catch (err) {
    // Respuesta JSON consistente (y con CORS, porque el middleware cors ya corrió)
    return res.status(503).json({ message: "Database unavailable" });
  }
});

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

export default app;
