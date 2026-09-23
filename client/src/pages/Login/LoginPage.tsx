import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSettings } from "../../contexts/SettingContext";
import { FiUser, FiLock, FiAlertCircle, FiPackage, FiEye, FiEyeOff } from "react-icons/fi";
import Swal from "sweetalert2";
import cascofamco from "../../assets/img/cascofamco.png";

const LoginPage = () => {
  const { login, user } = useAuth();
  const { cooperativeName, cooperativeLogo } = useSettings();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const userInteractedRef = useRef<boolean>(false);

  const handleUserInteraction = () => {
    userInteractedRef.current = true;
  };

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    userInteractedRef.current = true;
    setUsername(e.target.value);
  };

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

      // Store remember me preference without persisting sensitive username
      if (rememberMe) {
        localStorage.setItem("remember_me_preference", "true");
      } else {
        localStorage.removeItem("remember_me_preference");
      }
      localStorage.removeItem("remembered_username");
      sessionStorage.removeItem("remembered_username");

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

  // Ensure username field is completely empty on mount / refresh and purge stored credentials
  useEffect(() => {
    try {
      localStorage.removeItem("remembered_username");
      sessionStorage.removeItem("remembered_username");
    } catch {
      // ignore storage access restrictions if any
    }

    setUsername("");
    if (usernameInputRef.current) {
      usernameInputRef.current.value = "";
    }

    // Clean up any delayed browser autofill attempts if the user has not physically typed
    const clearIfAutofilled = () => {
      if (!userInteractedRef.current) {
        setUsername("");
        if (usernameInputRef.current) {
          usernameInputRef.current.value = "";
        }
      }
    };

    const timers = [
      setTimeout(clearIfAutofilled, 50),
      setTimeout(clearIfAutofilled, 150),
      setTimeout(clearIfAutofilled, 300),
      setTimeout(clearIfAutofilled, 500)
    ];

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left side: Login Form */}
      <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white relative z-10 shadow-2xl overflow-hidden">

        <img
          src="/niyog.png"
          alt=""
          className="absolute -left-36 -bottom-18 w-[137.5] h-[137.5] object-contain pointer-events-none select-none -rotate-12 z-0"
        />
        <div className="max-w-md w-full mx-auto relative z-10">
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 mb-8">
            {cooperativeLogo ? (
              <img
                src={cooperativeLogo}
                alt="Cooperative Logo"
                className="w-16 h-18 rounded-xl object-contain border border-slate-100 p-1 bg-slate-50 shadow-md animate-fade-in"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary text-white font-bold flex items-center justify-center text-2xl shadow-md">
                {cooperativeName ? cooperativeName.charAt(0) : "C"}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-wide text-primary leading-tight">
                {cooperativeName || "CASCOFAMCO"}
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-secondary font-semibold">Ivisan Coconut Cooperative</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent inline-block pb-1">Sign In</h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">Enter your credentials to access the Cooperative MIS.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg flex items-center gap-2.5 animate-pulse">
              <FiAlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} autoComplete="off" className="space-y-5">
            {/* Decoy fields to intercept aggressive browser credential autofill */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-9999px",
                top: "-9999px",
                opacity: 0,
                height: 0,
                width: 0,
                pointerEvents: "none"
              }}
            >
              <input type="text" name="fake_username_autofill" tabIndex={-1} autoComplete="off" defaultValue="" />
              <input type="password" name="fake_password_autofill" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>

            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <FiUser className="w-5 h-5" />
                </div>
                <input
                  ref={usernameInputRef}
                  type="text"
                  name="login_username"
                  id="login_username"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
                  value={username}
                  onChange={handleUsernameChange}
                  onKeyDown={handleUserInteraction}
                  onKeyUp={handleUserInteraction}
                  onPaste={handleUserInteraction}
                  onMouseDown={handleUserInteraction}
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
                  name="login_password"
                  id="login_password"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  data-form-type="other"
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
                className="text-slate-800 hover:text-slate-600 font-semibold hover:underline cursor-pointer"
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
            &copy; {new Date().getFullYear()} {cooperativeName || "Ivisan Small Coconut Farmers Marketing Cooperative"}.<br />
            All Rights Reserved.
          </div>
        </div>
      </div>

      {/* Right side: Branded Graphic/Illustration Panel */}
      <div className="hidden lg:flex lg:w-[55%] relative items-center justify-center bg-dark-green overflow-hidden">
        {/* Abstract Coconut Farm Gradient Overlay */}


        {/* Subtle pattern or farm image placeholders */}
        <div className="absolute inset-0 bg-cover bg-center " style={{ backgroundImage: `url(${cascofamco})` }} />

        {/* Content */}
        <div className="relative z-20 text-center px-16 text-white max-w-xl">
          <div className="w-20 h-20 rounded-3xl bg-accent/20 border border-accent/40 flex items-center justify-center mx-auto mb-8 shadow-inner">
            <FiPackage className="w-10 h-10 text-accent" />
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-4 text-accent">{(cooperativeName || "CASCOFAMCO")} MIS</h2>
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
              Ivisan Farmers Registered
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
