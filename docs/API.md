# API 仕様書

## 概要

AI駆動手首・母指可動域リハビリテーションアプリのREST API仕様書です。
本APIは、測定データの永続化、進捗管理、カレンダー機能をサポートし、
将来的な医療機器認証に対応した設計になっています。

## API 設計思想

- **RESTful設計**: HTTP メソッドとステータスコードを適切に使用
- **スキーマ駆動**: OpenAPI 3.0 準拠の明確な仕様定義
- **医療データ対応**: FHIR R4 準拠のデータモデルを部分採用
- **プライバシー重視**: 個人情報の最小化とローカルファースト設計
- **PWA 対応**: オフライン機能とキャッシュ戦略

## ベースURL・環境設定

### 環境別エンドポイント

| 環境        | ベースURL                                  | 用途           |
| ----------- | ------------------------------------------ | -------------- |
| Local       | `http://localhost:3000/api`                | ローカル開発   |
| Development | `https://dev-rehab-app.vercel.app/api`     | 開発版テスト   |
| Staging     | `https://staging-rehab-app.vercel.app/api` | QA・受入テスト |
| Production  | `https://rehab-app.com/api`                | 本番運用       |

### APIバージョニング

```
https://rehab-app.com/api/v1/measurements
```

- **v1**: 初期版（現在）
- **v2**: 医療機器認証対応版（予定）

## 認証・セキュリティ

### 現在の実装

```typescript
// ローカルファースト設計
// 認証不要（クライアントサイドで完結）
const userId = generateLocalUserId(); // UUID v4
```

### 将来の認証設計

```typescript
// JWTトークンベース認証（医療機器認証版）
interface AuthToken {
  sub: string;           // ユーザーID
  iat: number;          // 発行時刻
  exp: number;          // 有効期限
  scope: string[];      // 権限スコープ
  medical_id?: string;  // 医療機関ID
}

// APIヘッダー例
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### データ暗号化

- **転送時**: HTTPS/TLS 1.3
- **保存時**: IndexedDB内のAES-256暗号化
- **バックアップ**: ユーザー制御の暗号化エクスポート

## 共通レスポンス形式

### 成功レスポンス

```json
{
  "success": true,
  "data": any,
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "requestId": "req_1234567890"
  },
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasNext": true
  }
}
```

### エラーレスポンス

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力データが無効です",
    "details": "angleValue must be between 0 and 90",
    "field": "angleValue"
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "requestId": "req_1234567890",
    "path": "/api/v1/measurements"
  }
}
```

### HTTPステータスコード

| コード | 意味           | 使用例                 |
| ------ | -------------- | ---------------------- |
| 200    | 成功           | データ取得・更新成功   |
| 201    | 作成成功       | 新規測定データ作成     |
| 400    | 不正リクエスト | バリデーションエラー   |
| 401    | 認証エラー     | トークン無効・期限切れ |
| 403    | 権限エラー     | アクセス権限なし       |
| 404    | 未発見         | リソースが存在しない   |
| 422    | 処理不可能     | ビジネスロジックエラー |
| 500    | サーバーエラー | 内部処理エラー         |

## API エンドポイント

### 測定データ管理

#### GET /api/measurements

測定データの一覧を取得します。

**クエリパラメータ**

| パラメータ  | 型     | 必須 | 説明                       | デフォルト |
| ----------- | ------ | ---- | -------------------------- | ---------- |
| `userId`    | string | No   | ユーザーID                 | -          |
| `startDate` | string | No   | 開始日 (ISO 8601)          | 1ヶ月前    |
| `endDate`   | string | No   | 終了日 (ISO 8601)          | 現在       |
| `hand`      | string | No   | 手の種類 (`left`, `right`) | -          |
| `limit`     | number | No   | 取得件数制限               | 50         |
| `offset`    | number | No   | オフセット                 | 0          |

**レスポンス例**

