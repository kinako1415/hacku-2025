/**
 * MediaPipe処理パフォーマンス最適化
 *
 * 機能:
 * - MediaPipeの処理効率向上
 * - フレームレート最適化
 * - メモリ使用量最適化
 * - CPUリソース最適化
 * - バックグラウンド処理
 */

// MediaPipe最適化設定
export interface MediaPipeOptimizationConfig {
  // フレーム処理設定
  targetFrameRate: number;
  skipFrameThreshold: number;
  adaptiveFrameSkipping: boolean;

  // 品質設定
  modelComplexity: 0 | 1;
  minDetectionConfidence: number;
  minTrackingConfidence: number;

  // パフォーマンス設定
  maxProcessingTime: number;
  useWebWorker: boolean;
  enableGPUAcceleration: boolean;

  // メモリ管理
  maxCachedFrames: number;
  enableFramePooling: boolean;
  autoGarbageCollection: boolean;
}

// デフォルト最適化設定
export const DEFAULT_OPTIMIZATION_CONFIG: MediaPipeOptimizationConfig = {
  targetFrameRate: 30,
  skipFrameThreshold: 50, // ms
  adaptiveFrameSkipping: true,

  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,

  maxProcessingTime: 33, // 30fps = 33ms per frame
  useWebWorker: true,
  enableGPUAcceleration: true,

  maxCachedFrames: 3,
  enableFramePooling: true,
  autoGarbageCollection: true,
};

// パフォーマンスメトリクス
export interface PerformanceMetrics {
  fps: number;
  averageProcessingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  skippedFrames: number;
  totalFrames: number;
  detectionAccuracy: number;
}

// フレームプール管理
class FramePool {
  private pool: HTMLCanvasElement[] = [];
  private maxSize: number;

  constructor(maxSize: number = 3) {
    this.maxSize = maxSize;
  }

  getFrame(width: number, height: number): HTMLCanvasElement {
    for (let i = 0; i < this.pool.length; i++) {
      const canvas = this.pool[i];
      if (canvas && canvas.width === width && canvas.height === height) {
        this.pool.splice(i, 1);
        return canvas;
      }
    }

    // 新しいキャンバスを作成
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  returnFrame(canvas: HTMLCanvasElement): void {
    if (this.pool.length < this.maxSize) {
      // キャンバスをクリア
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      this.pool.push(canvas);
    }
  }

  clear(): void {
    this.pool = [];
  }
}

// 適応的フレームスキッピング
class AdaptiveFrameSkipper {
  private processingTimes: number[] = [];
  private maxSamples: number = 10;
  private targetFrameTime: number;

  constructor(targetFps: number) {
    this.targetFrameTime = 1000 / targetFps;
  }

  shouldSkipFrame(lastProcessingTime: number): boolean {
    this.processingTimes.push(lastProcessingTime);

    if (this.processingTimes.length > this.maxSamples) {
      this.processingTimes.shift();
    }

    const averageProcessingTime =
      this.processingTimes.reduce((a, b) => a + b, 0) /
      this.processingTimes.length;

    // 処理時間が目標フレーム時間を超える場合はスキップ
    return averageProcessingTime > this.targetFrameTime * 0.8;
  }

  getSkipRatio(): number {
    const averageProcessingTime =
      this.processingTimes.reduce((a, b) => a + b, 0) /
      this.processingTimes.length;
    const ratio = Math.max(
      1,
      Math.ceil(averageProcessingTime / this.targetFrameTime)
    );
    return Math.min(ratio, 4); // 最大4フレームに1回
  }
}

// パフォーマンス監視
class PerformanceMonitor {
  private startTime: number = 0;
  private frameCount: number = 0;
  private skippedFrameCount: number = 0;
  private processingTimes: number[] = [];
  private lastUpdateTime: number = 0;

  startFrame(): void {
    this.startTime = performance.now();
  }

  endFrame(skipped: boolean = false): void {
    const endTime = performance.now();
    const processingTime = endTime - this.startTime;

    this.frameCount++;
    if (skipped) {
      this.skippedFrameCount++;
    } else {
      this.processingTimes.push(processingTime);

      // 最新の100フレームのみ保持
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }
    }
  }

  getMetrics(): PerformanceMetrics {
    const now = performance.now();
    const timeDiff = now - this.lastUpdateTime;
    const fps = this.frameCount / (timeDiff / 1000);

    const averageProcessingTime =
      this.processingTimes.length > 0
        ? this.processingTimes.reduce((a, b) => a + b, 0) /
          this.processingTimes.length
        : 0;

    // メモリ使用量の取得（利用可能な場合）
    const memoryUsage = (performance as any).memory
      ? (performance as any).memory.usedJSHeapSize / 1024 / 1024 // MB
      : 0;

    this.lastUpdateTime = now;
    this.frameCount = 0;

    return {
      fps,
      averageProcessingTime,
      memoryUsage,
      cpuUsage: (averageProcessingTime / 33) * 100, // 33ms = 30fps基準
      skippedFrames: this.skippedFrameCount,
      totalFrames: this.frameCount + this.skippedFrameCount,
      detectionAccuracy: 0, // 別途計算
    };
  }

