// src/components/Login.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

interface LoginProps {
  role: string;
  onBack: () => void;
}

const Login: React.FC<LoginProps> = ({ role, onBack }) => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [uniqueId, setUniqueId] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

  const { login, register } = useAuth();

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    const rememberedPassword = localStorage.getItem('rememberedPassword');
    const rememberedUniqueId = localStorage.getItem('rememberedUniqueId');
    
    if (role === 'admin') {
      if (rememberedEmail && rememberedUniqueId) {
        setEmail(rememberedEmail);
        setUniqueId(rememberedUniqueId);
        setRememberMe(true);
      }
    } else {
      if (rememberedEmail && rememberedPassword) {
        setEmail(rememberedEmail);
      setPassword(rememberedPassword);
        setRememberMe(true);
      }
    }

    const handlePopState = () => {
      onBack();
    };

    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', window.location.href);

    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };

    window.addEventListener('keydown', handleEscKey);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [onBack, role]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    
    if (role === 'student') {
      if (!email || !password) {
        setError("Please enter both email and password");
        return;
      }
    }

    setLoading(true);

    if (role === "student") {
      if (isSignUp) {
        // Student Sign Up
        if (!name) {
          setError("Please enter your name");
          setLoading(false);
          return;
        }

        if (!email.endsWith("@thapar.edu")) {
          setError("Please use a valid Thapar email ID");
          setLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }

        const result = await register(name, email, password);
        
        if (result.success) {
          if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
            localStorage.setItem('rememberedPassword', password);
          }
        } else {
          setError(result.message || "Registration failed");
          setLoading(false);
        }
      } else {
        // Student Login
        if (!email.endsWith("@thapar.edu")) {
          setError("Please use a valid Thapar email ID");
          setLoading(false);
          return;
        }

        const result = await login(email, password, 'student');
        
        if (result.success) {
          if (rememberMe) {
            localStorage.setItem('rememberedEmail', email);
            localStorage.setItem('rememberedPassword', password);
          } else {
            localStorage.removeItem('rememberedEmail');
            localStorage.removeItem('rememberedPassword');
          }
        } else {
          setError(result.message || "Login failed");
          setLoading(false);
        }
      }
    } else {
      if (!email || !password || !uniqueId) {
        setError("Email, password, and unique ID are required");
        setLoading(false);
        return;
      }
      const result = await login(email, password, 'admin', uniqueId);
      
      if (result.success) {
        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberedUniqueId', uniqueId);
        } else {
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedUniqueId');
        }
      } else {
        setError(result.message || "Invalid admin credentials");
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Lost & Found</h1>
            <p className="text-gray-600">
              {role === "admin" 
                ? "Enter your email, password, and unique ID"
                : isSignUp 
                  ? "Create your student account"
                  : "Login to your student account"}
            </p>
            <p className="text-xs text-gray-400 pt-2">
              Press ESC or browser back button to return
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {isSignUp && role === "student" && (
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder={role === "admin" ? "Enter your email" : "Enter Thapar email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                autoComplete="email"
              />
            </div>

            {role === "admin" ? (
              <>
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="uniqueId" className="block text-sm font-semibold text-gray-700">
                    Unique ID (6 digits)
                  </label>
                  <input
                    id="uniqueId"
                    type="tel"
                    placeholder="Enter your 6-digit unique ID"
                    value={uniqueId}
                    onChange={(e) => setUniqueId(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    title="Enter exactly 6 digits"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  autoComplete="current-password"
                />
              </div>
            )}

            {isSignUp && role === "student" && (
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="remember" className="text-sm font-medium text-gray-700">
                  Remember me
                </label>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : isSignUp ? "Sign Up" : "Login"}
            </button>
          </form>

          {role === "student" && (
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError("");
                  }}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  {isSignUp ? "Login" : "Sign Up"}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;