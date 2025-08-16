import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import { useAuth } from "../../contexts/AuthContext";
import { Eye, EyeOff, Check, X } from "lucide-react";

interface SignUpPageProps {
  onToggleMode: () => void;
}

export function SignUpPage({ onToggleMode }: SignUpPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const { signUp } = useAuth();

  // Password validation
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!isPasswordValid) {
      setError("Please ensure your password meets all requirements");
      setLoading(false);
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const { user, error: signUpError } = await signUp(email, password, {
      username: username.trim() || undefined,
      full_name: fullName.trim() || undefined,
    });

    if (signUpError) {
      setError(signUpError.message);
    } else if (user) {
      setSignUpSuccess(true);
    }

    setLoading(false);
  };

  if (signUpSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="text-green-600 mb-4">
                <Check className="w-16 h-16 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Account Created!</h2>
                <p className="text-gray-600">
                  We've sent you an email confirmation link. Please check your
                  inbox and click the link to verify your account.
                </p>
              </div>

              <Button onClick={onToggleMode} className="w-full mt-4">
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                Create your coding practice account
              </p>
            </div>

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
                  Email *
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
                  htmlFor="fullName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Full Name
                </label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  disabled={loading}
                  className="w-full"
                />
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  disabled={loading}
                  className="w-full"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password *
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
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

                {/* Password Requirements */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs space-y-1">
                      <div
                        className={`flex items-center gap-1 ${
                          passwordChecks.length
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {passwordChecks.length ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        At least 8 characters
                      </div>
                      <div
                        className={`flex items-center gap-1 ${
                          passwordChecks.uppercase
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {passwordChecks.uppercase ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        One uppercase letter
                      </div>
                      <div
                        className={`flex items-center gap-1 ${
                          passwordChecks.lowercase
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {passwordChecks.lowercase ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        One lowercase letter
                      </div>
                      <div
                        className={`flex items-center gap-1 ${
                          passwordChecks.number
                            ? "text-green-600"
                            : "text-gray-500"
                        }`}
                      >
                        {passwordChecks.number ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <X className="w-3 h-3" />
                        )}
                        One number
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm Password *
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    disabled={loading}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>

                {confirmPassword && (
                  <div className="mt-1">
                    <div
                      className={`text-xs flex items-center gap-1 ${
                        passwordsMatch ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {passwordsMatch ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      Passwords match
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !isPasswordValid || !passwordsMatch}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={onToggleMode}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-500 mt-4">
          By creating an account, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
