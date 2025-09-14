# API ドキュメント

## 概要

AI駆動手首・母指可動域リハビリテーションアプリのAPI仕様書です。

## ベースURL

```
https://your-domain.com/api
```

## 認証

現在のバージョンでは認証は実装されていませんが、将来的にはJWTトークンベースの認証を予定しています。

## エラーレスポンス

すべてのAPIエンドポイントは、エラー時に以下の形式でレスポンスを返します：

```json
{
  "error": "エラーメッセージ",
  "code": "ERROR_CODE",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "path": "/api/endpoint"
}
```

## エンドポイント

### 測定データ（Measurements）

#### GET /api/measurements

測定データの一覧を取得します。

**パラメータ**
- `userId` (string, optional): ユーザーID
- `startDate` (string, optional): 開始日 (ISO 8601形式)
- `endDate` (string, optional): 終了日 (ISO 8601形式)
- `measurementType` (string, optional): 測定タイプ
- `limit` (number, optional): 取得件数制限 (デフォルト: 50)
- `offset` (number, optional): オフセット (デフォルト: 0)

**レスポンス例**
```json
{
  "success": true,
  "data": [
    {
      "id": "measurement-123",
      "userId": "user-456",
      "measurementDate": "2025-01-15T10:30:00.000Z",
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

新しい測定データを作成します。

**リクエストボディ**
```json
{
  "userId": "user-456",
  "measurementDate": "2025-01-15T10:30:00.000Z",
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
  }
}
```

**レスポンス例**
```json
{
  "success": true,
  "data": {
    "id": "measurement-789",
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

#### GET /api/measurements/{id}

特定の測定データを取得します。

**パラメータ**
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
  measurementType: 'wrist-flexion' | 'wrist-extension' | 'thumb-abduction' | 'thumb-adduction';
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
  apiKey: 'your-api-key'
});

// 測定データ取得
const measurements = await client.measurements.list({
  userId: 'user-123',
  limit: 10
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
