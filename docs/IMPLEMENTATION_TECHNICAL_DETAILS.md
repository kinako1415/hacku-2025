# 実装技術詳細書

## 📋 拡張実装タスクの技術詳細

このドキュメントでは、`CLEAN_IMPLEMENTATION_TASKS.md`で新たに追加された18個のタスク（T037-T054）の技術的実装詳細を記載します。

## 🔐 Phase 11: 医療データセキュリティ実装

### T037: データ暗号化・プライバシー保護

#### 実装アーキテクチャ

```typescript
// src/lib/security/encryption-service.ts
import { webcrypto } from 'crypto';

interface EncryptedData {
  data: ArrayBuffer;
  iv: Uint8Array;
  salt: Uint8Array;
  algorithm: string;
}

export class DataEncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT_LENGTH = 16;

  /**
   * ユーザーパスワードから暗号化キーを生成
   */
  private async deriveKey(
    password: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await webcrypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return webcrypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * データ暗号化
   */
  async encrypt(data: any, userPassword: string): Promise<EncryptedData> {
    const encoder = new TextEncoder();
    const salt = webcrypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const iv = webcrypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

    const key = await this.deriveKey(userPassword, salt);
    const encodedData = encoder.encode(JSON.stringify(data));

    const encryptedData = await webcrypto.subtle.encrypt(
      { name: this.ALGORITHM, iv: iv },
      key,
      encodedData
    );

    return {
      data: encryptedData,
      iv: iv,
      salt: salt,
      algorithm: this.ALGORITHM,
    };
  }

  /**
   * データ復号化
   */
  async decrypt(
    encryptedData: EncryptedData,
    userPassword: string
  ): Promise<any> {
    const key = await this.deriveKey(userPassword, encryptedData.salt);

    const decryptedData = await webcrypto.subtle.decrypt(
      { name: this.ALGORITHM, iv: encryptedData.iv },
      key,
      encryptedData.data
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedData));
  }
}
```

#### GDPR準拠機能

```typescript
// src/lib/privacy/gdpr-compliance.ts
export class GDPRComplianceService {
  /**
   * データ削除権（忘れられる権利）
   */
  async deleteAllUserData(userId: string): Promise<void> {
    const db = await initDatabase();

    await Promise.all([
      db.measurements.where('userId').equals(userId).delete(),
      db.sessions.where('userId').equals(userId).delete(),
      db.progress.where('userId').equals(userId).delete(),
      db.records.where('userId').equals(userId).delete(),
    ]);

    // ローカルストレージからも削除
    localStorage.removeItem(`user_settings_${userId}`);
    sessionStorage.removeItem(`temp_data_${userId}`);
  }

  /**
   * データ携帯権（データエクスポート）
   */
  async exportUserData(userId: string): Promise<UserDataExport> {
    const db = await initDatabase();

    const [measurements, sessions, progress, records] = await Promise.all([
      db.measurements.where('userId').equals(userId).toArray(),
      db.sessions.where('userId').equals(userId).toArray(),
      db.progress.where('userId').equals(userId).toArray(),
      db.records.where('userId').equals(userId).toArray(),
    ]);

    return {
      exportDate: new Date().toISOString(),
      userId: userId,
      data: {
        measurements,
        sessions,
        progress,
        records,
      },
      metadata: {
        totalRecords:
          measurements.length +
          sessions.length +
          progress.length +
          records.length,
        dateRange: {
          from: Math.min(...measurements.map((m) => m.createdAt)),
          to: Math.max(...measurements.map((m) => m.createdAt)),
        },
      },
    };
  }

  /**
   * データ利用同意管理
   */
  async recordConsent(
    userId: string,
    consentType: string,
    granted: boolean
  ): Promise<void> {
    const consent: ConsentRecord = {
      id: generateId(),
      userId,
      type: consentType,
      granted,
      timestamp: Date.now(),
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
    };

    const db = await initDatabase();
    await db.consents.add(consent);
  }
}
```

### T038: 認証・認可システム

#### JWT認証実装

