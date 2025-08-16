

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({
  message = "Loading your coding platform...",
}: LoadingScreenProps) {
  return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-blue-600">TeelCode</h1>
        </div>

        {/* Loading spinner */}
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>

        {/* Loading message */}
        <p className="text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
}
