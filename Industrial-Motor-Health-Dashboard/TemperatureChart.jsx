import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const TemperatureChart = ({ data, currentTemp }) => {
  // 自定义 Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 border border-cyan-500 rounded px-3 py-2">
          <p className="text-cyan-300 text-sm">
            温度: <span className="font-bold">{payload[0].value.toFixed(1)}°C</span>
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            {/* 青色渐变填充 */}
            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="time"
            stroke="#6B7280"
            tick={{ fill: '#9CA3AF' }}
            label={{ value: '时间 (秒)', position: 'insideBottom', offset: -5, fill: '#9CA3AF' }}
          />
          <YAxis
            stroke="#6B7280"
            tick={{ fill: '#9CA3AF' }}
            domain={[45, 95]}
            label={{ value: '温度 (°C)', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* 警戒线 */}
          <ReferenceLine
            y={80}
            stroke="#EF4444"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{ value: '警戒线 80°C', fill: '#EF4444', position: 'right' }}
          />

          {/* 温度曲线 - Area Chart with 渐变填充 */}
          <Area
            type="monotone"
            dataKey="temp"
            stroke="#06B6D4"
            strokeWidth={3}
            fill="url(#colorTemp)"
            fillOpacity={1}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* 当前温度显示 */}
      <div className="mt-4 text-center">
        <span className="text-gray-400">当前温度: </span>
        <span className={`text-3xl font-bold ${currentTemp > 80 ? 'text-red-500' : 'text-cyan-400'}`}>
          {currentTemp.toFixed(1)}°C
        </span>
      </div>
    </div>
  )
}

export default TemperatureChart