```typescript
// src/lib/auth/jwt-service.ts
export class JWTAuthService {
  private static readonly SECRET_KEY =
    process.env.JWT_SECRET || 'fallback-secret';
  private static readonly EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24時間

  /**
   * JWTトークン生成
   */
  async generateToken(payload: TokenPayload): Promise<string> {
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const tokenPayload = {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + this.EXPIRY_TIME) / 1000),
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(tokenPayload));

    const signature = await this.createSignature(
      `${encodedHeader}.${encodedPayload}`
    );

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * JWTトークン検証
   */
  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      const [encodedHeader, encodedPayload, signature] = token.split('.');

      const expectedSignature = await this.createSignature(
        `${encodedHeader}.${encodedPayload}`
      );

      if (signature !== expectedSignature) {
        return null;
      }

      const payload = JSON.parse(this.base64UrlDecode(encodedPayload));

      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // トークン期限切れ
      }

      return payload;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  private async createSignature(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await webcrypto.subtle.importKey(
      'raw',
      encoder.encode(JWTAuthService.SECRET_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await webcrypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(data)
    );
    return this.base64UrlEncode(signature);
  }
}
```

### T039: 監査・コンプライアンス

#### 操作ログシステム

```typescript
// src/lib/audit/audit-logger.ts
export class AuditLogger {
  private static instance: AuditLogger;
  private logQueue: AuditLogEntry[] = [];
  private readonly MAX_QUEUE_SIZE = 1000;

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * 操作ログ記録
   */
  async logUserAction(action: UserAction): Promise<void> {
    const logEntry: AuditLogEntry = {
      id: generateId(),
      timestamp: Date.now(),
      userId: action.userId,
      actionType: action.type,
      resource: action.resource,
      details: action.details,
      sessionId: action.sessionId,
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
      result: action.result || 'success',
    };

    this.logQueue.push(logEntry);

    if (this.logQueue.length >= this.MAX_QUEUE_SIZE) {
      await this.flushLogs();
    }
  }

  /**
   * セキュリティイベント記録
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const logEntry: SecurityAuditEntry = {
      id: generateId(),
      timestamp: Date.now(),
      eventType: event.type,
      severity: event.severity,
      description: event.description,
      sourceIP: await this.getClientIP(),
      userAgent: navigator.userAgent,
      additionalData: event.additionalData,
    };

    // セキュリティイベントは即座に保存
    const db = await initDatabase();
    await db.securityLogs.add(logEntry);

    // 重要度が高い場合はアラート
    if (event.severity === 'high' || event.severity === 'critical') {
      await this.triggerSecurityAlert(logEntry);
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const db = await initDatabase();
    await db.auditLogs.bulkAdd([...this.logQueue]);
    this.logQueue = [];
  }
}
```

## 🚨 Phase 12: エラーハンドリング・復旧システム

### T040: 包括的エラーハンドリング

#### グローバルエラーバウンダリ

```typescript
// src/components/error/GlobalErrorBoundary.tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class GlobalErrorBoundary extends Component<PropsWithChildren, ErrorBoundaryState> {
  private errorReportingService: ErrorReportingService;

  constructor(props: PropsWithChildren) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
    this.errorReportingService = new ErrorReportingService();
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: generateId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // エラーレポート送信
    this.errorReportingService.reportError({
      error,
      errorInfo,
      errorId: this.state.errorId!,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: getCurrentUserId(),
    });
  }

  private handleRecover = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorId={this.state.errorId}
          onRecover={this.handleRecover}
        />
      );
    }

    return this.props.children;
  }
}
```

#### MediaPipe回復戦略

