/**
 * カメラサービスライブラリ
 * Webカメラの制御とストリーミング管理
 */

export interface CameraConfig {
  width: number;
  height: number;
  frameRate: number;
  facingMode: 'user' | 'environment';
  aspectRatio?: number;
}

export interface CameraStatus {
  isActive: boolean;
  isInitialized: boolean;
  hasPermission: boolean;
  error: string | null;
  deviceId: string | null;
  resolution: { width: number; height: number } | null;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
  kind: string;
}

export interface CameraCallbacks {
  onStreamStart: (stream: MediaStream) => void;
  onStreamStop: () => void;
  onError: (error: Error) => void;
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

/**
 * デフォルトカメラ設定
 */
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  width: 640,
  height: 480,
  frameRate: 30,
  facingMode: 'user', // フロントカメラ
  aspectRatio: 4 / 3,
};

/**
 * カメラサービスクラス
 */
export class CameraService {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private config: CameraConfig;
  private callbacks: CameraCallbacks;
  private status: CameraStatus;

  constructor(config: Partial<CameraConfig> = {}, callbacks: CameraCallbacks) {
    this.config = { ...DEFAULT_CAMERA_CONFIG, ...config };
    this.callbacks = callbacks;
    this.status = {
      isActive: false,
      isInitialized: false,
      hasPermission: false,
      error: null,
      deviceId: null,
      resolution: null,
    };
  }

