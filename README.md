# 株価検索アプリ（Stock Price Viewer）

Yahoo Finance の非公式 API を利用して、  
株式ティッカーシンボルから **株価情報とローソク足チャート** を表示する Web アプリです。

React + Vite を用いたシンプルな構成で、  
**米国株・日本株の両方に対応**しています。

また、Wikipedia API を利用して  
**簡単な会社情報の表示**も行っています。


---

## 概要（Overview）

- 株式ティッカーを入力すると株価データを取得
- 終値・前日比・出来高を表示
- 直近 1 か月分のローソク足チャートを表示
- 米国株・日本株に対応（`.T` 形式）

### 入力例

- `AAPL`（Apple）
- `META`（Meta Platforms）
- `HD`（The Home Depot）
- `7203.T`（トヨタ自動車）

---

## 主な機能（Features）

- 株式ティッカーによる株価検索
- 終値・前日比（％）の表示
- 出来高の表示
- ローソク足チャート表示（Chart.js）
- 米国株・日本株対応
- Wikipedia API を利用した会社情報表示

---

## 使用技術（Tech Stack）

- **Reacr / Vite**
  モダンなフロントエンドでSPAを実装
- **Chart.js / chartjs-chart-financial**
  株価データの可視化(ローソク足チャート)
- **Yahoo Finance(非公式API)**
  株価データの取得
- **Wikipedia REST API**
  企業情報の掲載
---

## プロジェクト構成（Project Structure）

``` txt
src/
├─ public/            # 静的ファイル
├─ src/
│  ├─ App.jsx         # メインコンポーネント（UI / API通信 / チャート描画）
│  ├─ main.jsx        # React エントリーポイント
│  └─ index.css       # グローバルスタイル
├─ vite.config.js     # Vite 設定（Yahoo Finance 用 proxy）
├─ package.json       # 依存関係 / npm scripts
└─ README.md
```

### ファイル説明

- **App.tsx**  
  株価検索フォーム、Yahoo Finance API 通信、  
  株価カード表示、ローソク足チャート描画、  
  Wikipedia API を用いた会社情報取得を管理するメインコンポーネント。

- **index.css**  
  レイアウト、カード UI、レスポンシブ調整用のスタイル定義。

- **vite.config.js**  
  Yahoo Finance API の CORS 制限を回避するための proxy 設定。

---
## 公開先(デプロイ)

本アプリは以下のサービスを利用して公開しています。

- **Netlify**
  URL: [text](https://stock-price-viewer-by-keizi.netlify.app/)

- `npm run build` により生成された静的ファイルをデプロイ
- フロントエンドアプリとしてホスティング



---