```typescript
// src/lib/recovery/mediapipe-recovery.ts
export class MediaPipeRecoveryService {
  private maxRetries = 3;
  private retryDelay = 1000;
  private fallbackStrategies: FallbackStrategy[] = [];

  async initializeWithRecovery(): Promise<Hands> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const hands = await this.initializeMediaPipe();
        console.log(`MediaPipe initialized successfully on attempt ${attempt}`);
        return hands;
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `MediaPipe initialization failed (attempt ${attempt}):`,
          error
        );

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    // 全ての試行が失敗した場合、フォールバック戦略を実行
    return this.executeeFallbackStrategy(lastError!);
  }

  private async executeeFallbackStrategy(originalError: Error): Promise<Hands> {
    for (const strategy of this.fallbackStrategies) {
      try {
        console.log(`Executing fallback strategy: ${strategy.name}`);
        const result = await strategy.execute();
        if (result) {
          return result;
        }
      } catch (fallbackError) {
        console.warn(
          `Fallback strategy ${strategy.name} failed:`,
          fallbackError
        );
      }
    }

    // 全てのフォールバック戦略も失敗
    throw new MediaPipeInitializationError(
      'MediaPipe initialization failed after all recovery attempts',
      originalError
    );
  }

  private async initializeMediaPipe(): Promise<Hands> {
    // CDNから直接読み込み試行
    try {
      const { Hands } = await import('@mediapipe/hands');
      const hands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      return hands;
    } catch (error) {
      // ローカルファイルフォールバック
      const { Hands } = await import('@mediapipe/hands/hands');
      const hands = new Hands({
        locateFile: (file) => `/mediapipe/${file}`,
      });

      return hands;
    }
  }
}
```

### T041: データ復旧・バックアップ

#### 自動バックアップシステム

```typescript
// src/lib/backup/auto-backup-service.ts
export class AutoBackupService {
  private backupInterval: number = 60 * 60 * 1000; // 1時間
  private maxBackups: number = 10;
  private intervalId: NodeJS.Timeout | null = null;

  startAutoBackup(): void {
    this.intervalId = setInterval(() => {
      this.performBackup().catch((error) => {
        console.error('Auto backup failed:', error);
      });
    }, this.backupInterval);
  }

  stopAutoBackup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async performBackup(): Promise<BackupResult> {
    const timestamp = Date.now();
    const backupId = `backup_${timestamp}`;

    try {
      // 全データを取得
      const data = await this.collectAllData();

      // データを暗号化
      const encryptedData = await this.encryptBackupData(data);

      // バックアップを保存
      await this.saveBackup(backupId, encryptedData);

      // 古いバックアップを清理
      await this.cleanupOldBackups();

      return {
        success: true,
        backupId,
        timestamp,
        size: this.calculateBackupSize(encryptedData),
      };
    } catch (error) {
      console.error('Backup failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp,
      };
    }
  }

  async restoreFromBackup(
    backupId: string,
    password: string
  ): Promise<RestoreResult> {
    try {
      // バックアップデータを読み込み
      const encryptedData = await this.loadBackup(backupId);

      // データを復号化
      const data = await this.decryptBackupData(encryptedData, password);

      // データ整合性をチェック
      await this.validateBackupData(data);

      // データベースをクリア
      await this.clearDatabase();

      // データを復元
      await this.restoreData(data);

      return {
        success: true,
        restoredRecords: this.countRestoredRecords(data),
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Restore failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }
}
```

## ♿ Phase 13: アクセシビリティ・ユーザビリティ

### T043: WCAG 2.1 AA準拠実装

#### スクリーンリーダー対応

```typescript
// src/lib/accessibility/screen-reader-service.ts
export class ScreenReaderService {
  private announcer: HTMLElement;
  private isEnabled: boolean = false;

  constructor() {
    this.createAnnouncer();
    this.detectScreenReader();
  }

  private createAnnouncer(): void {
    this.announcer = document.createElement('div');
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.className = 'sr-only';
    this.announcer.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(this.announcer);
  }

  private detectScreenReader(): void {
    // スクリーンリーダーの検出
    this.isEnabled = !!(
      navigator.userAgent.includes('NVDA') ||
      navigator.userAgent.includes('JAWS') ||
      navigator.userAgent.includes('WindowEyes') ||
      window.speechSynthesis ||
      document.querySelector('[aria-label]')
    );
  }

  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.isEnabled) return;

    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = '';

    setTimeout(() => {
      this.announcer.textContent = message;
    }, 100);
  }

  describeMeasurementStatus(angle: number, target: number): void {
    const achievement = Math.round((angle / target) * 100);
    const message = `現在の角度 ${angle}度、目標 ${target}度、達成率 ${achievement}パーセント`;
    this.announce(message, 'polite');
  }

  announceStepChange(
    stepName: string,
    stepNumber: number,
    totalSteps: number
  ): void {
    const message = `ステップ ${stepNumber} / ${totalSteps}: ${stepName}`;
    this.announce(message, 'assertive');
  }
}
```

