'use client'

export const LoadingSpinner = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-indigo-600 rounded-full animate-pulse"></div>
          </div>
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Chargement...</p>
      </div>
    </div>
  )
}