  /**
   * カメラの初期化とストリーム開始
   */
  async initialize(videoElement: HTMLVideoElement): Promise<void> {
    try {
      this.videoElement = videoElement;

      // ユーザーメディアの制約設定
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: this.config.width },
          height: { ideal: this.config.height },
          frameRate: { ideal: this.config.frameRate },
          facingMode: this.config.facingMode,
        },
        audio: false, // 音声は不要
      };

      // カメラストリームを取得
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);

      // ビデオエレメントにストリームを設定
      this.videoElement.srcObject = this.stream;

      // メタデータ読み込み完了を待機
      await new Promise<void>((resolve, reject) => {
        this.videoElement!.onloadedmetadata = () => {
          resolve();
        };
        this.videoElement!.onerror = (error) => {
          reject(new Error('Video element error'));
        };
      });

      // ビデオ再生開始
      await this.videoElement.play();

      // ステータス更新
      this.updateStatus({
        isActive: true,
        isInitialized: true,
        hasPermission: true,
        error: null,
        resolution: {
          width: this.videoElement.videoWidth,
          height: this.videoElement.videoHeight,
        },
      });

      // 成功コールバック
      this.callbacks.onPermissionGranted();
      this.callbacks.onStreamStart(this.stream);

      console.log('CameraService: カメラが正常に初期化されました', {
        resolution: this.status.resolution,
        deviceId: this.getActiveDeviceId(),
      });
    } catch (error) {
      const errorMessage = this.handleCameraError(error);
      this.updateStatus({
        isActive: false,
        isInitialized: false,
        hasPermission: false,
        error: errorMessage.message,
      });

      this.callbacks.onError(errorMessage);
      this.callbacks.onPermissionDenied();

      console.error('CameraService: 初期化エラー:', errorMessage);
      throw errorMessage;
    }
  }

  /**
   * カメラストリームの停止
   */
  async stop(): Promise<void> {
    try {
      if (this.stream) {
        // すべてのトラックを停止
        this.stream.getTracks().forEach((track) => {
          track.stop();
        });
        this.stream = null;
      }

      if (this.videoElement) {
        this.videoElement.srcObject = null;
      }

      // ステータス更新
      this.updateStatus({
        isActive: false,
        error: null,
      });

      this.callbacks.onStreamStop();
      console.log('CameraService: カメラストリームが停止されました');
    } catch (error) {
      const errorMessage = new Error(`カメラ停止エラー: ${error}`);
      this.updateStatus({ error: errorMessage.message });
      this.callbacks.onError(errorMessage);
      throw errorMessage;
    }
  }

  /**
   * 利用可能なカメラデバイスの取得
   */
  async getAvailableDevices(): Promise<CameraDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter((device) => device.kind === 'videoinput')
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `カメラ ${device.deviceId.slice(0, 8)}`,
          kind: device.kind,
        }));

      console.log('CameraService: 利用可能なカメラデバイス:', cameras);
      return cameras;
    } catch (error) {
      console.error('CameraService: デバイス取得エラー:', error);
      return [];
    }
  }

  /**
   * カメラデバイスの切り替え
   */
  async switchCamera(deviceId: string): Promise<void> {
    if (this.status.isActive) {
      await this.stop();
    }

    // 新しい設定でカメラを初期化
    const newConstraints: MediaStreamConstraints = {
      video: {
        deviceId: { exact: deviceId },
        width: { ideal: this.config.width },
        height: { ideal: this.config.height },
        frameRate: { ideal: this.config.frameRate },
      },
      audio: false,
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(newConstraints);

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        await this.videoElement.play();
      }

      this.updateStatus({
        isActive: true,
        deviceId,
        error: null,
      });

      this.callbacks.onStreamStart(this.stream);
      console.log('CameraService: カメラが切り替わりました:', deviceId);
    } catch (error) {
      const errorMessage = this.handleCameraError(error);
      this.updateStatus({ error: errorMessage.message });
      this.callbacks.onError(errorMessage);
      throw errorMessage;
    }
  }

  /**
   * カメラ設定の更新
   */
  async updateConfig(newConfig: Partial<CameraConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };

    // アクティブな場合は再初期化
    if (this.status.isActive && this.videoElement) {
      await this.stop();
      await this.initialize(this.videoElement);
    }

    console.log('CameraService: 設定が更新されました:', this.config);
  }

  /**
   * 現在のフレームをキャプチャ
   */
  captureFrame(): ImageData | null {
    if (!this.videoElement || !this.status.isActive) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Canvas context not available');
      }

      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;

      context.drawImage(this.videoElement, 0, 0);

      return context.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      console.error('CameraService: フレームキャプチャエラー:', error);
      return null;
    }
  }

  /**
   * スクリーンショットの取得
   */
  takeScreenshot(): string | null {
    if (!this.videoElement || !this.status.isActive) {
      return null;
    }

    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Canvas context not available');
      }

      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;

      context.drawImage(this.videoElement, 0, 0);

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('CameraService: スクリーンショットエラー:', error);
      return null;
    }
  }

  /**
   * カメラ権限の確認
   */
  async checkPermission(): Promise<boolean> {
    try {
      const result = await navigator.permissions.query({
        name: 'camera' as PermissionName,
      });
      const hasPermission = result.state === 'granted';

      this.updateStatus({ hasPermission });
      return hasPermission;
    } catch (error) {
      console.warn('CameraService: 権限確認エラー:', error);
      return false;
    }
  }

  /**
   * エラーハンドリング
   */
  private handleCameraError(error: unknown): Error {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          return new Error('カメラのアクセス許可が拒否されました');
        case 'NotFoundError':
          return new Error('カメラデバイスが見つかりません');
        case 'NotReadableError':
          return new Error('カメラデバイスが使用中です');
        case 'OverconstrainedError':
          return new Error('カメラの設定が対応していません');
        case 'SecurityError':
          return new Error(
            'セキュリティエラーによりカメラにアクセスできません'
          );
        default:
          return new Error(`カメラエラー: ${error.message}`);
      }
    }

    return new Error(`予期しないエラー: ${error}`);
  }

  /**
   * ステータス更新
   */
  private updateStatus(updates: Partial<CameraStatus>): void {
    this.status = { ...this.status, ...updates };
  }

  /**
   * アクティブなデバイスIDの取得
   */
  private getActiveDeviceId(): string | null {
    if (!this.stream) return null;

    const videoTrack = this.stream.getVideoTracks()[0];
    return videoTrack?.getSettings()?.deviceId || null;
  }

  /**
   * 現在のステータスを取得
   */
  getStatus(): CameraStatus {
    return { ...this.status };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): CameraConfig {
    return { ...this.config };
  }

  /**
   * ストリームを取得
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * ビデオエレメントを取得
   */
  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }
}