  reset(): void {
    this.frameCount = 0;
    this.skippedFrameCount = 0;
    this.processingTimes = [];
    this.lastUpdateTime = performance.now();
  }
}

// メモリ最適化マネージャー
class MemoryOptimizer {
  private lastGCTime: number = 0;
  private gcInterval: number = 10000; // 10秒
  private memoryThreshold: number = 100; // MB

  checkAndOptimize(): void {
    const now = performance.now();

    if (now - this.lastGCTime > this.gcInterval) {
      this.performGarbageCollection();
      this.lastGCTime = now;
    }
  }

  private performGarbageCollection(): void {
    // メモリ使用量をチェック
    if ((performance as any).memory) {
      const memoryInfo = (performance as any).memory;
      const usedMemoryMB = memoryInfo.usedJSHeapSize / 1024 / 1024;

      if (usedMemoryMB > this.memoryThreshold) {
        // 強制的なガベージコレクション（可能な場合）
        if ((window as any).gc) {
          (window as any).gc();
        }

        // キャッシュクリア
        this.clearCaches();
      }
    }
  }

  private clearCaches(): void {
    // ImageBitmapキャッシュのクリア
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((cacheName) => {
          if (cacheName.includes('mediapipe') || cacheName.includes('frame')) {
            caches.delete(cacheName);
          }
        });
      });
    }
  }
}

// 最適化されたMediaPipeマネージャー
export class OptimizedMediaPipeManager {
  private config: MediaPipeOptimizationConfig;
  private framePool: FramePool;
  private frameSkipper: AdaptiveFrameSkipper;
  private performanceMonitor: PerformanceMonitor;
  private memoryOptimizer: MemoryOptimizer;
  private isProcessing: boolean = false;
  private lastFrameTime: number = 0;
  private frameCounter: number = 0;

  constructor(config: Partial<MediaPipeOptimizationConfig> = {}) {
    this.config = { ...DEFAULT_OPTIMIZATION_CONFIG, ...config };
    this.framePool = new FramePool(this.config.maxCachedFrames);
    this.frameSkipper = new AdaptiveFrameSkipper(this.config.targetFrameRate);
    this.performanceMonitor = new PerformanceMonitor();
    this.memoryOptimizer = new MemoryOptimizer();
  }

  async processFrame(
    videoElement: HTMLVideoElement,
    hands: any, // MediaPipe Hands instance
    onResults: (results: any) => void
  ): Promise<void> {
    const now = performance.now();

    // フレームレート制限
    if (now - this.lastFrameTime < 1000 / this.config.targetFrameRate) {
      return;
    }

    // 処理中の場合はスキップ
    if (this.isProcessing) {
      this.performanceMonitor.endFrame(true);
      return;
    }

    // 適応的フレームスキッピング
    if (this.config.adaptiveFrameSkipping && this.shouldSkipFrame()) {
      this.performanceMonitor.endFrame(true);
      return;
    }

    this.isProcessing = true;
    this.performanceMonitor.startFrame();

    try {
      // フレームプールからキャンバスを取得
      const canvas = this.framePool.getFrame(
        videoElement.videoWidth,
        videoElement.videoHeight
      );
      const ctx = canvas.getContext('2d')!;

      // ビデオフレームをキャンバスに描画
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

      // MediaPipe処理
      await this.processWithTimeout(hands, canvas, onResults);

      // キャンバスをプールに戻す
      this.framePool.returnFrame(canvas);

      this.lastFrameTime = now;
      this.frameCounter++;
    } catch (error) {
      console.error('Frame processing error:', error);
    } finally {
      this.isProcessing = false;
      this.performanceMonitor.endFrame();

      // 定期的なメモリ最適化
      if (this.config.autoGarbageCollection) {
        this.memoryOptimizer.checkAndOptimize();
      }
    }
  }

