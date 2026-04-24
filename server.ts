import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Sequelize, DataTypes, Model, Op } from "sequelize";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import cors from "cors";

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "lux-finance-secure-token-2024";

// --- Database Connection ---
const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || "lux_finance",
  process.env.MYSQL_USER || "root",
  process.env.MYSQL_PASSWORD || "",
  {
    host: process.env.MYSQL_HOST || "localhost",
    dialect: "mysql",
    dialectOptions:
      process.env.NODE_ENV === "production"
        ? {
            socketPath: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
          }
        : {},
    logging: false,
    retry: {
      max: 3,
    },
  },
);

// --- Models ---
class User extends Model {
  declare id: number;
  declare name: string;
  declare email: string;
  declare password: string;
}
User.init(
  {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
  },
  { sequelize, modelName: "user" },
);

class Category extends Model {
  declare id: number;
  declare name: string;
  declare type: "income" | "expense";
  declare userId: number;
}
Category.init(
  {
    name: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM("income", "expense"), allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
  },
  { sequelize, modelName: "category" },
);

class Transaction extends Model {
  declare id: number;
  declare amount: number;
  declare type: "income" | "expense";
  declare category: string;
  declare description: string;
  declare date: Date;
  declare userId: number;
}
Transaction.init(
  {
    amount: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
    type: { type: DataTypes.ENUM("income", "expense"), allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING },
    date: { type: DataTypes.DATE, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
  },
  { sequelize, modelName: "transaction" },
);

// Associations
User.hasMany(Category, { foreignKey: "userId" });
User.hasMany(Transaction, { foreignKey: "userId" });
Category.belongsTo(User, { foreignKey: "userId" });
Transaction.belongsTo(User, { foreignKey: "userId" });

// --- Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

// --- API Routes ---
async function startServer() {
  try {
    console.log("Connecting to database...");
    await sequelize.sync(); // Create tables
    console.log("Database connected and synced.");
  } catch (error) {
    console.error(
      "CRITICAL: Could not connect to database. Please check your MYSQL_* environment variables.",
    );
    console.error(error);
  }

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan("dev"));
  app.use(cors({ origin: true, credentials: true }));

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password: hashedPassword });

      // Create initial categories
      await Category.bulkCreate([
        { name: "Salary", type: "income", userId: user.id },
        { name: "Food", type: "expense", userId: user.id },
        { name: "Rent", type: "expense", userId: user.id },
        { name: "Transport", type: "expense", userId: user.id },
      ]);

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: "7d",
      });
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json({ user: { id: user.id, name: user.name, email: user.email } });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
        expiresIn: "7d",
      });
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json({ user: { id: user.id, name: user.name, email: user.email } });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ success: true });
  });

  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email"],
    });
    res.json({ user });
  });

  // Category Routes
  app.get("/api/categories", authenticateToken, async (req: any, res) => {
    const categories = await Category.findAll({
      where: { userId: req.user.id },
    });
    res.json(categories);
  });

  app.post("/api/categories", authenticateToken, async (req: any, res) => {
    const { name, type } = req.body;
    const category = await Category.create({ name, type, userId: req.user.id });
    res.json(category);
  });

  app.put("/api/categories/:id", authenticateToken, async (req: any, res) => {
    await Category.update(req.body, {
      where: { id: req.params.id, userId: req.user.id },
    });
    res.json({ success: true });
  });

  app.delete(
    "/api/categories/:id",
    authenticateToken,
    async (req: any, res) => {
      await Category.destroy({
        where: { id: req.params.id, userId: req.user.id },
      });
      res.json({ success: true });
    },
  );

  // Transaction Routes
  app.get("/api/transactions", authenticateToken, async (req: any, res) => {
    const transactions = await Transaction.findAll({
      where: { userId: req.user.id },
      order: [["date", "DESC"]],
    });
    res.json(transactions);
  });

  app.post("/api/transactions", authenticateToken, async (req: any, res) => {
    const tx = await Transaction.create({ ...req.body, userId: req.user.id });
    res.json(tx);
  });

  app.delete(
    "/api/transactions/:id",
    authenticateToken,
    async (req: any, res) => {
      await Transaction.destroy({
        where: { id: req.params.id, userId: req.user.id },
      });
      res.json({ success: true });
    },
  );

  // Dashboard Stats
  app.get("/api/stats", authenticateToken, async (req: any, res) => {
    const txs = await Transaction.findAll({ where: { userId: req.user.id } });
    const totals = txs.reduce(
      (acc, tx) => {
        if (tx.type === "income") acc.income += Number(tx.amount);
        else acc.expense += Number(tx.amount);
        return acc;
      },
      { income: 0, expense: 0 },
    );
    res.json({ totals, balance: totals.income - totals.expense });
  });

  // --- Vite / Static Files ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
