/**
 * PWA サービスワーカー登録とPWA機能管理
 *
 * 機能:
 * - サービスワーカーの登録・更新
 * - インストールプロンプト管理
 * - オフライン状態監視
 * - バックグラウンド同期
 * - プッシュ通知管理
 */

export interface PWAConfig {
  enableServiceWorker: boolean;
  enablePushNotifications: boolean;
  enableBackgroundSync: boolean;
  updateCheckInterval: number; // 分
  offlinePageUrl: string;
}

export interface PWAState {
  isSupported: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  serviceWorkerRegistration: ServiceWorkerRegistration | null;
}

// デフォルト設定
const DEFAULT_PWA_CONFIG: PWAConfig = {
  enableServiceWorker: true,
  enablePushNotifications: true,
  enableBackgroundSync: true,
  updateCheckInterval: 60, // 1時間
  offlinePageUrl: '/offline',
};

export class PWAManager {
  private config: PWAConfig;
  private state: PWAState;
  private updateCheckTimer?: NodeJS.Timeout;
  private stateChangeCallback?: (state: PWAState) => void;

  constructor(config: Partial<PWAConfig> = {}) {
    this.config = { ...DEFAULT_PWA_CONFIG, ...config };
    this.state = {
      isSupported: this.checkPWASupport(),
      isInstalled: this.checkInstallationStatus(),
      isOnline: navigator.onLine,
      hasUpdate: false,
      installPrompt: null,
      serviceWorkerRegistration: null,
    };

    this.setupEventListeners();
  }

