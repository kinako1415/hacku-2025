# 技術解説ドキュメント - AI リハビリアプリ

## 概要
このアプリケーションは、MediaPipe AIを使用してブラウザ上で手首の可動域を測定するリハビリテーション支援アプリです。

---

## どうやって角度を測っているの?

### 使用技術
- **MediaPipe Hands**: Googleが開発した機械学習ベースの手のランドマーク検出ライブラリ
- **3D座標ベクトル計算**: 数学的手法による正確な角度算出

### 角度測定の仕組み

#### 1. ランドマーク検出
MediaPipeが手を21個の3D座標点として認識します:

```
検出される主要ポイント:
- 手首 (WRIST)
- 指の付け根 (MCP: Metacarpophalangeal joints)
  - 人差し指MCP
  - 中指MCP
  - 薬指MCP
  - 小指MCP
- 親指の関節 (CMC, MCP, IP, TIP)
```

各ポイントは以下の3次元座標を持ちます:
- **x座標**: 左右の位置 (0.0 ~ 1.0の正規化値)
- **y座標**: 上下の位置 (0.0 ~ 1.0の正規化値)
- **z座標**: 奥行き (カメラからの距離)

#### 2. ベクトル計算
2点間のベクトルを計算します:

```typescript
// 例: 手首から指付け根へのベクトル
vector = {
  x: point2.x - point1.x,
  y: point2.y - point1.y,
  z: point2.z - point1.z
}
```

#### 3. 角度算出 - 内積法
2つのベクトルから角度を計算します:

```typescript
// ベクトルの内積
dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z

// ベクトルの大きさ
|v1| = √(v1.x² + v1.y² + v1.z²)
|v2| = √(v2.x² + v2.y² + v2.z²)

// コサインの値
cos(θ) = dot / (|v1| × |v2|)

// 角度(度数法)
angle = arccos(cos(θ)) × 180 / π
```

---

## 各方向の角度測定方法

### 掌屈 (Palmar Flexion) - 手のひら側への曲げ

**測定原理:**
1. 手首と4本の指の付け根(MCP)のY座標差を計算
2. 小指側からカメラで撮影する配置を想定
3. 掌屈時は指が画面下方向に移動 → Y座標が増加

**計算式:**
```typescript
yDifference = avgMcpY - wrist.y  // 正の値 = 掌屈
horizontalDistance = |palmCenter.x - wrist.x|
angle = arctan2(yDifference, horizontalDistance) × 180/π
```

**測定範囲:** 0-90度

### 背屈 (Dorsal Flexion) - 手の甲側への曲げ

**測定原理:**
1. 掌屈と逆方向の動きを検出
2. 背屈時は指が画面上方向に移動 → Y座標が減少

**計算式:**
```typescript
yDifference = wrist.y - avgMcpY  // 正の値 = 背屈
angle = arctan2(yDifference, horizontalDistance) × 180/π
```

**測定範囲:** 0-70度

### 尺屈・橈屈 (Ulnar/Radial Deviation) - 左右への傾き

**測定原理:**
1. 手のひら中央から手首へのベクトルを計算
2. 垂直ベクトル(Y軸)との角度を測定
3. X座標の符号で尺屈/橈屈を判定

**計算式:**
```typescript
palmToWrist = palmCenter → wrist
verticalVector = (0, -1, 0)
angle = arccos(dot / magnitude) × 180/π
```

---

## 精度を高める工夫

### 1. 外積を使った手のひらの法線ベクトル計算
手のひらに垂直な方向を正確に検出:

```typescript
// 手のひらの横方向ベクトル
lateral = indexMcp → pinkyMcp

// 手のひらの縦方向ベクトル
longitudinal = wrist → palmCenter

// 外積で法線を算出
palmNormal = lateral × longitudinal
```

### 2. 信頼度スコア
ベクトルの長さに基づいて測定の信頼度を評価:

```typescript
accuracy = min(1, minLength / 0.1)  // 0.1を基準長さとする
isValid = accuracy >= 0.3  // 最低30%の信頼度
```

**信頼度の閾値:**
- 高: 0.8以上
- 中: 0.6以上
- 低: 0.4以上
- 最低許容: 0.3

### 3. 移動平均による平滑化
ノイズを減らすため、過去5フレームの平均を使用:

```typescript
class AngleSmoothing {
  private history: number[] = []
  private maxHistory = 5

  getSmoothedAngle(): number {
    return sum(history) / history.length
  }
}
```

### 4. 3D座標の活用
MediaPipeが提供する3D座標(X, Y, Z)を使ってベクトル計算:

```typescript
// ベクトルの大きさ計算にZ座標も含める
magnitude = √(x² + y² + z²)

// 内積計算
dot = v1.x × v2.x + v1.y × v2.y + v1.z × v2.z

// 外積計算(手のひらの法線ベクトル)
cross.z = v1.x × v2.y - v1.y × v2.x
```

---

## 測定フロー

### リアルタイム測定プロセス

1. **カメラ起動**
   - ユーザーのWebカメラから映像を取得
   - 30fps程度でフレームを処理

2. **AI検出**
   - MediaPipe Handsが手のランドマーク(21点)を検出
   - 検出結果を3D座標として取得

3. **角度計算**
   - 取得した座標からベクトルを計算
   - 内積・外積を使って各方向の角度を算出
   - 信頼度スコアを付与

4. **データ保存**
   - 計算した角度をIndexedDB(Dexie)に保存
   - 日付ごとに履歴を管理

5. **可視化**
   - リアルタイムで角度を画面表示
   - グラフで過去のデータと比較

### サンプリング設定