```json
{
  "success": true,
  "data": [
    {
      "id": "measurement_01HKQB9X5J8Y9K2M3P4Q5R6S7T",
      "userId": "user_01HKQB9X5J8Y9K2M3P4Q5R6S7T",
      "measurementDate": "2025-01-15T10:30:00.000Z",
      "hand": "right",
      "angleValue": 78.5,
      "accuracy": 0.95,
      "stepId": "palmar-flexion"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "hasNext": false
  }
}
```

#### POST /api/measurements

新しい測定データを作成します。

**リクエストボディ**

```json
{
  "userId": "user_01HKQB9X5J8Y9K2M3P4Q5R6S7T",
  "hand": "right",
  "stepId": "palmar-flexion",
  "angleValue": 78.5,
  "handLandmarks": [
    {
      "id": 0,
      "x": 0.5234,
      "y": 0.6123,
      "z": 0.0145,
      "visibility": 0.98
    }
  ],
  "accuracy": 0.95
}
```

#### GET /api/measurements/:id

特定の測定データを取得します。

**パスパラメータ**

- `id`: 測定データの一意識別子#### GET /api/v1/measurements/sessions/:sessionId

特定のセッション情報を取得します。

**パスパラメータ**

- `sessionId`: セッションの一意識別子

**レスポンス例**

```json
{
  "success": true,
  "data": {
    "sessionId": "session_01HKQB9X5J8Y9K2M3P4Q5R6S7T",
    "userId": "user_01HKQB9X5J8Y9K2M3P4Q5R6S7T",
    "hand": "right",
    "startTime": "2025-01-15T10:30:00.000Z",
    "endTime": "2025-01-15T10:45:00.000Z",
    "status": "completed",
    "totalSteps": 4,
    "completedSteps": 4,
    "results": [
      {
        "stepId": "palmar-flexion",
        "stepName": "掌屈",
        "measurementValue": 78,
        "targetAngle": 90,
        "achievement": 86.7,
        "accuracy": 0.95,
        "timestamp": "2025-01-15T10:32:15.000Z"
      }
    ]
  }
}
```

### 測定結果保存

#### POST /api/v1/measurements/results

測定結果を保存します。

**リクエストボディ**

```json
{
  "sessionId": "session_01HKQB9X5J8Y9K2M3P4Q5R6S7T",
  "stepId": "palmar-flexion",
  "measurementData": {
    "angleValue": 78.5,
    "targetAngle": 90,
    "handLandmarks": [
      {
        "id": 0,
        "x": 0.5234,
        "y": 0.6123,
        "z": 0.0145,
        "visibility": 0.98
      }
    ],
    "mediapipeMetadata": {
      "modelVersion": "0.4.1675469240",
      "detectionConfidence": 0.89,
      "trackingConfidence": 0.92
    }
  },
  "qualityMetrics": {
    "handVisibility": 0.95,
    "landmarkStability": 0.88,
    "cameraNoise": 0.12
  }
}
```

**レスポンス例**

```json
{
  "success": true,
  "data": {
    "resultId": "result_01HKQB9X5J8Y9K2M3P4Q5R6S7T",
    "sessionId": "session_01HKQB9X5J8Y9K2M3P4Q5R6S7T",
    "stepId": "palmar-flexion",
    "angleValue": 78.5,
    "targetAngle": 90,
    "achievement": 87.2,
    "accuracy": 0.95,
    "timestamp": "2025-01-15T10:32:15.000Z",
    "isValid": true
  }
}
```

### 測定データ検索

#### GET /api/v1/measurements

測定データの一覧を取得します。

**クエリパラメータ**

| パラメータ  | 型     | 必須 | 説明                               | デフォルト  |
| ----------- | ------ | ---- | ---------------------------------- | ----------- |
| `userId`    | string | No   | ユーザーID                         | -           |
| `startDate` | string | No   | 開始日 (ISO 8601)                  | 1ヶ月前     |
| `endDate`   | string | No   | 終了日 (ISO 8601)                  | 現在        |
| `hand`      | string | No   | 手の種類 (`left`, `right`)         | -           |
| `stepId`    | string | No   | 測定ステップID                     | -           |
| `limit`     | number | No   | 取得件数制限                       | 50          |
| `offset`    | number | No   | オフセット                         | 0           |
| `sort`      | string | No   | ソート順 (`date_desc`, `date_asc`) | `date_desc` |

