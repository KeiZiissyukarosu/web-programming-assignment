import { useState, useRef } from 'react'
import { Chart } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js'
import {
  CandlestickController,
  CandlestickElement
} from 'chartjs-chart-financial'
import 'chartjs-adapter-date-fns'

import './index.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  CandlestickController,
  CandlestickElement,
  Tooltip,
  Legend
)

/* =====================
   型定義
===================== */
type Suggestion = {
  symbol: string
  name: string
}

type StockData = {
  symbol: string
  name: string
  currency: string
  open: number
  high: number
  low: number
  close: number
  change: number
  changePercent: string
}

type Candle = {
  x: number
  o: number
  h: number
  l: number
  c: number
}

/* =====================
   ローマ字変換（簡易版）
===================== */
const kanaToRomaji = (str: string) => {
  // 簡易対応：カタカナのみ
  return str
    .normalize('NFKC')
    .replace(/トヨタ/g, 'Toyota') // 必要に応じて増やせる
    .replace(/アップル/g, 'Apple')
    .replace(/ソニー/g, 'Sony')
}

/* =====================
   App Component
===================== */
function App() {
  const [keyword, setKeyword] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [stock, setStock] = useState<StockData | null>(null)
  const [chartData, setChartData] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [error, setError] = useState('')

  const timer = useRef<number | null>(null)

  /* =====================
     入力補完
  ===================== */
  const fetchSuggestions = (value: string) => {
    if (timer.current) window.clearTimeout(timer.current)

    timer.current = window.setTimeout(async () => {
      if (!value) {
        setSuggestions([])
        return
      }

      // 日本語ならローマ字変換
      const query = /[^\x00-\x7F]/.test(value) ? kanaToRomaji(value) : value

      try {
        const res = await fetch(
          `/yahoo/v1/finance/search?q=${encodeURIComponent(query)}`
        )
        const json = await res.json()
        const list: Suggestion[] =
          json.quotes?.slice(0, 5).map((q: any) => ({
            symbol: q.symbol,
            name: q.shortname || q.longname || ''
          })) ?? []
        setSuggestions(list)
      } catch {
        setSuggestions([])
      }
    }, 400)
  }

  /* =====================
     株価検索
  ===================== */
  const searchStock = async (symbol: string) => {
    setError('')
    setStock(null)
    setChartData(null)
    setCompany(null)
    setSuggestions([])

    try {
      // 株価データ
      const res = await fetch(
        `/yahoo/v8/finance/chart/${symbol}?interval=1d&range=1mo`
      )
      const json = await res.json()
      const r = json.chart?.result?.[0]

      if (!r) {
        setError('株価データ取得失敗')
        return
      }

      const quote = r.indicators.quote[0]
      const timestamps: number[] = r.timestamp
      const last = quote.close.length - 1
      const close = quote.close[last]
      const prev = r.meta.chartPreviousClose
      const change = close - prev

      setStock({
        symbol: r.meta.symbol,
        name: r.meta.longName || r.meta.shortName,
        currency: r.meta.currency || '',
        open: quote.open[last],
        high: quote.high[last],
        low: quote.low[last],
        close,
        change,
        changePercent: ((change / prev) * 100).toFixed(2)
      })

      const candles: Candle[] = timestamps.map((t, i) => {
        const o = quote.open[i]
        const h = quote.high[i]
        const l = quote.low[i]
        const c = quote.close[i]
        if (o == null || h == null || l == null || c == null) return null
        return { x: t * 1000, o, h, l, c }
      }).filter(Boolean) as Candle[]

      setChartData({
        datasets: [{ label: `${symbol} ローソク足`, data: candles }]
      })

      // 海外版Wikipedia取得
      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
          r.meta.longName || r.meta.shortName
        )}`
      )
      const wiki = await wikiRes.json()
      if (wiki.extract) {
        setCompany({
          title: wiki.title,
          description: wiki.extract,
          url: wiki.content_urls?.desktop?.page,
          thumbnail: wiki.thumbnail?.source || ''
        })
      }
    } catch {
      setError('取得エラー')
    }
  }

  return (
    <div className="app">
      <h1>株価検索アプリ by KeiZi</h1>

      <input
        value={keyword}
        placeholder="Apple / トヨタ / AAPL / 7203.T"
        onChange={(e) => {
          setKeyword(e.target.value)
          fetchSuggestions(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') searchStock(keyword)
        }}
      />

      {suggestions.length > 0 && (
        <ul className="suggest">
          {suggestions.map((s) => (
            <li
              key={s.symbol}
              onClick={() => {
                setKeyword(s.symbol)
                searchStock(s.symbol)
              }}
            >
              <strong>{s.symbol}</strong> – {s.name}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="error">{error}</p>}

      {stock && (
        <div className="card">
          {company?.thumbnail && (
            <img src={company.thumbnail} alt={stock.name} />
          )}
          <div className="info">
            <h2>{stock.name}</h2>
            <p>{stock.symbol}</p>
            <p>終値: {stock.close.toFixed(2)} {stock.currency}</p>
            <p>始値: {stock.open.toFixed(2)}</p>
            <p>高値: {stock.high.toFixed(2)}</p>
            <p>安値: {stock.low.toFixed(2)}</p>
            <p>
              前日比:{' '}
              <span className={stock.change >= 0 ? 'positive' : 'negative'}>
                {stock.change.toFixed(2)} ({stock.changePercent}%)
              </span>
            </p>
          </div>
        </div>
      )}

      {chartData && (
        <Chart
          type="candlestick"
          data={chartData}
          options={{ scales: { x: { type: 'time' } } } as ChartOptions}
        />
      )}

      {company && (
        <div className="wiki">
          {company.thumbnail && <img src={company.thumbnail} alt={company.title} />}
          <div className="content">
            <h3>{company.title}</h3>
            <p>{company.description}</p>
            {company.url && (
              <a href={company.url} target="_blank" rel="noreferrer">
                Wikipediaで見る
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
