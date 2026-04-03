import { useState, useEffect } from 'react'
import SpeedGauge from './components/SpeedGauge'
import TemperatureChart from './components/TemperatureChart'
import WarningAlert from './components/WarningAlert'

function App() {
  const [rpm, setRpm] = useState(1550)
  const [temperatureData, setTemperatureData] = useState([])
  const [currentTemp, setCurrentTemp] = useState(65)
  const [showWarning, setShowWarning] = useState(false)
  const [logs, setLogs] = useState([])
  const [allHistoryData, setAllHistoryData] = useState([])

  // 添加日志
  const addLog = (level, message) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    const newLog = { timestamp, level, message, id: Date.now() }
    setLogs(prev => [...prev.slice(-49), newLog]) // 保留最近50条
  }

  // 导出CSV数据
  const exportToCSV = () => {
    const headers = ['时间戳', '转速(RPM)', '温度(°C)', '状态']
    const rows = allHistoryData.map(item => [
      new Date(item.timestamp).toLocaleString('zh-CN'),
      item.rpm,
      item.temp.toFixed(2),
      item.temp > 80 ? '预警' : '正常'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `工业电机监测数据_${new Date().toISOString().slice(0,10)}.csv`
    link.click()

    addLog('INFO', `数据导出成功，共 ${rows.length} 条记录`)
  }

  useEffect(() => {
    // 工业级物理模拟参数
    let time = 0 // 时间计数器（秒）
    let temperature = 50 // 初始温度 50°C
    let targetTemp = 50 // 目标温度，将逐渐上升
    const K = 0.08 // 热惯性平滑系数（越小越平滑）

    // 转速模拟参数（带载波动）
    const baseRpm = 1550 // 基准转速
    const amplitude = 15 // 低频波动振幅
    const omega = 0.05 // 角频率（更低频，周期约125秒）

    // 高斯噪声生成器（Box-Muller变换）
    const gaussianNoise = (mean = 0, stdDev = 1) => {
      const u1 = Math.random()
      const u2 = Math.random()
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      return z0 * stdDev + mean
    }

    // 初始化温度数据（60个点）- 从50°C开始的平滑曲线
    let initTemp = 50
    let initTarget = 50
    const initialData = Array.from({ length: 60 }, (_, i) => {
      // 目标温度缓慢上升（每秒约0.3度）
      initTarget = Math.min(85, initTarget + 0.3)
      // 一阶惯性滤波：T(t) = T(t-1) + K[T_target - T(t-1)] + ε
      initTemp = initTemp + K * (initTarget - initTemp) + gaussianNoise(0, 0.5)
      return {
        time: i,
        temp: initTemp
      }
    })
    setTemperatureData(initialData)
    temperature = initTemp
    targetTemp = initTarget

    addLog('INFO', '系统初始化完成，开始实时监测')
    addLog('INFO', `初始温度: ${temperature.toFixed(1)}°C, 转速: ${baseRpm} RPM`)

    let lastLogTemp = temperature
    let dataCounter = 0

    // 每秒更新数据
    const interval = setInterval(() => {
      time += 1

      // 温度模拟：热惯性滤波 + 逐渐上升趋势
      // 目标温度缓慢上升（模拟轴承逐渐发热）
      if (targetTemp < 85) {
        targetTemp = Math.min(85, targetTemp + 0.25 + gaussianNoise(0, 0.1))
      } else {
        // 到达85度后在82-88度之间波动
        targetTemp = 85 + gaussianNoise(0, 1.5)
      }

      // 一阶惯性滤波：T(t) = T(t-1) + K[T_target - T(t-1)] + ε
      temperature = temperature + K * (targetTemp - temperature) + gaussianNoise(0, 0.5)
      const newTemp = Math.max(45, Math.min(95, temperature))
      setCurrentTemp(newTemp)

      // 转速模拟：带载波动 RPM = Base + A*sin(ωt) + ε
      const lowFreqNoise = amplitude * Math.sin(omega * time) // 低频周期波动
      const highFreqNoise = gaussianNoise(0, 2) // 高频机械噪声 ±2
      const newRpm = Math.floor(baseRpm + lowFreqNoise + highFreqNoise)
      const clampedRpm = Math.max(1520, Math.min(1580, newRpm))
      setRpm(clampedRpm)

      // 更新温度数据
      setTemperatureData(prev => {
        const newData = [...prev.slice(1), {
          time: prev[prev.length - 1].time + 1,
          temp: newTemp
        }]
        return newData
      })

      // 记录历史数据
      setAllHistoryData(prev => [...prev, {
        timestamp: Date.now(),
        rpm: clampedRpm,
        temp: newTemp
      }])

      // 温度变化日志（每变化3度记录一次）
      if (Math.abs(newTemp - lastLogTemp) >= 3) {
        addLog('INFO', `温度变化: ${lastLogTemp.toFixed(1)}°C → ${newTemp.toFixed(1)}°C`)
        lastLogTemp = newTemp
      }

      // 超温警报
      const wasWarning = showWarning
      const isWarning = newTemp > 80
      setShowWarning(isWarning)

      if (isWarning && !wasWarning) {
        addLog('WARN', `⚠️ 轴承温度异常，当前值: ${newTemp.toFixed(1)}°C`)
      } else if (!isWarning && wasWarning) {
        addLog('INFO', `✓ 温度恢复正常: ${newTemp.toFixed(1)}°C`)
      } else if (isWarning && dataCounter % 10 === 0) {
        addLog('WARN', `持续高温警告: ${newTemp.toFixed(1)}°C`)
      }

      // 每30秒记录一次运行状态
      if (dataCounter % 30 === 0) {
        addLog('INFO', `运行状态正常 | 转速: ${clampedRpm} RPM | 温度: ${newTemp.toFixed(1)}°C`)
      }

      dataCounter++
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* 标题栏 */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-cyan-400">工业电机健康状态监测大屏</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-cyan-500/50 rounded-lg text-cyan-300 text-sm font-medium transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            导出历史运行数据 (CSV)
          </button>
          <WarningAlert show={showWarning} />
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 转速仪表盘 */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-cyan-500/30">
          <h2 className="text-2xl font-semibold mb-4 text-cyan-300">实时转速</h2>
          <SpeedGauge rpm={rpm} />
        </div>

        {/* 温度折线图 */}
        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-cyan-500/30">
          <h2 className="text-2xl font-semibold mb-4 text-cyan-300">轴承温度趋势</h2>
          <TemperatureChart data={temperatureData} currentTemp={currentTemp} />
        </div>
      </div>

      {/* 状态信息 */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-cyan-500/30">
          <div className="text-gray-400 text-sm">当前转速</div>
          <div className="text-3xl font-bold text-cyan-400">{rpm} RPM</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-cyan-500/30">
          <div className="text-gray-400 text-sm">当前温度</div>
          <div className={`text-3xl font-bold ${currentTemp > 80 ? 'text-red-500' : 'text-green-400'}`}>
            {currentTemp.toFixed(1)}°C
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-cyan-500/30">
          <div className="text-gray-400 text-sm">运行状态</div>
          <div className={`text-3xl font-bold ${currentTemp > 80 ? 'text-red-500' : 'text-green-400'}`}>
            {currentTemp > 80 ? '预警' : '正常'}
          </div>
        </div>
      </div>

      {/* 日志终端面板 */}
      <div className="mt-8 bg-black/80 rounded-lg p-4 border border-cyan-500/30 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className="text-cyan-400 text-sm font-mono">系统运行日志</span>
        </div>
        <div className="h-48 overflow-y-auto font-mono text-xs bg-gray-950/50 rounded p-3 space-y-1 scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-gray-800">
          {logs.length === 0 ? (
            <div className="text-gray-500">等待日志输出...</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="flex gap-3">
                <span className="text-gray-500">[{log.timestamp}]</span>
                <span className={`font-semibold ${
                  log.level === 'WARN' ? 'text-yellow-400' :
                  log.level === 'ERROR' ? 'text-red-400' :
                  'text-cyan-400'
                }`}>[{log.level}]</span>
                <span className="text-gray-300">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default App