#### キーボードナビゲーション

```typescript
// src/lib/accessibility/keyboard-navigation.ts
export class KeyboardNavigationService {
  private focusableElements: string = [
    'button',
    'input',
    'select',
    'textarea',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  private keyHandlers: Map<string, (event: KeyboardEvent) => void> = new Map();

  constructor() {
    this.setupGlobalKeyHandlers();
  }

  private setupGlobalKeyHandlers(): void {
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
  }

  private handleGlobalKeydown(event: KeyboardEvent): void {
    const handler = this.keyHandlers.get(event.key);
    if (handler) {
      handler(event);
    }

    // ショートカットキー
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'm':
          event.preventDefault();
          this.navigateToMeasurement();
          break;
        case 'p':
          event.preventDefault();
          this.navigateToProgress();
          break;
        case 'h':
          event.preventDefault();
          this.showKeyboardHelp();
          break;
      }
    }

    // Tab トラッピング（モーダル内）
    if (event.key === 'Tab') {
      this.handleTabNavigation(event);
    }
  }

  trapFocus(container: HTMLElement): void {
    const focusableEls = container.querySelectorAll(this.focusableElements);
    const firstFocusableEl = focusableEls[0] as HTMLElement;
    const lastFocusableEl = focusableEls[
      focusableEls.length - 1
    ] as HTMLElement;

    container.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstFocusableEl) {
            lastFocusableEl.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastFocusableEl) {
            firstFocusableEl.focus();
            e.preventDefault();
          }
        }
      }
    });

    firstFocusableEl.focus();
  }
}
```

### T044: 多言語・国際化対応

#### i18n実装

```typescript
// src/lib/i18n/i18n-service.ts
export class I18nService {
  private currentLocale: string = 'ja';
  private translations: Map<string, Map<string, string>> = new Map();
  private dateFormatter: Intl.DateTimeFormat;
  private numberFormatter: Intl.NumberFormat;

  constructor() {
    this.detectLocale();
    this.loadTranslations();
    this.setupFormatters();
  }

  private detectLocale(): void {
    // ブラウザ言語設定から検出
    const browserLanguage = navigator.language || navigator.languages[0];
    const supportedLocales = ['ja', 'en'];

    this.currentLocale =
      supportedLocales.find((locale) => browserLanguage.startsWith(locale)) ||
      'ja';
  }

  private async loadTranslations(): Promise<void> {
    try {
      const translations = await import(
        `../../../public/locales/${this.currentLocale}.json`
      );
      this.translations.set(
        this.currentLocale,
        new Map(Object.entries(translations.default))
      );
    } catch (error) {
      console.error(
        `Failed to load translations for ${this.currentLocale}:`,
        error
      );
      // フォールバック
      const fallback = await import('../../../public/locales/ja.json');
      this.translations.set('ja', new Map(Object.entries(fallback.default)));
    }
  }

  t(key: string, params?: Record<string, string | number>): string {
    const translation =
      this.translations.get(this.currentLocale)?.get(key) || key;

    if (!params) return translation;

    return translation.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
      return params[paramKey]?.toString() || match;
    });
  }

  formatDate(date: Date): string {
    return this.dateFormatter.format(date);
  }

  formatNumber(num: number): string {
    return this.numberFormatter.format(num);
  }

  formatAngle(angle: number): string {
    return this.t('measurement.angle_value', {
      angle: this.formatNumber(angle),
    });
  }

  async changeLocale(locale: string): Promise<void> {
    this.currentLocale = locale;
    await this.loadTranslations();
    this.setupFormatters();

    // DOM要素の言語属性を更新
    document.documentElement.lang = locale;

    // 画面を再描画
    window.dispatchEvent(new CustomEvent('localechange', { detail: locale }));
  }
}
```

## 📱 Phase 14: モバイル・デバイス最適化

### T046: タッチ・ジェスチャー最適化

#### タッチイベント処理

