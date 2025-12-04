# 実装アーキテクチャ・設計パターン詳細

## 🏗️ アーキテクチャ設計思想

### 1. レイヤードアーキテクチャ
```
┌─────────────────────────────────────────┐
│         Presentation Layer              │ ← React Components + CSS Modules
├─────────────────────────────────────────┤
│         Application Layer               │ ← Custom Hooks + Jotai Atoms
├─────────────────────────────────────────┤
│         Domain Layer                    │ ← Business Logic + Types
├─────────────────────────────────────────┤
│         Infrastructure Layer            │ ← MediaPipe + IndexedDB + Canvas
└─────────────────────────────────────────┘
```

### 2. モジュラーモノリス設計
```typescript
// lib/ 構造による機能分離
src/lib/
├── mediapipe/           // AI統合レイヤー
│   ├── hand-detector.ts
│   ├── angle-calculator.ts
│   └── pose-analyzer.ts
├── motion-capture/      // ドメインロジックレイヤー
│   ├── measurement-session.ts
│   ├── calibration.ts
│   └── validation.ts
├── data-manager/        // データアクセスレイヤー
│   ├── measurement-storage.ts
│   ├── user-preferences.ts
│   └── analytics.ts
└── integrations/        // 外部統合レイヤー
    ├── camera-integration.ts
    └── export-service.ts
```

## 🧠 AI統合・MediaPipe実装詳細

### 1. HandDetector クラス設計
```typescript
class HandDetector {
  private hands: Hands;
  private isInitialized: boolean = false;
  private confidenceThreshold: number = 0.7;

  async initialize(): Promise<void> {
    this.hands = new Hands({
      locateFile: (file) => 
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    this.hands.setOptions({
      maxNumHands: 1,                     // 1つの手のみ処理
      modelComplexity: 1,                 // 精度重視
      minDetectionConfidence: 0.5,        // 検出閾値
      minTrackingConfidence: 0.5,         // 追跡閾値
    });

    this.hands.onResults(this.processResults.bind(this));
    this.isInitialized = true;
  }

  private processResults(results: Results): HandLandmarks | null {
    if (!results.multiHandLandmarks?.[0]) return null;
    
    const landmarks = results.multiHandLandmarks[0];
    const confidence = this.calculateConfidence(landmarks);
    
    if (confidence < this.confidenceThreshold) return null;
    
    return this.transformLandmarks(landmarks);
  }
}
```

### 2. 角度計算アルゴリズム実装
```typescript
class AngleCalculator {
  // 手首掌屈・背屈角度計算
  calculateWristFlexionExtension(landmarks: HandLandmarks): number {
    const wrist = landmarks[0];      // 手首
    const middleMcp = landmarks[9];  // 中指基部
    const middleTip = landmarks[12]; // 中指先端
    
    return this.calculateAngle3Points(middleTip, middleMcp, wrist);
  }

  // 手首尺屈・橈屈角度計算
  calculateWristDeviation(landmarks: HandLandmarks): number {
    const wrist = landmarks[0];      // 手首
    const indexMcp = landmarks[5];   // 示指基部
    const pinkyMcp = landmarks[17];  // 小指基部
    
    const midpoint = this.calculateMidpoint(indexMcp, pinkyMcp);
    return this.calculateAngle3Points(indexMcp, wrist, midpoint);
  }

  // 母指可動域計算
  calculateThumbAngles(landmarks: HandLandmarks): ThumbAngles {
    const thumbCmc = landmarks[1];   // 母指手根中手
    const thumbMcp = landmarks[2];   // 母指中手指節
    const thumbIp = landmarks[3];    // 母指指節間
    const thumbTip = landmarks[4];   // 母指先端
    
    return {
      flexion: this.calculateAngle3Points(thumbTip, thumbIp, thumbMcp),
      extension: this.calculateExtensionAngle(thumbCmc, thumbMcp, thumbIp),
      abduction: this.calculateAbductionAngle(landmarks),
      adduction: this.calculateAdductionAngle(landmarks)
    };
  }

  private calculateAngle3Points(p1: Point3D, p2: Point3D, p3: Point3D): number {
    // ベクトル計算
    const vec1 = this.subtract3D(p1, p2);
    const vec2 = this.subtract3D(p3, p2);
    
    // 内積・外積計算
    const dot = this.dotProduct3D(vec1, vec2);
    const mag1 = this.magnitude3D(vec1);
    const mag2 = this.magnitude3D(vec2);
    
    // 角度算出（度数法）
    const angle = Math.acos(dot / (mag1 * mag2)) * (180 / Math.PI);
    return this.normalizeAngle(angle);
  }
}
```

## 📊 状態管理設計（Jotai）

