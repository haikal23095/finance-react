import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  LogOut,
  History,
  PieChart as PieChartIcon,
  Filter,
  Trash2,
  Calendar,
  Tag,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Settings,
  User as UserIcon,
  Mail,
  Lock,
  Edit2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";

import { cn, formatCurrency, api } from "./lib/utils";
import { Transaction, Category } from "./types";

// --- Components ---

const Modal = ({
  isOpen,
  onClose,
  children,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md glass-card p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 gold-gradient" />
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-display font-bold gold-text-gradient">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

const COLORS = [
  "#e6ac00",
  "#bf8600",
  "#996400",
  "#7a4d00",
  "#663d00",
  "#ffcc1a",
  "#fff085",
];

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "history">(
    "dashboard",
  );
  const [authView, setAuthView] = useState<"login" | "register">("login");

  // Transaction Form State
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Category Form State
  const [catName, setCatName] = useState("");
  const [catType, setCatType] = useState<"income" | "expense">("expense");

  // Auth Form State
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // --- Auth & Data Fetching ---

  const checkAuth = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const [txRes, catRes] = await Promise.all([
        api.get("/transactions"),
        api.get("/categories"),
      ]);
      setTransactions(txRes.data);
      setCategories(catRes.data);
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  // --- Calculations ---

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        const amt = Number(tx.amount);
        if (tx.type === "income") acc.income += amt;
        else acc.expense += amt;
        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [transactions]);

  const balance = totals.income - totals.expense;

  const chartData = useMemo(() => {
    const daily = transactions.reduce((acc: any, tx) => {
      const day = format(new Date(tx.date), "MMM dd");
      if (!acc[day]) acc[day] = { name: day, income: 0, expense: 0 };
      const amt = Number(tx.amount);
      if (tx.type === "income") acc[day].income += amt;
      else acc[day].expense += amt;
      return acc;
    }, {});
    return Object.values(daily).reverse().slice(-7);
  }, [transactions]);

  const categoryData = useMemo(() => {
    const cats = transactions
      .filter((tx) => tx.type === "expense")
      .reduce((acc: any, tx) => {
        if (!acc[tx.category]) acc[tx.category] = 0;
        acc[tx.category] += Number(tx.amount);
        return acc;
      }, {});
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  // --- Handlers ---

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const endpoint = authView === "login" ? "/auth/login" : "/auth/register";
      const body =
        authView === "login"
          ? { email: authEmail, password: authPassword }
          : { name: authName, email: authEmail, password: authPassword };

      const { data } = await api.post(endpoint, body);
      setUser(data.user);
    } catch (error: any) {
      setAuthError(error.response?.data?.error || "Authentication failed");
    }
  };

  const handleLogout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !date) return;

    try {
      await api.post("/transactions", {
        type,
        amount: parseFloat(amount),
        category,
        description,
        date: new Date(date),
      });
      fetchData();
      setAmount("");
      setCategory("");
      setDescription("");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Add Error:", error);
    }
  };

  const handleDeleteTransaction = async (id: any) => {
    try {
      await api.delete(`/transactions/${id}`);
      fetchData();
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName) return;
    try {
      await api.post("/categories", { name: catName, type: catType });
      fetchData();
      setCatName("");
      setIsCategoryModalOpen(false);
    } catch (error) {
      console.error("Cat Add Error:", error);
    }
  };

  const handleDeleteCategory = async (id: any) => {
    try {
      await api.delete(`/categories/${id}`);
      fetchData();
    } catch (error) {
      console.error("Cat Delete Error:", error);
    }
  };

  // --- Render Helpers ---

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold-500/10 blur-[120px] rounded-full" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-card p-8 z-10"
        >
          <div className="w-16 h-16 gold-gradient rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            <Wallet size={32} className="text-black" />
          </div>
          <h2 className="text-4xl font-display font-bold text-center mb-2 gold-text-gradient gold-glow">
            LuxFinance
          </h2>
          <p className="text-gray-400 text-center mb-8 font-medium">
            {authView === "login"
              ? "Managed your wealth with elegance"
              : "Start your journey to financial freedom"}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {authView === "register" && (
              <div className="relative">
                <UserIcon
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:border-gold-500 outline-none transition-all"
                />
              </div>
            )}
            <div className="relative">
              <Mail
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                size={18}
              />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:border-gold-500 outline-none transition-all"
              />
            </div>
            <div className="relative">
              <Lock
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                size={18}
              />
              <input
                type="password"
                placeholder="Password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:border-gold-500 outline-none transition-all"
              />
            </div>

            {authError && (
              <p className="text-red-500 text-sm text-center">{authError}</p>
            )}

            <button
              type="submit"
              className="w-full py-4 gold-gradient text-black font-bold rounded-xl hover:scale-[1.02] transition-transform shadow-lg"
            >
              {authView === "login" ? "Login" : "Register"}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-500 text-sm">
            {authView === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              onClick={() =>
                setAuthView(authView === "login" ? "register" : "login")
              }
              className="text-gold-500 font-bold hover:underline"
            >
              {authView === "login" ? "Register here" : "Login here"}
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24 md:pb-0 md:pl-20">
      {/* Sidebar */}
      <nav className="fixed bottom-0 left-0 w-full h-20 bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-around z-40 md:top-0 md:left-0 md:w-20 md:h-full md:flex-col md:border-t-0 md:border-r border-gold-500/20">
        <div className="hidden md:flex w-12 h-12 gold-gradient rounded-xl items-center justify-center mb-8 mt-6">
          <Wallet size={24} className="text-black" />
        </div>

        <div className="flex md:flex-col gap-8 md:gap-6">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={cn(
              "p-3 rounded-xl transition-all",
              activeTab === "dashboard"
                ? "bg-gold-500 text-black shadow-[0_0_20px_rgba(230,172,0,0.4)]"
                : "text-gray-500 hover:text-gold-500",
            )}
          >
            <LayoutDashboard size={24} />
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={cn(
              "p-3 rounded-xl transition-all",
              activeTab === "history"
                ? "bg-gold-500 text-black shadow-[0_0_20px_rgba(230,172,0,0.4)]"
                : "text-gray-500 hover:text-gold-500",
            )}
          >
            <History size={24} />
          </button>
        </div>

        <div className="md:mt-auto md:mb-8 flex md:flex-col gap-6 items-center">
          <button
            onClick={handleLogout}
            className="p-3 text-gray-500 hover:text-red-500 transition-colors"
          >
            <LogOut size={24} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-500 font-bold">
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 pt-10">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-display font-bold gold-text-gradient">
              LuxFinance Account
            </h1>
            <p className="text-gray-500">
              Hello {user?.name}, manage your wealth with precision.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="hidden md:flex items-center gap-2 px-6 py-3 gold-gradient text-black font-bold rounded-xl hover:scale-105 transition-transform shadow-xl"
          >
            <Plus size={20} />
            Add Transaction
          </button>
        </header>

        {activeTab === "dashboard" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-6 border-gold-500/20"
              >
                <p className="text-gray-400 mb-1">Current Balance</p>
                <h2 className="text-4xl font-display font-bold gold-text-gradient">
                  {formatCurrency(balance)}
                </h2>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-6 border-green-500/20"
              >
                <div className="flex items-center gap-2 text-green-500 font-medium mb-1">
                  <TrendingUp size={16} /> Income
                </div>
                <h2 className="text-3xl font-display font-bold">
                  {formatCurrency(totals.income)}
                </h2>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card p-6 border-red-500/20"
              >
                <div className="flex items-center gap-2 text-red-500 font-medium mb-1">
                  <TrendingDown size={16} /> Expenses
                </div>
                <h2 className="text-3xl font-display font-bold">
                  {formatCurrency(totals.expense)}
                </h2>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-6 gold-text-gradient">
                  Cash Flow History
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#222"
                        vertical={false}
                      />
                      <XAxis dataKey="name" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip
                        contentStyle={{
                          background: "#111",
                          border: "1px solid #333",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.1}
                        strokeWidth={3}
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#ef4444"
                        fill="#ef4444"
                        fillOpacity={0.1}
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold mb-6 gold-text-gradient">
                  Expense Allocation
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-12">
            <div className="glass-card overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <h3 className="text-xl font-bold gold-text-gradient">
                  Transaction Logs
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-gray-500 text-sm">
                    <tr>
                      <th className="p-6">Date</th>
                      <th className="p-6">Category</th>
                      <th className="p-6">Description</th>
                      <th className="p-6 text-right">Amount</th>
                      <th className="p-6 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-white/5 transition-colors"
                      >
                        <td className="p-6 text-sm text-gray-400">
                          {format(new Date(tx.date), "MMM dd, yyyy")}
                        </td>
                        <td className="p-6 font-bold">{tx.category}</td>
                        <td className="p-6 text-gray-500">
                          {tx.description || "-"}
                        </td>
                        <td
                          className={cn(
                            "p-6 text-right font-bold text-lg",
                            tx.type === "income"
                              ? "text-green-500"
                              : "text-white",
                          )}
                        >
                          {tx.type === "income" ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="p-6 text-center">
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="text-gray-600 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length === 0 && (
                  <div className="p-20 text-center text-gray-600">
                    No transactions recorded yet.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold gold-text-gradient">
                  Manage Categories
                </h3>
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="flex items-center gap-2 px-6 py-2 border border-gold-500/50 text-gold-500 rounded-xl hover:bg-gold-500/10 transition-all font-bold"
                >
                  <Plus size={18} /> Add New
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Income Categories */}
                <div className="glass-card p-6">
                  <h4 className="text-green-500 font-bold mb-4 flex items-center gap-2 text-lg">
                    <TrendingUp size={20} /> Income Categories
                  </h4>
                  <div className="space-y-2">
                    {categories
                      .filter((c) => c.type === "income")
                      .map((cat) => (
                        <div
                          key={cat.id}
                          className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:border-gold-500/30 transition-all group"
                        >
                          <span className="font-medium">{cat.name}</span>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:scale-110 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
                {/* Expense Categories */}
                <div className="glass-card p-6">
                  <h4 className="text-red-500 font-bold mb-4 flex items-center gap-2 text-lg">
                    <TrendingDown size={20} /> Expense Categories
                  </h4>
                  <div className="space-y-2">
                    {categories
                      .filter((c) => c.type === "expense")
                      .map((cat) => (
                        <div
                          key={cat.id}
                          className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:border-gold-500/30 transition-all group"
                        >
                          <span className="font-medium">{cat.name}</span>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-500 hover:scale-110 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Transaction"
      >
        <form onSubmit={handleAddTransaction} className="space-y-4">
          <div className="flex p-1 bg-white/5 rounded-xl">
            <button
              type="button"
              onClick={() => setType("expense")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                type === "expense" ? "bg-red-500 text-white" : "text-gray-500",
              )}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType("income")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                type === "income" ? "bg-green-500 text-white" : "text-gray-500",
              )}
            >
              Income
            </button>
          </div>
          <input
            type="number"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 gold-text-gradient text-2xl font-bold outline-none"
            placeholder="0.00"
          />
          <select
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none"
          >
            <option value="" disabled>
              Select Category
            </option>
            {categories
              .filter((c) => c.type === type)
              .map((c) => (
                <option key={c.id} value={c.name} className="bg-black">
                  {c.name}
                </option>
              ))}
          </select>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none"
          />
          <input
            type="text"
            placeholder="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none"
          />
          <button
            type="submit"
            className="w-full py-4 gold-gradient text-black font-bold rounded-xl shadow-lg mt-4"
          >
            Confirm Entry
          </button>
        </form>
      </Modal>

      {/* Add Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Add Category"
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div className="flex p-1 bg-white/5 rounded-xl">
            <button
              type="button"
              onClick={() => setCatType("expense")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                catType === "expense"
                  ? "bg-red-500 text-white"
                  : "text-gray-500",
              )}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setCatType("income")}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-bold transition-all",
                catType === "income"
                  ? "bg-green-500 text-white"
                  : "text-gray-500",
              )}
            >
              Income
            </button>
          </div>
          <input
            type="text"
            placeholder="Category Name"
            required
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 outline-none"
          />
          <button
            type="submit"
            className="w-full py-4 gold-gradient text-black font-bold rounded-xl shadow-lg"
          >
            Save Category
          </button>
        </form>
      </Modal>
    </div>
  );
}