```typescript
// src/lib/mobile/touch-handler.ts
export class TouchHandler {
  private touchStartTime: number = 0;
  private touchStartPosition: { x: number; y: number } = { x: 0, y: 0 };
  private swipeThreshold: number = 100;
  private tapTimeout: number = 300;

  constructor(private element: HTMLElement) {
    this.setupTouchEvents();
  }

  private setupTouchEvents(): void {
    this.element.addEventListener(
      'touchstart',
      this.handleTouchStart.bind(this),
      { passive: false }
    );
    this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), {
      passive: false,
    });
    this.element.addEventListener(
      'touchmove',
      this.handleTouchMove.bind(this),
      { passive: false }
    );
  }

  private handleTouchStart(event: TouchEvent): void {
    const touch = event.touches[0];
    this.touchStartTime = Date.now();
    this.touchStartPosition = { x: touch.clientX, y: touch.clientY };
  }

  private handleTouchEnd(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - this.touchStartTime;

    const deltaX = touch.clientX - this.touchStartPosition.x;
    const deltaY = touch.clientY - this.touchStartPosition.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // タップ判定
    if (touchDuration < this.tapTimeout && distance < 10) {
      this.handleTap(touch);
      return;
    }

    // スワイプ判定
    if (distance > this.swipeThreshold) {
      const direction = this.getSwipeDirection(deltaX, deltaY);
      this.handleSwipe(direction, touch);
    }
  }

  private getSwipeDirection(deltaX: number, deltaY: number): SwipeDirection {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }

  private handleTap(touch: Touch): void {
    // バイブレーション フィードバック
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // カスタムイベント発火
    this.element.dispatchEvent(
      new CustomEvent('customtap', {
        detail: { x: touch.clientX, y: touch.clientY },
      })
    );
  }

  private handleSwipe(direction: SwipeDirection, touch: Touch): void {
    // ページナビゲーション
    switch (direction) {
      case 'left':
        this.navigateNext();
        break;
      case 'right':
        this.navigatePrevious();
        break;
      case 'up':
        this.showDetails();
        break;
      case 'down':
        this.hideDetails();
        break;
    }

    // ハプティックフィードバック
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50]);
    }
  }
}
```

### T047: デバイス固有機能活用

#### センサー活用

```typescript
// src/lib/mobile/sensor-service.ts
export class MobileSensorService {
  private orientationData: DeviceOrientationData | null = null;
  private motionData: DeviceMotionData | null = null;

  async requestPermissions(): Promise<boolean> {
    // iOS 13+ の許可要求
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission();
      return permission === 'granted';
    }
    return true;
  }

  startOrientationTracking(): void {
    window.addEventListener(
      'deviceorientation',
      this.handleOrientation.bind(this)
    );
  }

  startMotionTracking(): void {
    window.addEventListener('devicemotion', this.handleMotion.bind(this));
  }

  private handleOrientation(event: DeviceOrientationEvent): void {
    this.orientationData = {
      alpha: event.alpha, // Z軸回転（コンパス）
      beta: event.beta, // X軸回転（前後傾き）
      gamma: event.gamma, // Y軸回転（左右傾き）
      timestamp: Date.now(),
    };

    // 手首の角度測定に活用
    this.enhanceMeasurementWithOrientation();
  }

  private handleMotion(event: DeviceMotionEvent): void {
    this.motionData = {
      acceleration: event.acceleration,
      accelerationIncludingGravity: event.accelerationIncludingGravity,
      rotationRate: event.rotationRate,
      timestamp: Date.now(),
    };

    // 動作の安定性をチェック
    this.checkMeasurementStability();
  }

  private enhanceMeasurementWithOrientation(): void {
    if (!this.orientationData) return;

    // デバイスの傾きを考慮した角度補正
    const correctionFactor = this.calculateOrientationCorrection(
      this.orientationData.beta,
      this.orientationData.gamma
    );

    // 測定精度向上のため角度データを調整
    window.dispatchEvent(
      new CustomEvent('orientationUpdate', {
        detail: {
          orientation: this.orientationData,
          correction: correctionFactor,
        },
      })
    );
  }

  private checkMeasurementStability(): void {
    if (!this.motionData?.acceleration) return;

    const { x, y, z } = this.motionData.acceleration;
    const movement = Math.sqrt(x * x + y * y + z * z);

    // 安定性チェック（動きが少ないほど測定に適している）
    const isStable = movement < 2.0; // m/s²

    window.dispatchEvent(
      new CustomEvent('stabilityUpdate', {
        detail: { isStable, movement },
      })
    );
  }
}
```

