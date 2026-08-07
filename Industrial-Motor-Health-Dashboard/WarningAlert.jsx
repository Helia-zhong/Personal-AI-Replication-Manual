import React from 'react'

const WarningAlert = ({ show }) => {
  if (!show) return null

  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-3 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg border-2 border-red-400">
        {/* 闪烁的警告图标 */}
        <div className="relative">
          <div className="w-6 h-6 bg-white rounded-full animate-ping absolute"></div>
          <div className="w-6 h-6 bg-white rounded-full relative"></div>
        </div>

        {/* 警告文字 */}
        <span className="text-xl font-bold">WARNING: 超温预警</span>

        {/* 警告图标 */}
        <svg
          className="w-8 h-8"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  )
}

export default WarningAlert
