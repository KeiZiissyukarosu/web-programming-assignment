import { useState, useRef } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import kabuImage from './assets/kabu_chart_smartphone_woman_happy.png'
import './index.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

function App() {
  const [keyword, setKeyword] = useState('')
  const [stockData, setStockData] = useState(null)
  const [timeSeries, setTimeSeries] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const lastFetchTime = useRef(0)
  const apiKey = import.meta.env.VITE_ALPHA_API_KEY

  const handleSearch = async (e) => {
    e.preventDefault()

    const now = Date.now()
    if (now - lastFetchTime.current < 15000) {
      setError('15秒以上待ってから検索してください')
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
    setTimeSeries(null)

    const symbol = keyword.toUpperCase()
    console.log('検索したsymbol:', symbol)
    console.log('API KEY:', apiKey)

    try {
      const [quoteRes, tsRes] = await Promise.all([
        fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
        ),
        fetch(
          `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`
        )
      ])

      const quoteData = await quoteRes.json()
      const tsData = await tsRes.json()

      // ★ここで必ず出力
      console.log('=== デバッグ: quoteData ===')
      console.log(quoteData)
      console.log('=== デバッグ: tsData ===')
      console.log(tsData)

      if (quoteData.Note || tsData.Note) {
        setError('APIのリクエスト制限に達しました。少し待ってください')
        return
      }

      if (!quoteData['Global Quote']?.['01. symbol']) {
        setError('株価情報が見つかりませんでした')
        return
      }

      setStockData(quoteData['Global Quote'])

      if (tsData['Time Series (Daily)']) {
        const entries = Object.entries(tsData['Time Series (Daily)'])
          .slice(0, 30)
          .reverse()
        setTimeSeries(Object.fromEntries(entries))
      }
    } catch (err) {
      console.error(err)
      setError('データ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const chartData = timeSeries && {
    labels: Object.keys(timeSeries),
    datasets: [
      {
        label: `${keyword.toUpperCase()} 株価（日足）`,
        data: Object.values(timeSeries).map(d =>
          parseFloat(d['4. close'])
        ),
        borderColor: 'rgb(37, 99, 235)',
        backgroundColor: 'rgba(37, 99, 235, 0.2)',
        tension: 0.3
      }
    ]
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
            <h2>{stockData['01. symbol']}</h2>
            <p className="price">{stockData['05. price']} USD</p>
            <p>前日比: {stockData['09. change']} USD</p>
            <p>変化率: {stockData['10. change percent']}</p>
          </div>

          <div className="chart-wrapper">
            <Line data={chartData} />
          </div>
        </div>
      )}
    </div>
  )
}

export default App
