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

// ===== chart.js register =====
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
  const [companyInfo, setCompanyInfo] = useState(null)
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
    setCompanyInfo(null)

    const symbol = keyword.toUpperCase()

    try {
      // ===== Yahoo Finance =====
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

      const lastIndex = quote.close.length - 1
      const close = quote.close[lastIndex]
      const prevClose = result.meta.chartPreviousClose
      const change = close - prevClose
      const changePercent = ((change / prevClose) * 100).toFixed(2)

      const currency = result.meta.currency || ''

      setStockData({
        symbol: result.meta.symbol,
        name: result.meta.longName || result.meta.shortName,
        currency,
        close: close.toFixed(2),
        change: change.toFixed(2),
        changePercent,
        open: quote.open[lastIndex].toFixed(2),
        high: quote.high[lastIndex].toFixed(2),
        low: quote.low[lastIndex].toFixed(2),
        volume: quote.volume[lastIndex]
      })

      // ===== Candlestick =====
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

      // ===== Wikipedia =====
      const companyName =
        result.meta.longName || result.meta.shortName

      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(companyName)}`
      )
      const wikiJson = await wikiRes.json()

      if (wikiJson.extract) {
        setCompanyInfo({
          title: wikiJson.title,
          description: wikiJson.extract,
          thumbnail: wikiJson.thumbnail?.source,
          url: wikiJson.content_urls?.desktop?.page
        })
      }
    } catch (err) {
      console.error(err)
      setError('取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      {/* ===== Header ===== */}
      <header className="app-header">
        <img src={kabuImage} alt="株価" className="logo" />
        <h1>株価検索アプリ by KeiZi</h1>
      </header>

      {/* ===== Search ===== */}
      <form className="search-area" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="例: AAPL, BA, TSLA, 7203.T"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? '取得中...' : '検索'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {stockData && chartData && (
        <>
          {/* ===== Stock + Chart ===== */}
          <div className="result-area">
            <div className="stock-card">
              <h2>{stockData.symbol}</h2>
              <p className="company-name">{stockData.name}</p>

              <p>
                終値: {stockData.close} {stockData.currency}
              </p>
              <p>
                前日比:{' '}
                <span className={stockData.change >= 0 ? 'up' : 'down'}>
                  {stockData.change} ({stockData.changePercent}%)
                </span>
              </p>
              <p>始値: {stockData.open}</p>
              <p>高値: {stockData.high}</p>
              <p>安値: {stockData.low}</p>
              <p>
                出来高: {stockData.volume.toLocaleString()} 株
              </p>
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
                      time: { unit: 'day' }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* ===== Company Info ===== */}
          {companyInfo && (
            <div className="company-info">
              <h3>
                {stockData.symbol} = {companyInfo.title}
              </h3>

              <div className="company-body">
                {companyInfo.thumbnail && (
                  <img
                    src={companyInfo.thumbnail}
                    alt={companyInfo.title}
                  />
                )}
                <p>{companyInfo.description}</p>
              </div>

              <a
                href={companyInfo.url}
                target="_blank"
                rel="noreferrer"
                className="wiki-link"
              >
                Wikipediaで見る
              </a>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App