**レスポンス例**

````json
{
  "success": true,
  "data": [
    {
      "sessionId": "session_01HKQB9X5J8Y9K2M3P4Q5R6S7T",
      "userId": "user_01HKQB9X5J8Y9K2M3P4Q5R6S7T",
      "measurementDate": "2025-01-15T10:30:00.000Z",
      "hand": "right",
      "totalSteps": 4,
      "completedSteps": 4,
      "averageAngle": 72.3,
      "overallAchievement": 84.5,
      "duration": 15.5,
### 進捗管理

#### GET /api/progress/:id

ユーザーの進捗データを取得します。

**パスパラメータ**
- `id`: ユーザーの一意識別子

**クエリパラメータ**
- `period`: 期間 (`week`, `month`, `year`) デフォルト: `month`
- `hand`: 手の種類 (`left`, `right`, `both`) デフォルト: `both`

### カレンダー機能

#### GET /api/calendar

カレンダー表示用のデータを取得します。

**クエリパラメータ**
- `userId`: ユーザーの一意識別子
- `year`: 年 (YYYY形式)
- `month`: 月 (1-12)

#### POST /api/calendar

カレンダーのメモを保存します。

**リクエストボディ**

```json
{
  "userId": "user_01HKQB9X5J8Y9K2M3P4Q5R6S7T",
  "date": "2025-01-15",
  "memo": "右手の調子が良い。痛みなし。"
}
````

### カレンダー機能

#### GET /api/v1/calendar/:userId

カレンダー表示用のデータを取得します。

**パスパラメータ**

- `userId`: ユーザーの一意識別子

**クエリパラメータ**

- `year`: 年 (YYYY形式)
- `month`: 月 (1-12)

**レスポンス例**

```json
{
  "success": true,
  "data": {
    "year": 2025,
    "month": 1,
    "days": [
      {
        "date": "2025-01-15",
        "hasMeasurement": true,
        "sessionCount": 2,
        "averageAchievement": 82.5,
        "completedSteps": 8,
        "totalSteps": 8,
        "memo": "朝と夜に測定実施"
      },
      {
        "date": "2025-01-16",
        "hasMeasurement": false,
        "sessionCount": 0,
        "memo": null
      }
    ],
    "summary": {
      "totalSessions": 15,
      "activeDays": 8,
      "streak": 3,
      "monthlyGoal": 20,
      "progress": 75.0
    }
  }
}
```

#### POST /api/v1/calendar/:userId/memo

カレンダーのメモを保存します。

**パスパラメータ**

- `userId`: ユーザーの一意識別子

**リクエストボディ**

```json
{
  "date": "2025-01-15",
  "memo": "右手の調子が良い。痛みなし。"
}
```

**レスポンス例**

```json
{
  "success": true,
  "data": {
    "userId": "user_01HKQB9X5J8Y9K2M3P4Q5R6S7T",
    "date": "2025-01-15",
    "memo": "右手の調子が良い。痛みなし。",
    "updatedAt": "2025-01-15T14:30:00.000Z"
  }
}
```

### システム情報

#### GET /api/v1/health

システムヘルスチェック用エンドポイント。

**レスポンス例**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "version": "1.0.0",
    "uptime": 86400,
    "services": {
      "database": "healthy",
      "mediapipe": "healthy",
      "storage": "healthy"
    }
  }
}
```

#### GET /api/v1/config

クライアント設定情報を取得します。

**レスポンス例**

```json
{
  "success": true,
  "data": {
    "mediapipe": {
      "version": "0.4.1675469240",
      "cdnUrl": "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240",
      "modelComplexity": 1,
      "minDetectionConfidence": 0.5,
      "minTrackingConfidence": 0.5
    },
    "measurement": {
      "targetAngles": {
        "palmarFlexion": 90,
        "dorsalFlexion": 70,
        "ulnarDeviation": 45,
        "radialDeviation": 45
      },
      "validationRules": {
        "minAngle": 0,
        "maxAngle": 90,
        "accuracyThreshold": 0.8
      }
    },
    "features": {
      "offlineMode": true,
      "dataExport": true,
      "multiUser": false
    }
  }
}
```

```
      "handUsed": "right",
      "measurementType": "wrist-flexion",
      "angleValue": 45.5,
      "accuracy": 0.95,
      "landmarks": [
        { "x": 0.1, "y": 0.2, "z": 0.0 },
        ...
      ],
      "metadata": {
        "deviceInfo": "iPhone 13",
        "appVersion": "1.0.0",
        "sessionDuration": 30000
      },
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

#### POST /api/measurements

## データモデル仕様

### MeasurementSession （測定セッション）

```typescript
interface MeasurementSession {
  sessionId: string; // ULID形式の一意識別子
  userId: string; // ユーザーID（UUID v4）
  hand: 'left' | 'right'; // 測定対象の手
  startTime: string; // 開始時刻（ISO 8601）
  endTime?: string; // 終了時刻（ISO 8601）
  status: 'active' | 'completed' | 'cancelled';
  totalSteps: number; // 総ステップ数（4固定）
  completedSteps: number; // 完了ステップ数
  deviceInfo?: DeviceInfo; // デバイス情報
  metadata?: SessionMetadata; // メタデータ
}
```

### MeasurementResult （測定結果）

```typescript
interface MeasurementResult {
  resultId: string; // 結果ID（ULID）
  sessionId: string; // セッションID
  stepId: StepId; // ステップ識別子
  stepName: string; // ステップ名（日本語）
  angleValue: number; // 測定角度値（0-90度）
  targetAngle: number; // 目標角度値
  achievement: number; // 達成率（%）
  accuracy: number; // 測定精度（0-1）
  timestamp: string; // 測定時刻（ISO 8601）
  handLandmarks: Point3D[]; // MediaPipe手ランドマーク
  qualityMetrics: QualityMetrics; // 品質指標
  isValid: boolean; // データ有効性
}
```

### Point3D （3次元座標）

```typescript
interface Point3D {
  id: number; // ランドマークID（0-20）
  x: number; // X座標（正規化 0-1）
  y: number; // Y座標（正規化 0-1）
  z: number; // Z座標（相対深度）
  visibility: number; // 可視性スコア（0-1）
}
```

### StepId （測定ステップ）

```typescript
type StepId =
  | 'palmar-flexion' // 掌屈
  | 'dorsal-flexion' // 背屈
  | 'ulnar-deviation' // 尺屈
  | 'radial-deviation'; // 橈屈
```

### QualityMetrics （品質指標）

```typescript
interface QualityMetrics {
  handVisibility: number; // 手の可視性（0-1）
  landmarkStability: number; // ランドマーク安定性（0-1）
  cameraNoise: number; // カメラノイズレベル（0-1）
  lightingCondition: number; // 照明条件（0-1）
  motionBlur: number; // モーションブラー（0-1）
}
```

### DeviceInfo （デバイス情報）

```typescript
interface DeviceInfo {
  camera: string; // カメラ名
  browser: string; // ブラウザ情報
  os: string; // OS情報
  screenResolution: string; // 画面解像度
  userAgent: string; // ユーザーエージェント
}
```

- `id` (string, required): 測定データID

**レスポンス例**

```json
{
  "success": true,
  "data": {
    "id": "measurement-123",
    "userId": "user-456",
    "measurementDate": "2025-01-15T10:30:00.000Z",
    "handUsed": "right",
    "measurementType": "wrist-flexion",
    "angleValue": 45.5,
    "accuracy": 0.95,
    "landmarks": [...],
    "metadata": {...},
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

#### PUT /api/measurements/{id}

測定データを更新します。

**パラメータ**

- `id` (string, required): 測定データID

**リクエストボディ**

```json
{
  "angleValue": 50.2,
  "accuracy": 0.98,
  "metadata": {
    "note": "修正値"
  }
}
```

#### DELETE /api/measurements/{id}

測定データを削除します。

**パラメータ**

- `id` (string, required): 測定データID

**レスポンス例**

```json
{
  "success": true,
  "message": "Measurement deleted successfully"
}
```

### カレンダー記録（Calendar Records）

#### GET /api/calendar

カレンダー記録の一覧を取得します。

**パラメータ**

- `userId` (string, optional): ユーザーID
- `year` (number, optional): 年
- `month` (number, optional): 月 (1-12)
- `startDate` (string, optional): 開始日
- `endDate` (string, optional): 終了日

**レスポンス例**

```json
{
  "success": true,
  "data": [
    {
      "id": "record-123",
      "userId": "user-456",
      "recordDate": "2025-01-15",
      "rehabCompleted": true,
      "measurementCompleted": false,
      "painLevel": 3,
      "motivationLevel": 4,
      "performanceLevel": 2,
      "notes": "今日は調子が良かった",
      "createdAt": "2025-01-15T10:30:00.000Z",
      "updatedAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

#### POST /api/calendar

新しいカレンダー記録を作成します。

**リクエストボディ**

```json
{
  "userId": "user-456",
  "recordDate": "2025-01-15",
  "rehabCompleted": true,
  "measurementCompleted": false,
  "painLevel": 3,
  "motivationLevel": 4,
  "performanceLevel": 2,
  "notes": "今日は調子が良かった"
}
```

#### GET /api/calendar/{id}

特定のカレンダー記録を取得します。

#### PUT /api/calendar/{id}

カレンダー記録を更新します。

#### DELETE /api/calendar/{id}

カレンダー記録を削除します。

### 統計データ（Statistics）

#### GET /api/statistics/measurements

測定データの統計情報を取得します。

**パラメータ**

- `userId` (string, optional): ユーザーID
- `period` (string, optional): 期間 ("week", "month", "year")
- `measurementType` (string, optional): 測定タイプ

**レスポンス例**

```json
{
  "success": true,
  "data": {
    "totalMeasurements": 150,
    "averageAngle": 42.3,
    "maxAngle": 65.2,
    "minAngle": 25.1,
    "averageAccuracy": 0.92,
    "improvementTrend": "increasing",
    "weeklyProgress": [
      {
        "week": "2025-W02",
        "averageAngle": 40.1,
        "measurementCount": 7
      }
    ],
    "measurementTypeDistribution": {
      "wrist-flexion": 45,
      "wrist-extension": 35,
      "thumb-abduction": 40,
      "thumb-adduction": 30
    }
  }
}
```

#### GET /api/statistics/calendar

カレンダー記録の統計情報を取得します。

**レスポンス例**

```json
{
  "success": true,
  "data": {
    "totalRecords": 30,
    "rehabCompletionRate": 0.8,
    "measurementCompletionRate": 0.75,
    "averagePainLevel": 2.1,
    "averageMotivationLevel": 3.8,
    "averagePerformanceLevel": 3.2,
    "streakData": {
      "currentStreak": 5,
      "longestStreak": 12,
      "totalDays": 30
    },
    "monthlyTrends": [
      {
        "month": "2025-01",
        "rehabDays": 25,
        "measurementDays": 20,
        "averagePain": 2.1
      }
    ]
  }
}
```

### ユーザー管理（Users）

#### GET /api/users/{id}

ユーザー情報を取得します。

**レスポンス例**

```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "田中太郎",
    "age": 35,
    "gender": "male",
    "handDominance": "right",
    "medicalConditions": ["arthritis"],
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

#### PUT /api/users/{id}

ユーザー情報を更新します。

#### POST /api/users

新しいユーザーを作成します。

### ヘルスチェック

#### GET /api/health

APIの稼働状況を確認します。

**レスポンス例**

```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "mediapipe": "healthy"
  }
}
```

### データエクスポート

#### GET /api/export/measurements

測定データをエクスポートします。

**パラメータ**

- `userId` (string, required): ユーザーID
- `format` (string, optional): エクスポート形式 ("json", "csv") - デフォルト: "json"
- `startDate` (string, optional): 開始日
- `endDate` (string, optional): 終了日

**レスポンス例 (JSON)**

```json
{
  "success": true,
  "data": {
    "exportInfo": {
      "exportDate": "2025-01-15T10:30:00.000Z",
      "totalRecords": 150,
      "dateRange": {
        "start": "2025-01-01",
        "end": "2025-01-15"
      }
    },
    "measurements": [...]
  }
}
```

#### GET /api/export/calendar

カレンダー記録をエクスポートします。

### プッシュ通知

#### POST /api/push/subscribe

プッシュ通知の購読を登録します。

**リクエストボディ**

```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  },
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

#### POST /api/push/unsubscribe

プッシュ通知の購読を解除します。

#### POST /api/push/send

プッシュ通知を送信します（管理者用）。

## データモデル

### Measurement（測定データ）

```typescript
interface Measurement {
  id: string;
  userId: string;
  measurementDate: Date;
  handUsed: 'left' | 'right';
  measurementType:
    | 'wrist-flexion'
    | 'wrist-extension'
    | 'thumb-abduction'
    | 'thumb-adduction';
  angleValue: number; // 0-180度
  accuracy: number; // 0-1
  landmarks?: Array<{ x: number; y: number; z: number }>; // MediaPipeランドマーク
  metadata?: {
    deviceInfo?: string;
    appVersion?: string;
    sessionDuration?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### CalendarRecord（カレンダー記録）

```typescript
interface CalendarRecord {
  id: string;
  userId: string;
  recordDate: Date;
  rehabCompleted: boolean;
  measurementCompleted: boolean;
  painLevel?: 1 | 2 | 3 | 4 | 5;
  motivationLevel?: 1 | 2 | 3 | 4 | 5;
  performanceLevel?: 1 | 2 | 3 | 4 | 5;
  notes?: string; // 最大500文字
  createdAt: Date;
  updatedAt: Date;
}
```

### User（ユーザー）

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  handDominance?: 'left' | 'right';
  medicalConditions?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

## HTTPステータスコード

- `200 OK`: 成功
- `201 Created`: 作成成功
- `400 Bad Request`: リクエストエラー
- `401 Unauthorized`: 認証エラー
- `403 Forbidden`: 権限エラー
- `404 Not Found`: リソースが見つからない
- `422 Unprocessable Entity`: バリデーションエラー
- `500 Internal Server Error`: サーバーエラー
- `503 Service Unavailable`: サービス利用不可

## レート制限

現在のバージョンではレート制限は実装されていませんが、将来的には以下の制限を予定しています：

- 一般的なAPIエンドポイント: 100リクエスト/分
- 測定データ作成: 10リクエスト/分
- エクスポート: 5リクエスト/時

## WebSocket API

リアルタイム測定データの配信用WebSocket APIを提供予定です。

### 接続エンドポイント

```
wss://your-domain.com/api/ws/measurements
```

### メッセージ形式

**測定開始**

```json
{
  "type": "start_measurement",
  "data": {
    "userId": "user-123",
    "measurementType": "wrist-flexion"
  }
}
```

**リアルタイム測定データ**

```json
{
  "type": "measurement_data",
  "data": {
    "angleValue": 45.2,
    "accuracy": 0.92,
    "landmarks": [...],
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
}
```

## SDK

公式のJavaScript/TypeScript SDKを提供予定です。

```typescript
import { RehabAIClient } from '@rehab-ai/sdk';

const client = new RehabAIClient({
  baseUrl: 'https://your-domain.com/api',
  apiKey: 'your-api-key',
});

// 測定データ取得
const measurements = await client.measurements.list({
  userId: 'user-123',
  limit: 10,
});

// 新しい測定データ作成
const newMeasurement = await client.measurements.create({
  userId: 'user-123',
  angleValue: 45.5,
  // ...
});
```

## バージョニング

APIのバージョニングはURLパスで管理します：

- `/api/v1/measurements` (現在のバージョン)
- `/api/v2/measurements` (将来のバージョン)

現在は`/api/`が`/api/v1/`のエイリアスとして機能しています。

## サポート

- GitHub Issues: https://github.com/your-org/rehab-ai/issues
- Email: api-support@your-domain.com
- ドキュメント: https://docs.your-domain.com
