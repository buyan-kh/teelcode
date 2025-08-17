import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import { useAuth } from "../../contexts/AuthContext";
import { Eye, EyeOff } from "lucide-react";
import { OAuthButtons } from "./OAuthButtons";

interface LoginPageProps {
  onToggleMode: () => void;
}

export function LoginPage({ onToggleMode }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const { signIn, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { user, error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message);
    } else if (user) {
      // Success - user will be redirected by AuthGuard
      console.log("Successfully signed in:", user.email);
    }

    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address first");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setError(resetError.message);
    } else {
      setResetEmailSent(true);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardContent className="p-8">
            {/* Logo/Brand */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <img
                  src="https://i.ibb.co/Hf1xxfY7/teelcode.png"
                  alt="TeelCode"
                  className="w-12 h-12 rounded-full"
                />
                <h1 className="text-2xl font-bold text-blue-600 font-sf">
                  TeelCode
                </h1>
              </div>
              <p className="text-gray-600 text-sm">
                Sign in to your coding practice platform
              </p>
            </div>

            {resetEmailSent ? (
              <div className="text-center">
                <div className="text-green-600 mb-4">
                  ✅ Reset email sent! Check your inbox.
                </div>
                <Button
                  onClick={() => setResetEmailSent(false)}
                  variant="outline"
                  className="w-full"
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    required
                    disabled={loading}
                    className="w-full"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                      className="w-full pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>

                <OAuthButtons loading={loading} onError={setError} />

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Forgot password?
                  </button>

                  <button
                    type="button"
                    onClick={onToggleMode}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Create account
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-4">
          Secure authentication powered by Supabase
        </p>
      </div>
    </div>
  );
}