## 🗄️ Phase 15: データ管理・移行システム

### T049: スキーマ変更・マイグレーション

#### データベース移行システム

```typescript
// src/lib/migration/migration-service.ts
export class DatabaseMigrationService {
  private migrations: Migration[] = [
    {
      version: '1.0.0',
      up: this.migration_1_0_0_up.bind(this),
      down: this.migration_1_0_0_down.bind(this),
    },
    {
      version: '1.1.0',
      up: this.migration_1_1_0_up.bind(this),
      down: this.migration_1_1_0_down.bind(this),
    },
    // 追加の移行定義...
  ];

  async getCurrentVersion(): Promise<string> {
    const db = await initDatabase();
    const versionInfo = await db.metadata.get('database_version');
    return versionInfo?.value || '0.0.0';
  }

  async migrateToLatest(): Promise<MigrationResult> {
    const currentVersion = await this.getCurrentVersion();
    const targetVersion = this.getLatestVersion();

    if (currentVersion === targetVersion) {
      return { success: true, message: 'Database is already up to date' };
    }

    try {
      await this.performMigration(currentVersion, targetVersion);
      return {
        success: true,
        message: `Migrated from ${currentVersion} to ${targetVersion}`,
      };
    } catch (error) {
      console.error('Migration failed:', error);
      await this.rollbackToVersion(currentVersion);
      return { success: false, error: error.message };
    }
  }

  private async performMigration(
    fromVersion: string,
    toVersion: string
  ): Promise<void> {
    const migrationsToRun = this.getMigrationsInRange(fromVersion, toVersion);

    for (const migration of migrationsToRun) {
      console.log(`Running migration to version ${migration.version}`);
      await migration.up();
      await this.updateVersion(migration.version);
    }
  }

  private async migration_1_0_0_up(): Promise<void> {
    const db = await initDatabase();

    // 初期テーブル作成
    await db.version(1).stores({
      users: 'id, email, createdAt',
      measurements: 'id, userId, sessionId, createdAt',
      sessions: 'id, userId, startTime, endTime',
    });
  }

  private async migration_1_1_0_up(): Promise<void> {
    const db = await initDatabase();

    // 新しいフィールド追加
    await db.version(2).stores({
      users: 'id, email, createdAt, settings',
      measurements: 'id, userId, sessionId, createdAt, accuracy, deviceInfo',
      sessions: 'id, userId, startTime, endTime, status',
      analytics: 'id, eventType, timestamp, data', // 新テーブル
    });

    // 既存データの移行
    const allMeasurements = await db.measurements.toArray();
    for (const measurement of allMeasurements) {
      await db.measurements.update(measurement.id, {
        accuracy: 0.95, // デフォルト値
        deviceInfo: 'migrated',
      });
    }
  }
}
```

### T050: バックアップ・復元機能

#### クラウド同期対応

