import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "vjadmin") {
      localStorage.setItem("isAdmin", "true");
      navigate("/admin");
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden"
      >
        <div className="bg-[#CB2E0D] p-8 text-center">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
            <img src="/images/vjlogo.jpeg" alt="VJ Crackers Logo" className="w-full h-full object-cover" />
          </div>

          <h2 className="text-2xl font-bold text-white">Admin Login</h2>
          {/* <p className="text-white/60 text-sm mt-1">Access your dashboard</p> */}
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-medium border border-red-100">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Username</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-12 pr-12 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-red-500 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded-xl font-bold shadow-xl shadow-red-200 transition-all transform active:scale-[0.98]"
          >
            Sign In
          </button>
        </form>
      </motion.div>
    </div>
  );
}
