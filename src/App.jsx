import { useState } from 'react'
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

function App() {
  const [keyword, setKeyword] = useState('')
  const [stockData, setStockData] = useState(null)
  const [timeSeries, setTimeSeries] = useState(null)
  const [error, setError] = useState('')

  // .envからAPIキーを取得
  const apiKey = import.meta.env.VITE_ALPHA_API_KEY

  const handleSearch = async () => {
    if (!keyword) {
      setError('シンボルを入力してください')
      setStockData(null)
      setTimeSeries(null)
      return
    }

    setError('')
    setStockData(null)
    setTimeSeries(null)

    const symbol = keyword.toUpperCase()

    try {
      // 現在株価と日足を同時に取得
      const [quoteRes, tsRes] = await Promise.all([
        fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`),
        fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}`)
      ])

      const quoteData = await quoteRes.json()
      const tsData = await tsRes.json()

      // API制限チェック
      if (quoteData.Note || tsData.Note) {
        setError('APIリクエスト上限に達しました。少し待って再度試してください。')
        return
      }

      // 現在株価のセット
      if (quoteData['Global Quote'] && quoteData['Global Quote']['01. symbol']) {
        setStockData(quoteData['Global Quote'])
      } else {
        setStockData(null)
        setError('株価情報が見つかりませんでした')
      }

      // 日足データのセット
      if (tsData['Time Series (Daily)']) {
        setTimeSeries(tsData['Time Series (Daily)'])
      } else {
        setTimeSeries(null)
      }

    } catch (err) {
      console.error(err)
      setError('データ取得に失敗しました')
      setStockData(null)
      setTimeSeries(null)
    }
  }

  // チャート用データ整形
  const chartData = timeSeries
    ? {
        labels: Object.keys(timeSeries).reverse(),
        datasets: [
          {
            label: `${keyword.toUpperCase()} 株価（日足）`,
            data: Object.keys(timeSeries).reverse().map(date =>
              parseFloat(timeSeries[date]['4. close'])
            ),
            borderColor: 'blue',
            backgroundColor: 'rgba(0,0,255,0.2)',
          },
        ],
      }
    : null

  return (
    <div className="app">
      {/* ヘッダー */}
      <header className="app-header">
        <img src={kabuImage} alt="株価イメージ" className="logo" />
        <h1>株価検索アプリ</h1>
      </header>

      {/* 検索フォーム */}
      <div className="search-area">
        <input
          type="text"
          placeholder="株のシンボルを入力（例: AAPL, TSLA, 7203.T）"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button onClick={handleSearch}>検索</button>
      </div>

      {/* エラー表示 */}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* 現在の株価表示 */}
      {stockData && (
        <div className="stock-result">
          <p>会社: {stockData['01. symbol']}</p>
          <p>株価: {stockData['05. price']} USD</p>
          <p>前日比: {stockData['09. change']} USD</p>
          <p>変化率: {stockData['10. change percent']}</p>
        </div>
      )}

      {/* 日足チャート */}
      {chartData && (
        <div className="chart-area" style={{ maxWidth: '700px', margin: '20px auto', height: '400px' }}>
          <Line data={chartData} />
        </div>
      )}
    </div>
  )
}

export default App
