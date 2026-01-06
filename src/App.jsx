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

// ===== register chart.js components =====
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

      const quote = result.indicators.quote[0]
      const timestamps = result.timestamp

      // 株価カード用データ（最後の取引日）
      const lastIndex = quote.close.length - 1
      const close = quote.close[lastIndex]
      const prevClose = result.meta.chartPreviousClose
      const change = close - prevClose
      const changePercent = ((change / prevClose) * 100).toFixed(2)

      setStockData({
        symbol: result.meta.symbol,
        close: close.toFixed(2),
        change: change.toFixed(2),
        changePercent: changePercent,
        open: quote.open[lastIndex].toFixed(2),
        high: quote.high[lastIndex].toFixed(2),
        low: quote.low[lastIndex].toFixed(2),
        volume: quote.volume[lastIndex],
        sales: (quote.volume[lastIndex] * close).toFixed(0)
      })

      // ローソク足データ
      const candles = timestamps
        .map((ts, i) => ({
          x: ts * 1000,
          o: quote.open[i],
          h: quote.high[i],
          l: quote.low[i],
          c: quote.close[i]
        }))
        .filter(c => [c.o, c.h, c.l, c.c].every(v => v !== null))

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
          {/* 株価カード */}
          <div className="stock-card">
            <h2>{stockData.symbol}</h2>
            <p>終値: {stockData.close}</p>
            <p>
              前日比:{' '}
              <span className={stockData.change >= 0 ? 'up' : 'down'}>
                {stockData.change} ({stockData.changePercent}%)
              </span>
            </p>
            <p>始値: {stockData.open}</p>
            <p>高値: {stockData.high}</p>
            <p>安値: {stockData.low}</p>
            <p>出来高: {stockData.volume.toLocaleString()}</p>
            <p>売上代金: {Number(stockData.sales).toLocaleString()}</p>
          </div>

          {/* ローソク足チャート */}
          <div className="chart-wrapper">
            <Chart
              type="candlestick"
              data={chartData}
              options={{
                responsive: true,
                scales: {
                  x: {
                    type: 'time',
                    time: { unit: 'day' }
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
