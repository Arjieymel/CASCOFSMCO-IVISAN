import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { FiUser, FiLock, FiAlertCircle, FiPackage, FiEye, FiEyeOff } from "react-icons/fi";
import Swal from "sweetalert2";

const LoginPage = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username.trim() || !password.trim()) {
      setErrorMsg("Please enter both username and password.");
      return;
    }

    try {
      setIsLoading(true);
      await login(username, password);

      // Store remember me setting in local storage
      if (rememberMe) {
        localStorage.setItem("remembered_username", username);
      } else {
        localStorage.removeItem("remembered_username");
      }

      Swal.fire({
        title: "Welcome Back!",
        text: "Logged in successfully.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: "top-end"
      });

      navigate("/dashboard");
    } catch (err: any) {
      console.error("Login failed: ", err);
      const status = err.response?.status;
      if (status === 401) {
        setErrorMsg("The provided credentials do not match our records.");
      } else if (status === 403) {
        setErrorMsg("Your account is deactivated. Please contact your system administrator.");
      } else {
        setErrorMsg(err.response?.data?.message || "Connection error. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Swal.fire({
      title: "Forgot Password?",
      text: "Please contact your cooperative's System Administrator at admin@cascofamco.com or visit the management office to reset your password.",
      icon: "info",
      confirmButtonColor: "#1F6B3D",
      confirmButtonText: "Okay"
    });
  };

  // Load remembered username on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem("remembered_username");
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left side: Login Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white relative z-10 shadow-2xl">
        <div className="max-w-md w-full mx-auto">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary text-white font-bold flex items-center justify-center text-2xl shadow-md">
              C
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-primary leading-tight">CASCOFAMCO</h1>
              <p className="text-[10px] uppercase tracking-widest text-secondary font-semibold">Capiz Coconut Cooperative</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Sign In</h2>
            <p className="text-slate-500 text-sm mt-1">Enter your credentials to access the Cooperative MIS.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg flex items-center gap-2.5 animate-pulse">
              <FiAlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiUser className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent text-sm transition-all duration-150"
                  placeholder="Enter username"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Password</label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiLock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl bg-slate-50 placeholder-slate-400 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white focus:border-transparent text-sm transition-all duration-150"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary cursor-pointer w-4 h-4"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-primary hover:text-secondary font-semibold hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-sm flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer Info */}
          <div className="mt-12 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} Capiz Small Coconut Farmers Marketing Cooperative.<br />
            All Rights Reserved.
          </div>
        </div>
      </div>

      {/* Right side: Branded Graphic/Illustration Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center bg-dark-green overflow-hidden">
        {/* Abstract Coconut Farm Gradient Overlay */}
        <div className="absolute inset-0 bg-linear-to-tr from-dark-green via-primary to-secondary/80 opacity-90 z-10" />

        {/* Subtle pattern or farm image placeholders */}
        <div className="absolute inset-0 bg-cover bg-center opacity-30 filter saturate-50" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&q=80&w=1200')" }} />

        {/* Content */}
        <div className="relative z-20 text-center px-16 text-white max-w-xl">
          <div className="w-20 h-20 rounded-3xl bg-accent/20 border border-accent/40 flex items-center justify-center mx-auto mb-8 shadow-inner">
            <FiPackage className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-4 text-accent">CASCOFAMCO Cooperative MIS</h2>
          <p className="text-slate-200 text-sm leading-relaxed mb-6">
            A state-of-the-art cooperative information system enabling efficient member registration, coconut production monitoring, wholesale copra sales analytics, and task tracking.
          </p>
          <div className="inline-flex gap-6 text-xs text-slate-300 border-t border-white/10 pt-6 justify-center w-full">
            <div>
              <span className="block text-white font-bold text-lg">100+</span>
              Members
            </div>
            <div className="border-l border-white/10" />
            <div>
              <span className="block text-white font-bold text-lg">99.8%</span>
              Capiz Farmers Registered
            </div>
            <div className="border-l border-white/10" />
            <div>
              <span className="block text-white font-bold text-lg">Copra</span>
              Wholesale Trading
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