```typescript
// src/lib/backup/cloud-sync-service.ts
export class CloudSyncService {
  private syncEnabled: boolean = false;
  private lastSyncTime: number = 0;
  private conflictResolver: ConflictResolver;

  constructor() {
    this.conflictResolver = new ConflictResolver();
  }

  async enableCloudSync(
    provider: CloudProvider,
    credentials: any
  ): Promise<void> {
    try {
      await this.authenticateWithProvider(provider, credentials);
      this.syncEnabled = true;
      await this.performInitialSync();
    } catch (error) {
      console.error('Failed to enable cloud sync:', error);
      throw error;
    }
  }

  async syncToCloud(): Promise<SyncResult> {
    if (!this.syncEnabled) {
      return { success: false, error: 'Cloud sync not enabled' };
    }

    try {
      // ローカルデータを取得
      const localData = await this.collectLocalData();

      // クラウドデータを取得
      const cloudData = await this.fetchCloudData();

      // 競合を解決
      const mergedData = await this.conflictResolver.resolve(
        localData,
        cloudData
      );

      // クラウドに同期
      await this.uploadToCloud(mergedData);

      // ローカルデータを更新
      await this.updateLocalData(mergedData);

      this.lastSyncTime = Date.now();

      return {
        success: true,
        syncedRecords: mergedData.measurements.length,
        timestamp: this.lastSyncTime,
      };
    } catch (error) {
      console.error('Cloud sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  async createEncryptedBackup(): Promise<Blob> {
    const allData = await this.collectLocalData();

    // ユーザーパスワードで暗号化
    const password = await this.getUserBackupPassword();
    const encryptedData = await this.encryptionService.encrypt(
      allData,
      password
    );

    // バックアップメタデータを追加
    const backupPackage = {
      version: '1.0.0',
      timestamp: Date.now(),
      deviceInfo: this.getDeviceInfo(),
      encryptedData,
    };

    return new Blob([JSON.stringify(backupPackage)], {
      type: 'application/json',
    });
  }

  async restoreFromEncryptedBackup(
    file: File,
    password: string
  ): Promise<RestoreResult> {
    try {
      const backupText = await file.text();
      const backupPackage = JSON.parse(backupText);

      // 暗号化されたデータを復号化
      const decryptedData = await this.encryptionService.decrypt(
        backupPackage.encryptedData,
        password
      );

      // データ整合性をチェック
      await this.validateBackupData(decryptedData);

      // 現在のデータをバックアップ
      await this.createSafetyBackup();

      // データを復元
      await this.restoreData(decryptedData);

      return {
        success: true,
        restoredRecords: this.countRestoredRecords(decryptedData),
        backupDate: new Date(backupPackage.timestamp),
      };
    } catch (error) {
      console.error('Restore from backup failed:', error);
      return { success: false, error: error.message };
    }
  }
}
```

## 📊 Phase 16: 監査・ログ・分析システム

### T052: 操作ログ・トラッキング

#### パフォーマンス監視

```typescript
// src/lib/monitoring/performance-monitor.ts
export class PerformanceMonitor {
  private metricsQueue: PerformanceMetric[] = [];
  private observer: PerformanceObserver;

  constructor() {
    this.setupPerformanceObserver();
    this.setupWebVitalsTracking();
  }

  private setupPerformanceObserver(): void {
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric({
          name: entry.name,
          type: entry.entryType,
          startTime: entry.startTime,
          duration: entry.duration,
          timestamp: Date.now(),
        });
      }
    });

    this.observer.observe({
      entryTypes: ['measure', 'navigation', 'resource'],
    });
  }

  private setupWebVitalsTracking(): void {
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordWebVital('LCP', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordWebVital('FID', entry.processingStart - entry.startTime);
      }
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordWebVital('CLS', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  recordMediaPipePerformance(processingTime: number, accuracy: number): void {
    this.recordMetric({
      name: 'mediapipe_processing',
      type: 'custom',
      duration: processingTime,
      customData: { accuracy },
      timestamp: Date.now(),
    });
  }

  recordUserAction(action: string, duration?: number): void {
    this.recordMetric({
      name: `user_action_${action}`,
      type: 'user',
      duration: duration || 0,
      timestamp: Date.now(),
    });
  }

  async generatePerformanceReport(): Promise<PerformanceReport> {
    const metrics = [...this.metricsQueue];

    return {
      timestamp: Date.now(),
      webVitals: this.calculateWebVitals(metrics),
      mediaPipePerformance: this.calculateMediaPipeStats(metrics),
      userInteractions: this.calculateUserStats(metrics),
      resourceUsage: await this.getResourceUsage(),
    };
  }

  private async getResourceUsage(): Promise<ResourceUsage> {
    const memoryInfo = (performance as any).memory;

    return {
      memoryUsed: memoryInfo?.usedJSHeapSize || 0,
      memoryTotal: memoryInfo?.totalJSHeapSize || 0,
      memoryLimit: memoryInfo?.jsHeapSizeLimit || 0,
      storageUsed: await this.calculateStorageUsage(),
    };
  }
}
```

### T054: 分析・レポート機能

#### 医療効果測定支援