  private async processWithTimeout(
    hands: any,
    canvas: HTMLCanvasElement,
    onResults: (results: any) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Processing timeout'));
      }, this.config.maxProcessingTime);

      hands.onResults((results: any) => {
        clearTimeout(timeout);
        onResults(results);
        resolve();
      });

      hands.send({ image: canvas });
    });
  }

  private shouldSkipFrame(): boolean {
    if (this.frameCounter % this.frameSkipper.getSkipRatio() !== 0) {
      return true;
    }
    return false;
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }

  updateConfiguration(newConfig: Partial<MediaPipeOptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.frameSkipper = new AdaptiveFrameSkipper(this.config.targetFrameRate);
  }

  optimizeForDevice(): void {
    // デバイス性能に基づく自動最適化
    const devicePerformance = this.detectDevicePerformance();

    if (devicePerformance === 'low') {
      this.updateConfiguration({
        modelComplexity: 0,
        targetFrameRate: 15,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
        maxProcessingTime: 66, // 15fps
      });
    } else if (devicePerformance === 'medium') {
      this.updateConfiguration({
        modelComplexity: 0,
        targetFrameRate: 24,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
        maxProcessingTime: 42, // 24fps
      });
    } else {
      // high performance - デフォルト設定を使用
    }
  }

  private detectDevicePerformance(): 'low' | 'medium' | 'high' {
    // ハードウェア並行性（CPUコア数の概算）
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    // メモリ情報（利用可能な場合）
    const deviceMemory = (navigator as any).deviceMemory || 4;

    // 接続速度
    const connection = (navigator as any).connection;
    const effectiveType = connection?.effectiveType || '4g';

    // User Agent からの推定
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobile = /mobile|android|iphone|ipad/.test(userAgent);

    // スコア計算
    let score = 0;

    if (hardwareConcurrency >= 8) score += 3;
    else if (hardwareConcurrency >= 4) score += 2;
    else score += 1;

    if (deviceMemory >= 8) score += 3;
    else if (deviceMemory >= 4) score += 2;
    else score += 1;

    if (effectiveType === '4g') score += 2;
    else if (effectiveType === '3g') score += 1;

    if (!isMobile) score += 1;

    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  dispose(): void {
    this.framePool.clear();
    this.performanceMonitor.reset();
  }
}

// WebWorkerでのMediaPipe処理
export class MediaPipeWorkerManager {
  private worker: Worker | null = null;
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.worker || this.isInitialized) return;

    try {
      // WebWorkerを作成
      const workerScript = this.createWorkerScript();
      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);

      this.worker = new Worker(workerUrl);

      // 初期化完了を待機
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Worker initialization timeout'));
        }, 10000);

        this.worker!.onmessage = (event) => {
          if (event.data.type === 'initialized') {
            clearTimeout(timeout);
            this.isInitialized = true;
            resolve();
          } else if (event.data.type === 'error') {
            clearTimeout(timeout);
            reject(new Error(event.data.message));
          }
        };

        this.worker!.postMessage({ type: 'initialize' });
      });

      URL.revokeObjectURL(workerUrl);
    } catch (error) {
      console.error('Failed to initialize MediaPipe worker:', error);
      throw error;
    }
  }

  async processFrame(imageData: ImageData): Promise<any> {
    if (!this.worker || !this.isInitialized) {
      throw new Error('Worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Processing timeout'));
      }, 5000);

      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === 'results') {
          clearTimeout(timeout);
          this.worker?.removeEventListener('message', messageHandler);
          resolve(event.data.results);
        } else if (event.data.type === 'error') {
          clearTimeout(timeout);
          this.worker?.removeEventListener('message', messageHandler);
          reject(new Error(event.data.message));
        }
      };

      this.worker?.addEventListener('message', messageHandler);
      this.worker?.postMessage({
        type: 'process',
        imageData: imageData,
      });
    });
  }

  private createWorkerScript(): string {
    return `
      importScripts('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js');
      
      let hands = null;
      
      self.onmessage = async function(event) {
        const { type, imageData } = event.data;
        
        if (type === 'initialize') {
          try {
            hands = new Hands({
              locateFile: (file) => \`https://cdn.jsdelivr.net/npm/@mediapipe/hands/\${file}\`
            });
            
            hands.setOptions({
              maxNumHands: 1,
              modelComplexity: 1,
              minDetectionConfidence: 0.5,
              minTrackingConfidence: 0.5
            });
            
            hands.onResults((results) => {
              self.postMessage({ type: 'results', results });
            });
            
            self.postMessage({ type: 'initialized' });
          } catch (error) {
            self.postMessage({ type: 'error', message: error.message });
          }
        } else if (type === 'process' && hands) {
          try {
            await hands.send({ image: imageData });
          } catch (error) {
            self.postMessage({ type: 'error', message: error.message });
          }
        }
      };
    `;
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}

// React Hook for optimized MediaPipe
import { useRef, useState, useEffect, useCallback } from 'react';

export function useOptimizedMediaPipe(
  config?: Partial<MediaPipeOptimizationConfig>
) {
  const managerRef = useRef<OptimizedMediaPipeManager | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    managerRef.current = new OptimizedMediaPipeManager(config);

    // 定期的なメトリクス更新
    const interval = setInterval(() => {
      if (managerRef.current) {
        setMetrics(managerRef.current.getPerformanceMetrics());
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      if (managerRef.current) {
        managerRef.current.dispose();
      }
    };
  }, []);

  const processFrame = useCallback(
    async (
      videoElement: HTMLVideoElement,
      hands: any,
      onResults: (results: any) => void
    ) => {
      if (managerRef.current) {
        await managerRef.current.processFrame(videoElement, hands, onResults);
      }
    },
    []
  );

  const updateConfig = useCallback(
    (newConfig: Partial<MediaPipeOptimizationConfig>) => {
      if (managerRef.current) {
        managerRef.current.updateConfiguration(newConfig);
      }
    },
    []
  );

  const optimizeForDevice = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.optimizeForDevice();
    }
  }, []);

  return {
    processFrame,
    updateConfig,
    optimizeForDevice,
    metrics,
  };
}

declare const React: any;
