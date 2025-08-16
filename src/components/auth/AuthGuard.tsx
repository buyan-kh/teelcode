import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { LoginPage } from "./LoginPage";
import { SignUpPage } from "./SignUpPage";

interface AuthGuardProps {
  children: React.ReactNode;
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img
            src="https://i.ibb.co/Hf1xxfY7/teelcode.png"
            alt="TeelCode"
            className="w-12 h-12 rounded-full animate-pulse"
          />
          <h1 className="text-2xl font-bold text-blue-600 font-sf">TeelCode</h1>
        </div>

        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <p className="text-gray-600 text-sm mt-4">
          Loading your coding platform...
        </p>
      </div>
    </div>
  );
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Show loading spinner while checking auth state
  if (loading) {
    return <LoadingSpinner />;
  }

  // If user is not authenticated, show auth forms
  if (!user) {
    return isLoginMode ? (
      <LoginPage onToggleMode={() => setIsLoginMode(false)} />
    ) : (
      <SignUpPage onToggleMode={() => setIsLoginMode(true)} />
    );
  }

  // User is authenticated, show the protected content
  return <>{children}</>;
}
