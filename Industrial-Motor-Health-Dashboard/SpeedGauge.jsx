import React from 'react'

const SpeedGauge = ({ rpm }) => {
  // 计算指针角度 (1500-1600 RPM 映射到 -90度到90度)
  const minRpm = 1500
  const maxRpm = 1600
  const angle = ((rpm - minRpm) / (maxRpm - minRpm)) * 180 - 90

  return (
    <div className="flex flex-col items-center justify-center">
      {/* 仪表盘容器 */}
      <div className="relative w-80 h-80">
        {/* 外圈 */}
        <div className="absolute inset-0 rounded-full border-8 border-cyan-500/30"></div>

        {/* 刻度线 */}
        {Array.from({ length: 11 }).map((_, i) => {
          const tickAngle = -90 + i * 18
          return (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 origin-left"
              style={{
                transform: `rotate(${tickAngle}deg)`,
                width: '140px',
                height: '2px',
              }}
            >
              <div className="w-6 h-1 bg-cyan-400"></div>
            </div>
          )
        })}

        {/* 刻度数字 */}
        {Array.from({ length: 11 }).map((_, i) => {
          const value = 1500 + i * 10
          const tickAngle = -90 + i * 18
          const radian = (tickAngle * Math.PI) / 180
          const x = Math.cos(radian) * 110
          const y = Math.sin(radian) * 110

          return (
            <div
              key={i}
              className="absolute text-cyan-300 text-sm font-semibold"
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {value}
            </div>
          )
        })}

        {/* 中心点 */}
        <div className="absolute top-1/2 left-1/2 w-6 h-6 bg-cyan-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-10 shadow-lg shadow-cyan-500/50"></div>

        {/* 指针 */}
        <div
          className="absolute top-1/2 left-1/2 origin-left transition-transform duration-300"
          style={{
            transform: `rotate(${angle}deg)`,
            width: '120px',
            height: '4px',
            marginTop: '-2px',
          }}
        >
          <div className="w-full h-full bg-gradient-to-r from-red-500 to-yellow-400 rounded-full shadow-lg"></div>
        </div>

        {/* 中心圆环装饰 */}
        <div className="absolute top-1/2 left-1/2 w-20 h-20 border-4 border-cyan-400/50 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* 数字显示 */}
      <div className="mt-8 text-center">
        <div className="text-6xl font-bold text-cyan-400 tabular-nums">
          {rpm}
        </div>
        <div className="text-xl text-gray-400 mt-2">RPM</div>
      </div>
    </div>
  )
}

export default SpeedGauge