```typescript
// src/lib/analytics/medical-analytics.ts
export class MedicalAnalyticsService {
  async generateProgressReport(
    userId: string,
    dateRange: DateRange
  ): Promise<MedicalProgressReport> {
    const measurements = await this.getMeasurementsInRange(userId, dateRange);

    return {
      patientId: userId,
      reportPeriod: dateRange,
      generatedAt: new Date(),

      // 角度改善分析
      angleImprovement: this.analyzeAngleImprovement(measurements),

      // 運動パターン分析
      movementPatterns: this.analyzeMovementPatterns(measurements),

      // 痛みレベル相関
      painCorrelation: this.analyzePainCorrelation(measurements),

      // 継続性分析
      adherenceAnalysis: this.analyzeAdherence(measurements),

      // 推奨事項
      recommendations: this.generateRecommendations(measurements),
    };
  }

  private analyzeAngleImprovement(
    measurements: MeasurementData[]
  ): AngleImprovementAnalysis {
    const groupedByType = this.groupByMeasurementType(measurements);
    const improvements: Record<string, ImprovementData> = {};

    for (const [type, data] of Object.entries(groupedByType)) {
      const sortedData = data.sort((a, b) => a.timestamp - b.timestamp);
      const firstWeek = sortedData.slice(0, 7);
      const lastWeek = sortedData.slice(-7);

      const initialAverage = this.calculateAverage(
        firstWeek.map((d) => d.maxAngle)
      );
      const currentAverage = this.calculateAverage(
        lastWeek.map((d) => d.maxAngle)
      );

      improvements[type] = {
        initialAngle: initialAverage,
        currentAngle: currentAverage,
        improvement: currentAverage - initialAverage,
        improvementPercentage:
          ((currentAverage - initialAverage) / initialAverage) * 100,
        trend: this.calculateTrend(sortedData.map((d) => d.maxAngle)),
      };
    }

    return {
      overall: this.calculateOverallImprovement(improvements),
      byMovementType: improvements,
      statisticalSignificance: this.calculateSignificance(measurements),
    };
  }

  private analyzeMovementPatterns(
    measurements: MeasurementData[]
  ): MovementPatternAnalysis {
    return {
      consistencyScore: this.calculateConsistencyScore(measurements),
      preferredMovements: this.identifyPreferredMovements(measurements),
      avoidedMovements: this.identifyAvoidedMovements(measurements),
      dailyPatterns: this.analyzeDailyPatterns(measurements),
    };
  }

  private generateRecommendations(
    measurements: MeasurementData[]
  ): MedicalRecommendation[] {
    const recommendations: MedicalRecommendation[] = [];

    // 改善が遅い動作の特定
    const slowProgress = this.identifySlowProgress(measurements);
    if (slowProgress.length > 0) {
      recommendations.push({
        type: 'exercise_focus',
        priority: 'high',
        title: '重点的な練習が必要な動作',
        description: `${slowProgress.join('、')}の改善に重点を置いた練習を推奨します`,
        evidence: 'progress_analysis',
      });
    }

    // 継続性の問題
    const adherenceIssues = this.checkAdherenceIssues(measurements);
    if (adherenceIssues) {
      recommendations.push({
        type: 'adherence',
        priority: 'medium',
        title: '継続性の改善',
        description: '定期的な測定を継続することで、より良い結果が期待できます',
        evidence: 'adherence_analysis',
      });
    }

    return recommendations;
  }
}
```

## 🎯 実装優先度とロードマップ

### 高優先度タスク（即座に実装推奨）

1. **T037**: データ暗号化 - 医療データ保護の基本
2. **T040**: エラーハンドリング - ユーザー体験の向上
3. **T043**: アクセシビリティ - 医療機器として必須
4. **T049**: データ移行 - 将来の拡張性確保

### 中優先度タスク（段階的実装）

1. **T038**: 認証システム - 医療機関導入時
2. **T046**: タッチ最適化 - モバイル利用促進
3. **T052**: パフォーマンス監視 - 品質管理

### 低優先度タスク（長期計画）

1. **T044**: 多言語対応 - 国際展開時
2. **T050**: クラウド同期 - 高度な機能として
3. **T054**: 医療分析 - 研究・臨床応用時

この包括的な技術実装計画により、現在のリハビリテーションアプリを医療機器レベルの品質・セキュリティ・ユーザビリティを持つシステムに完全に刷新できます。
