<!-- @format -->

# Data Model: AI 駆動手首・母指可動域リハビリテーションアプリ

## Core Entities

### User

患者の基本情報と設定

```typescript
interface User {
  id: string; // UUID
  name: string; // 患者名
  rehabStartDate: Date; // リハビリ開始日
  currentSymptomLevel: 1 | 2 | 3 | 4 | 5; // 症状レベル(1=軽微, 5=重症)
  preferredHand: "left" | "right"; // 主測定手
  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Rules:**

- name: 1-50 文字、空文字不可
- rehabStartDate: 未来日不可
- currentSymptomLevel: 1-5 の整数のみ

### MotionMeasurement

可動域測定の個別記録

```typescript
interface MotionMeasurement {
  id: string; // UUID
  userId: string; // User.id参照
  measurementDate: Date; // 測定日時

  // 手首可動域 (degrees)
  wristFlexion: number; // 掌屈 0-90°
  wristExtension: number; // 背屈 0-70°
  wristUlnarDeviation: number; // 尺屈 0-55°
  wristRadialDeviation: number; // 橈屈 0-25°

  // 母指可動域 (degrees)
  thumbFlexion: number; // 屈曲 0-90°
  thumbExtension: number; // 伸展 0°(基準)
  thumbAdduction: number; // 内転 0°(基準)
  thumbAbduction: number; // 外転 0-60°

  // 測定メタデータ
  accuracyScore: number; // 測定精度スコア 0-1
  handUsed: "left" | "right"; // 測定対象手

  // 正常範囲比較結果
  comparisonResult: MotionComparisonResult;

  createdAt: Date;
}

interface MotionComparisonResult {
  wristFlexion: ComparisonStatus;
  wristExtension: ComparisonStatus;
  wristUlnarDeviation: ComparisonStatus;
  wristRadialDeviation: ComparisonStatus;
  thumbFlexion: ComparisonStatus;
  thumbExtension: ComparisonStatus;
  thumbAdduction: ComparisonStatus;
  thumbAbduction: ComparisonStatus;
  overallStatus: "normal" | "below_normal" | "above_normal";
}

type ComparisonStatus =
  | { status: "normal"; within_range: true }
  | { status: "below_normal"; deficit_degrees: number }
  | { status: "above_normal"; excess_degrees: number };
```

**Validation Rules:**

- 全角度値: 0 以上、各関節の最大正常値以下
- accuracyScore: 0-1 の範囲
- measurementDate: 未来日不可

### CalendarRecord

日記形式の記録エントリ

```typescript
interface CalendarRecord {
  id: string; // UUID
  userId: string; // User.id参照
  recordDate: Date; // 記録日（日付のみ、時刻なし）

  // 測定実施情報
  measurementCompleted: boolean; // 測定実施フラグ
  measurementId?: string; // MotionMeasurement.id参照（測定実施時）

  // ユーザーメモ
  physicalConditionNote?: string; // 体調メモ (最大500文字)
  moodNote?: string; // 気分メモ (最大300文字)
  rehabNote?: string; // リハビリメモ (最大500文字)

  createdAt: Date;
  updatedAt: Date;
}
```

**Validation Rules:**

- recordDate: ユニーク制約（ユーザー毎に 1 日 1 記録）
- 各 Note: 指定文字数以下、HTML タグ不可
- measurementCompleted=true の場合、measurementId 必須

### ProgressData

統計・進捗データ（計算値キャッシュ）

```typescript
interface ProgressData {
  id: string; // UUID
  userId: string; // User.id参照
  calculatedDate: Date; // 計算実施日

  // 期間統計
  weeklyStats: WeeklyProgressStats;
  monthlyStats: MonthlyProgressStats;

  // 回復率計算
  recoveryRate: RecoveryRateData;

  // 予測データ
  predictedRecovery: PredictionData;

  createdAt: Date;
}

interface WeeklyProgressStats {
  week_start: Date;
  measurement_count: number;
  average_accuracy: number;
  improvement_trend: "improving" | "stable" | "declining";
}

interface MonthlyProgressStats {
  month: string; // 'YYYY-MM' format
  measurement_count: number;
  compliance_rate: number; // 測定実施率 0-1
  average_progress: number; // 正常値に対する平均達成率
}

interface RecoveryRateData {
  overall_recovery_percentage: number; // 全体回復率 0-100
  per_joint_recovery: {
    wrist_flexion: number;
    wrist_extension: number;
    wrist_ulnar: number;
    wrist_radial: number;
    thumb_flexion: number;
    thumb_abduction: number;
  };
}

interface PredictionData {
  estimated_full_recovery_date?: Date; // 完全回復予測日
  confidence_level: number; // 予測信頼度 0-1
  next_milestone_target: {
    joint: string;
    target_angle: number;
    estimated_achievement_date: Date;
  };
}
```

## Data Relationships

```
User (1) ←→ (N) MotionMeasurement
User (1) ←→ (N) CalendarRecord
User (1) ←→ (N) ProgressData
CalendarRecord (1) ←→ (0..1) MotionMeasurement
```

## Normal Range Constants

```typescript
const NORMAL_RANGES = {
  wrist: {
    flexion: { min: 0, max: 90 }, // 掌屈
    extension: { min: 0, max: 70 }, // 背屈
    ulnarDeviation: { min: 0, max: 55 }, // 尺屈
    radialDeviation: { min: 0, max: 25 }, // 橈屈
  },
  thumb: {
    flexion: { min: 0, max: 90 }, // 屈曲
    extension: { min: 0, max: 0 }, // 伸展（基準位置）
    adduction: { min: 0, max: 0 }, // 内転（基準位置）
    abduction: { min: 0, max: 60 }, // 外転
  },
} as const;

const MEASUREMENT_PRECISION_THRESHOLD = 5; // ±5°
```

## State Transitions

### MotionMeasurement Lifecycle

1. **MEASURING**: カメラ測定中
2. **PROCESSING**: 角度計算・検証中
3. **COMPLETED**: 測定完了・保存済み
4. **ARCHIVED**: 古い記録（90 日以上経過）

### CalendarRecord Updates

- 日次作成: recordDate ベースで upsert
- 測定完了時: measurementCompleted=true, measurementId 設定
- メモ更新: いつでも可能、updatedAt 更新

## IndexedDB Schema

```typescript
// Dexie.js schema definition
class RehabDatabase extends Dexie {
  users!: Table<User>;
  motionMeasurements!: Table<MotionMeasurement>;
  calendarRecords!: Table<CalendarRecord>;
  progressData!: Table<ProgressData>;

  constructor() {
    super("RehabDatabase");
    this.version(1).stores({
      users: "id, name, rehabStartDate",
      motionMeasurements: "id, userId, measurementDate, handUsed",
      calendarRecords: "id, userId, recordDate, measurementCompleted",
      progressData: "id, userId, calculatedDate",
    });
  }
}
```
