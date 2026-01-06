import { useState, useRef } from 'react'
import { Chart } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend
} from 'chart.js'
import {
  CandlestickController,
  CandlestickElement
} from 'chartjs-chart-financial'
import 'chartjs-adapter-date-fns'

import kabuImage from './assets/kabu_chart_smartphone_woman_happy.png'
import './index.css'

// ===== register =====
ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  CandlestickController,
  CandlestickElement,
  Tooltip,
  Legend
)

function App() {
  const [keyword, setKeyword] = useState('')
  const [stockData, setStockData] = useState(null)
  const [chartData, setChartData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const lastFetchTime = useRef(0)

  const handleSearch = async (e) => {
    e.preventDefault()

    const now = Date.now()
    if (now - lastFetchTime.current < 5000) {
      setError('少し待ってから検索してください')
      return
    }
    lastFetchTime.current = now

    if (!keyword) {
      setError('シンボルを入力してください')
      return
    }

    setError('')
    setLoading(true)
    setStockData(null)
    setChartData(null)

    const symbol = keyword.toUpperCase()

    try {
      const res = await fetch(
        `/yahoo/v8/finance/chart/${symbol}?interval=1d&range=1mo`
      )
      const json = await res.json()

      const result = json.chart?.result?.[0]
      if (!result) {
        setError('データが取得できませんでした')
        return
      }

      // ===== 株価カード =====
      setStockData({
        symbol: result.meta.symbol,
        price: result.meta.regularMarketPrice,
        change: (
          result.meta.regularMarketPrice -
          result.meta.chartPreviousClose
        ).toFixed(2),
        changePercent:
          (
            ((result.meta.regularMarketPrice -
              result.meta.chartPreviousClose) /
              result.meta.chartPreviousClose) *
            100
          ).toFixed(2) + '%'
      })

      // ===== ローソク足 =====
      const timestamps = result.timestamp
      const quote = result.indicators.quote[0]

      const candles = timestamps
        .map((ts, i) => ({
          x: ts * 1000,
          o: quote.open[i],
          h: quote.high[i],
          l: quote.low[i],
          c: quote.close[i]
        }))
        // null対策（超重要）
        .filter(c =>
          [c.o, c.h, c.l, c.c].every(v => v !== null)
        )

      setChartData({
        datasets: [
          {
            label: `${symbol} ローソク足`,
            data: candles,
            color: {
              up: '#2563eb',
              down: '#dc2626',
              unchanged: '#64748b'
            }
          }
        ]
      })
    } catch (err) {
      console.error(err)
      setError('取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <img src={kabuImage} alt="株価イメージ" className="logo" />
        <h1>株価検索アプリ by KeiZi</h1>
      </header>

      <form className="search-area" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="例: AAPL, TSLA, 7203.T"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? '取得中...' : '検索'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {stockData && chartData && (
        <div className="result-area">
          <div className="stock-card">
            <h2>{stockData.symbol}</h2>
            <p className="price">{stockData.price}</p>
            <p>前日比: {stockData.change}</p>
            <p>変化率: {stockData.changePercent}</p>
          </div>

          <div className="chart-wrapper">
            <Chart
              type="candlestick"
              data={chartData}
              options={{
                responsive: true,
                scales: {
                  x: {
                    type: 'time',
                    time: {
                      unit: 'day'
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