  // PWAサポート確認
  private checkPWASupport(): boolean {
    return (
      'serviceWorker' in navigator &&
      'manifest' in document.documentElement &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  // インストール状況確認
  private checkInstallationStatus(): boolean {
    // スタンドアロンモードまたはディスプレイモードで動作しているか
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  // イベントリスナーセットアップ
  private setupEventListeners(): void {
    // オンライン/オフライン状態監視
    window.addEventListener('online', () => {
      this.updateState({ isOnline: true });
      this.triggerBackgroundSync();
    });

    window.addEventListener('offline', () => {
      this.updateState({ isOnline: false });
    });

    // インストールプロンプト監視
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.updateState({ installPrompt: event as BeforeInstallPromptEvent });
    });

    // アプリがインストールされた時の監視
    window.addEventListener('appinstalled', () => {
      this.updateState({ isInstalled: true, installPrompt: null });
    });
  }

  // 状態更新
  private updateState(newState: Partial<PWAState>): void {
    this.state = { ...this.state, ...newState };
    this.stateChangeCallback?.(this.state);
  }

  // サービスワーカー登録
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.state.isSupported || !this.config.enableServiceWorker) {
      console.log('Service Worker not supported or disabled');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      console.log('Service Worker registered successfully');
      this.updateState({ serviceWorkerRegistration: registration });

      // 更新監視
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              this.updateState({ hasUpdate: true });
            }
          });
        }
      });

      // 定期的な更新チェック
      this.startUpdateChecker(registration);

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  // 定期的な更新チェック
  private startUpdateChecker(registration: ServiceWorkerRegistration): void {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer);
    }

    this.updateCheckTimer = setInterval(
      () => {
        registration.update().catch((error) => {
          console.error('Service Worker update check failed:', error);
        });
      },
      this.config.updateCheckInterval * 60 * 1000
    );
  }

  // サービスワーカー更新適用
  async applyUpdate(): Promise<void> {
    if (!this.state.serviceWorkerRegistration) {
      throw new Error('No service worker registration found');
    }

    const waiting = this.state.serviceWorkerRegistration.waiting;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });

      // ページリロード
      window.location.reload();
    }
  }

  // インストールプロンプト表示
  async showInstallPrompt(): Promise<boolean> {
    if (!this.state.installPrompt) {
      throw new Error('Install prompt not available');
    }

    try {
      const result = await this.state.installPrompt.prompt();
      const userChoice = await this.state.installPrompt.userChoice;

      this.updateState({ installPrompt: null });

      return userChoice.outcome === 'accepted';
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }

  // プッシュ通知許可要求
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('Notifications not supported');
    }

    const permission = await Notification.requestPermission();

    if (permission === 'granted' && this.state.serviceWorkerRegistration) {
      await this.subscribeToPushNotifications();
    }

    return permission;
  }

  // プッシュ通知購読
  private async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    if (!this.state.serviceWorkerRegistration) {
      throw new Error('Service worker not registered');
    }

    try {
      // VAPID公開鍵（実際の実装では環境変数から取得）
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

      const subscription =
        await this.state.serviceWorkerRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidPublicKey,
        });

      // サーバーに購読情報を送信
      await this.sendSubscriptionToServer(subscription);

      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  // サーバーに購読情報送信
  private async sendSubscriptionToServer(
    subscription: PushSubscription
  ): Promise<void> {
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
    }
  }

  // バックグラウンド同期トリガー
  async triggerBackgroundSync(): Promise<void> {
    if (
      !this.state.serviceWorkerRegistration ||
      !this.config.enableBackgroundSync
    ) {
      return;
    }

    try {
      // Background Sync APIの型チェック
      if ('sync' in this.state.serviceWorkerRegistration) {
        const syncManager = (this.state.serviceWorkerRegistration as any).sync;
        await syncManager.register('measurement-sync');
        await syncManager.register('calendar-sync');
        console.log('Background sync registered');
      } else {
        console.warn('Background sync not supported');
      }
    } catch (error) {
      console.error('Background sync registration failed:', error);
    }
  }

  // ローカル通知送信
  async showLocalNotification(
    title: string,
    options: NotificationOptions = {}
  ): Promise<void> {
    if (Notification.permission !== 'granted') {
      await this.requestNotificationPermission();
    }

    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        ...options,
      });
    }
  }

  // キャッシュクリア
  async clearCache(): Promise<void> {
    if (!this.state.serviceWorkerRegistration) {
      return;
    }

    try {
      // サービスワーカーにキャッシュクリア指示
      const channel = new MessageChannel();
      this.state.serviceWorkerRegistration.active?.postMessage(
        { type: 'CLEAR_CACHE' },
        [channel.port2]
      );

      // ブラウザキャッシュもクリア（可能な場合）
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }

      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  // PWA診断情報取得
  async getDiagnostics(): Promise<object> {
    const diagnostics: any = {
      pwaSupport: this.state.isSupported,
      isInstalled: this.state.isInstalled,
      isOnline: this.state.isOnline,
      hasServiceWorker: !!this.state.serviceWorkerRegistration,
      notificationPermission:
        'Notification' in window ? Notification.permission : 'unsupported',
      hasInstallPrompt: !!this.state.installPrompt,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      language: navigator.language,
      hardwareConcurrency: navigator.hardwareConcurrency,
    };

    // ストレージ情報
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        diagnostics.storage = {
          quota: estimate.quota,
          usage: estimate.usage,
        };
      } catch (error) {
        diagnostics.storageError =
          error instanceof Error ? error.message : 'Unknown storage error';
      }
    }

    // ネットワーク情報
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      diagnostics.connection = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };
    }

    // デバイスメモリ
    if ('deviceMemory' in navigator) {
      diagnostics.deviceMemory = (navigator as any).deviceMemory;
    }

    return diagnostics;
  }

  // 状態変更監視登録
  setStateChangeCallback(callback: (state: PWAState) => void): void {
    this.stateChangeCallback = callback;
  }

  // クリーンアップ
  dispose(): void {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer);
    }
  }

  // 現在の状態取得
  getState(): PWAState {
    return { ...this.state };
  }
}

// BeforeInstallPromptEvent型定義
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// React Hook
import { useState, useEffect } from 'react';

export function usePWA(config?: Partial<PWAConfig>) {
  const [pwaManager] = useState(() => new PWAManager(config));
  const [state, setState] = useState<PWAState>(pwaManager.getState());

  useEffect(() => {
    pwaManager.setStateChangeCallback(setState);

    // サービスワーカー自動登録
    pwaManager.registerServiceWorker();

    return () => {
      pwaManager.dispose();
    };
  }, [pwaManager]);

  return {
    ...state,
    showInstallPrompt: () => pwaManager.showInstallPrompt(),
    requestNotificationPermission: () =>
      pwaManager.requestNotificationPermission(),
    applyUpdate: () => pwaManager.applyUpdate(),
    clearCache: () => pwaManager.clearCache(),
    triggerBackgroundSync: () => pwaManager.triggerBackgroundSync(),
    showLocalNotification: (title: string, options?: NotificationOptions) =>
      pwaManager.showLocalNotification(title, options),
    getDiagnostics: () => pwaManager.getDiagnostics(),
  };
}