### 1. Atomic State Design
```typescript
// 測定状態原子
export const measurementStateAtom = atom<MeasurementState>({
  isCapturing: false,
  currentSession: null,
  realtimeAngles: null,
  accuracy: 0,
  calibrationData: null
});

// カメラ状態原子
export const cameraStateAtom = atom<CameraState>({
  stream: null,
  isReady: false,
  permissions: false,
  error: null,
  deviceInfo: null
});

// UI状態原子（派生原子）
export const uiStateAtom = atom((get) => {
  const measurement = get(measurementStateAtom);
  const camera = get(cameraStateAtom);
  
  return {
    showMeasurement: measurement.isCapturing && camera.isReady,
    showCalibration: !measurement.calibrationData && camera.isReady,
    showError: camera.error !== null || measurement.currentSession?.error,
    canStartMeasurement: camera.isReady && measurement.calibrationData !== null
  };
});
```

### 2. 非同期処理統合
```typescript
// 測定開始アクション
export const startMeasurementAtom = atom(
  null,
  async (get, set, handType: HandType) => {
    const camera = get(cameraStateAtom);
    if (!camera.isReady) throw new Error('Camera not ready');

    // セッション開始
    const session = await MeasurementService.startSession({
      handType,
      userId: get(userIdAtom),
      calibration: get(measurementStateAtom).calibrationData
    });

    set(measurementStateAtom, prev => ({
      ...prev,
      isCapturing: true,
      currentSession: session
    }));

    // リアルタイム測定開始
    await MediaPipeService.startRealTimeMeasurement(session.id);
  }
);
```

## 🎨 コンポーネント設計パターン

### 1. Container/Presenter パターン
```typescript
// Container Component
const MeasurementContainer: React.FC = () => {
  const [measurementState, setMeasurementState] = useAtom(measurementStateAtom);
  const [cameraState] = useAtom(cameraStateAtom);
  const { startMeasurement, stopMeasurement } = useMeasurementService();

  return (
    <MeasurementPresenter
      isCapturing={measurementState.isCapturing}
      angles={measurementState.realtimeAngles}
      cameraReady={cameraState.isReady}
      onStart={startMeasurement}
      onStop={stopMeasurement}
    />
  );
};

// Presenter Component
const MeasurementPresenter: React.FC<MeasurementPresenterProps> = ({
  isCapturing,
  angles,
  cameraReady,
  onStart,
  onStop
}) => (
  <div className={styles.measurementContainer}>
    <CameraPreview />
    {angles && <AngleOverlay angles={angles} />}
    <MeasurementControls
      isCapturing={isCapturing}
      disabled={!cameraReady}
      onStart={onStart}
      onStop={onStop}
    />
  </div>
);
```

### 2. Compound Component パターン
```typescript
// 測定コントロール複合コンポーネント
const MeasurementControls = {
  Root: ({ children, ...props }: MeasurementControlsProps) => (
    <div className={styles.controlsContainer} {...props}>
      {children}
    </div>
  ),

  StartButton: ({ onStart, disabled }: StartButtonProps) => (
    <button
      className={styles.startButton}
      onClick={onStart}
      disabled={disabled}
      aria-label="測定開始"
    >
      測定開始
    </button>
  ),

  StopButton: ({ onStop, disabled }: StopButtonProps) => (
    <button
      className={styles.stopButton}
      onClick={onStop}
      disabled={disabled}
      aria-label="測定停止"
    >
      測定停止
    </button>
  ),

  HandSelector: ({ selectedHand, onHandChange }: HandSelectorProps) => (
    <div className={styles.handSelector}>
      <label>
        <input
          type="radio"
          value="left"
          checked={selectedHand === 'left'}
          onChange={() => onHandChange('left')}
        />
        左手
      </label>
      <label>
        <input
          type="radio"
          value="right"
          checked={selectedHand === 'right'}
          onChange={() => onHandChange('right')}
        />
        右手
      </label>
    </div>
  )
};
```

## 🗄️ データ永続化設計

### 1. Dexie.js スキーマ設計
```typescript
class RehabDatabase extends Dexie {
  measurements!: Table<MotionMeasurement>;
  sessions!: Table<MeasurementSession>;
  calibrations!: Table<CalibrationData>;
  users!: Table<UserProfile>;

  constructor() {
    super('RehabDatabase');
    
    this.version(1).stores({
      measurements: '++id, userId, measurementDate, handUsed, [userId+handUsed]',
      sessions: '++id, userId, startTime, endTime, status',
      calibrations: '++id, userId, handType, createdAt',
      users: '++id, email, createdAt, lastLoginAt'
    });

    // データ変換・マイグレーション
    this.version(2).stores({
      measurements: '++id, userId, measurementDate, handUsed, sessionId, [userId+measurementDate]'
    }).upgrade(tx => {
      return tx.table('measurements').toCollection().modify(measurement => {
        measurement.sessionId = measurement.sessionId || null;
      });
    });
  }

  // 測定データ保存
  async saveMeasurement(measurement: CreateMotionMeasurementInput): Promise<string> {
    const motionMeasurement = createMotionMeasurement(measurement);
    const id = await this.measurements.add(motionMeasurement);
    
    // インデックス更新
    await this.updateMeasurementIndex(motionMeasurement.userId);
    
    return id.toString();
  }

  // 進捗データ取得
  async getProgressData(userId: string, timeRange: TimeRange): Promise<ProgressData> {
    const measurements = await this.measurements
      .where('[userId+measurementDate]')
      .between([userId, timeRange.start], [userId, timeRange.end])
      .reverse()
      .sortBy('measurementDate');

    return this.calculateProgressMetrics(measurements);
  }
}
```