```typescript
const config = {
  measurementDuration: 10,  // 測定時間: 10秒
  samplingRate: 10,         // サンプリング: 10Hz (0.1秒間隔)
  confidenceThreshold: 0.6, // 信頼度閾値: 60%
}
```

---

## 技術スタック

### フロントエンド
- **Next.js 14**: Reactフレームワーク
- **TypeScript**: 型安全な開発
- **Jotai**: 軽量な状態管理
- **Recharts**: グラフ描画ライブラリ

### AI/ML
- **@mediapipe/hands**: 手のランドマーク検出(21点の3D座標)
- CDN経由でモデルを読み込み (https://cdn.jsdelivr.net/npm/@mediapipe/hands/)

### データ保存
- **Dexie.js**: IndexedDBラッパー
- ブラウザローカルにデータを保存 (サーバー不要)

### PWA対応
- オフラインでも動作
- インストール可能なWebアプリ

---

## 実装の特徴

### クリーンアーキテクチャ採用
```
src/
├── core/
│   ├── domain/          # ビジネスロジック・型定義
│   ├── application/     # ユースケース
│   └── infrastructure/  # 外部ライブラリとの接続
├── lib/                 # ライブラリ層
└── components/          # UI層
```

### コアモジュール

#### AngleCalculator ([angle-calculator.ts](src/core/infrastructure/mediapipe/angle-calculator.ts))
角度計算のコアロジック:
- `calculateAngle3Points()`: 3点から角度を計算
- `calculatePalmarFlexion()`: 掌屈角度
- `calculateDorsalFlexion()`: 背屈角度
- `calculateRadialUlnarDeviation()`: 尺屈・橈屈角度
- `calculateWristAngles()`: 全方向の角度をまとめて計算

#### MeasurementService ([measurement-service.ts](src/lib/mediapipe/measurement-service.ts))
測定セッションの管理:
- HandDetectorとPoseDetectorを統合
- 10秒間のサンプリング
- 平均値と標準偏差の計算

---

## よくある質問 (想定Q&A)

### Q1: 角度の精度はどのくらい?
**A:** MediaPipeの検出精度に依存しますが、以下の条件下で±5度程度の誤差:
- 良好な照明環境
- カメラから30-50cm程度の距離
- 手が画面中央にある
- 信頼度スコア0.8以上

### Q2: なぜカメラが必要なの?
**A:** MediaPipeは画像認識AIのため、カメラ映像から手の形を検出します。特別なセンサーは不要で、一般的なWebカメラで動作します。

### Q3: データはどこに保存される?
**A:** ブラウザのIndexedDB(ローカルストレージ)に保存されます。サーバーには送信されず、プライバシーが守られます。

### Q4: オフラインでも使える?
**A:** 初回アクセス時にMediaPipeモデルをキャッシュすれば、その後はオフラインでも動作します(PWA対応)。

### Q5: スマホでも使える?
**A:** はい。レスポンシブデザインで、スマホのブラウザでも動作します。ただしPCの方が画面が大きく使いやすいです。

### Q6: 医療機器として使える?
**A:** いいえ。このアプリは**教育・参考目的**であり、医療機器認証を受けていません。正式な診断には医療機関を受診してください。

### Q7: なぜ小指側からカメラを配置するの?
**A:** 掌屈・背屈の動きが最も見やすい角度だからです。この配置により、Y座標の変化で正確に前後の曲げを検出できます。

### Q8: 他の部位も測定できる?
**A:** 技術的には可能です。MediaPipe Poseを組み込めば肩・肘・膝なども測定できます。現在は手首に特化していますが、拡張性のあるアーキテクチャを採用しているため、将来的な対応も視野に入れています。

---

## デモ用説明スクリプト

### 30秒版
「このアプリは、GoogleのMediaPipe AIを使って、ブラウザ上で手首の可動域を測定できます。カメラで手を映すだけで、AIが21個のポイントを3D座標として検出し、そこから数学的にベクトルと角度を計算します。特別な装置は不要で、スマホやPCのカメラだけで使えます。」

### 1分版
「手首のリハビリでは、可動域の記録が重要ですが、従来は分度器で手作業で測定していました。このアプリなら、カメラに手をかざすだけで自動測定できます。

仕組みは、GoogleのMediaPipe AIが手を21個の3D座標点として認識し、そのポイント間のベクトルを計算。内積や外積といった数学的手法で角度を算出します。例えば掌屈の場合、手首と指の付け根のY座標の差から、arctan2という関数で角度を求めています。

測定データはブラウザに保存され、グラフで経過を確認できます。オフラインでも動作するPWAで、プライバシーも守られます。」

### 技術者向け詳細版
「MediaPipe Handsで手のランドマーク21点を検出し、3D座標(X,Y,Z)を取得します。

角度計算は、2点間のベクトルから内積を使ってcosθを求め、arccosで角度に変換。掌屈・背屈はY座標差とX方向距離からarctan2で算出しています。

精度向上のため、外積で手のひらの法線ベクトルを計算。信頼度スコアをベクトル長から算出し、移動平均で平滑化しています。Z座標はベクトルの大きさ計算に使用します。

アーキテクチャはクリーンアーキテクチャで、ドメイン層・アプリケーション層・インフラ層を分離。データはDexieでIndexedDBに保存し、Next.jsとJotaiで状態管理しています。」

---

## 参考リンク

- [MediaPipe公式](https://developers.google.com/mediapipe)
- [MediaPipe Hands ガイド](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
- [ベクトルの内積と角度](https://ja.wikipedia.org/wiki/%E5%86%85%E7%A9%8D)

---

**このドキュメントは展示時の技術質問対応用です。自由に参照・編集してください。**