### 2. データ暗号化・セキュリティ
```typescript
class SecureDataManager {
  private encryptionKey: CryptoKey | null = null;

  async initialize(): Promise<void> {
    // Web Crypto API を使用した暗号化キー生成
    this.encryptionKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async encryptMeasurementData(data: MotionMeasurement): Promise<EncryptedData> {
    if (!this.encryptionKey) throw new Error('Encryption key not initialized');

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      encodedData
    );

    return {
      data: Array.from(new Uint8Array(encryptedData)),
      iv: Array.from(iv),
      timestamp: Date.now()
    };
  }

  async decryptMeasurementData(encryptedData: EncryptedData): Promise<MotionMeasurement> {
    if (!this.encryptionKey) throw new Error('Encryption key not initialized');

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
      this.encryptionKey,
      new Uint8Array(encryptedData.data)
    );

    const jsonString = new TextDecoder().decode(decryptedData);
    return JSON.parse(jsonString);
  }
}
```

## 🎯 パフォーマンス最適化戦略

### 1. MediaPipe ワーカー実装
```typescript
// WebWorker でMediaPipe処理を分離
class MediaPipeWorker {
  private worker: Worker;
  private isInitialized: boolean = false;

  constructor() {
    this.worker = new Worker('/workers/mediapipe-worker.js');
    this.setupWorkerHandlers();
  }

  async processFrame(imageData: ImageData): Promise<HandLandmarks | null> {
    if (!this.isInitialized) await this.initialize();

    return new Promise((resolve) => {
      const messageId = Date.now().toString();
      
      const handler = (event: MessageEvent) => {
        if (event.data.messageId === messageId) {
          this.worker.removeEventListener('message', handler);
          resolve(event.data.result);
        }
      };

      this.worker.addEventListener('message', handler);
      this.worker.postMessage({
        type: 'PROCESS_FRAME',
        messageId,
        imageData
      });
    });
  }

  private setupWorkerHandlers(): void {
    this.worker.addEventListener('message', (event) => {
      switch (event.data.type) {
        case 'INITIALIZED':
          this.isInitialized = true;
          break;
        case 'ERROR':
          console.error('MediaPipe Worker Error:', event.data.error);
          break;
      }
    });
  }
}
```

### 2. Canvas描画最適化
```typescript
class OptimizedCanvasRenderer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private offscreenCanvas: OffscreenCanvas;
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d')!;
    this.offscreenCanvas = new OffscreenCanvas(canvas.width, canvas.height);
    
    // コンテキスト最適化
    this.context.imageSmoothingEnabled = false;
    this.context.imageSmoothingQuality = 'high';
  }

  renderFrame(videoFrame: VideoFrame, landmarks: HandLandmarks | null): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationFrameId = requestAnimationFrame(() => {
      // オフスクリーン描画で最適化
      const offscreenCtx = this.offscreenCanvas.getContext('2d')!;
      
      // 背景クリア（必要部分のみ）
      offscreenCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // ビデオフレーム描画
      offscreenCtx.drawImage(videoFrame, 0, 0);
      
      // ランドマーク描画
      if (landmarks) {
        this.drawLandmarks(offscreenCtx, landmarks);
        this.drawAngles(offscreenCtx, landmarks);
      }
      
      // メインキャンバスに転送
      this.context.drawImage(this.offscreenCanvas, 0, 0);
    });
  }

  private drawLandmarks(ctx: CanvasRenderingContext2D, landmarks: HandLandmarks): void {
    ctx.fillStyle = '#00FF00';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;

    // バッチ描画で最適化
    ctx.beginPath();
    landmarks.forEach((landmark, index) => {
      const x = landmark.x * this.canvas.width;
      const y = landmark.y * this.canvas.height;
      
      ctx.moveTo(x + 3, y);
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
    });
    ctx.fill();
    ctx.stroke();
  }
}
```

このアーキテクチャ設計により、**スケーラブル・保守可能・高性能**なリハビリテーションアプリケーションの実現が可能になります。各レイヤーの責任分離、型安全性の確保、パフォーマンス最適化により、医療機器レベルの品質と信頼性を提供できます。