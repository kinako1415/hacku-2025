/**
 * サービスワーカー・オフライン機能統合サービス
 * PWA機能、オフライン対応、キャッシュ管理を統合
 */

import { useState, useEffect, useCallback } from 'react';
import { useFeedbackIntegration } from './feedback-integration';

/**
 * サービスワーカーの状態
 */
type ServiceWorkerState =
  | 'installing'
  | 'installed'
  | 'waiting'
  | 'active'
  | 'redundant'
  | 'not-supported';

/**
 * キャッシュ戦略
 */
type CacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate';

/**
 * オフライン対応統合状態
 */
interface OfflineIntegrationState {
  serviceWorkerState: ServiceWorkerState;
  isOnline: boolean;
  isInstalling: boolean;
  updateAvailable: boolean;
  cacheSize: number;
  lastSync: Date | null;
  syncProgress: number;
  pendingSync: string[];
}

/**
 * PWA インストール状態
 */
interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  installPrompt: any | null;
}

/**
 * オフライン統合フック
 */
export const useOfflineIntegration = () => {
  const { showNotification, showSuccess, showWarning, showError } =
    useFeedbackIntegration();

  const [state, setState] = useState<OfflineIntegrationState>({
    serviceWorkerState: 'not-supported',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isInstalling: false,
    updateAvailable: false,
    cacheSize: 0,
    lastSync: null,
    syncProgress: 0,
    pendingSync: [],
  });

  const [pwaState, setPWAState] = useState<PWAInstallState>({
    canInstall: false,
    isInstalled: false,
    installPrompt: null,
  });

  // サービスワーカー登録
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      setState((prev) => ({ ...prev, serviceWorkerState: 'not-supported' }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, isInstalling: true }));

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // 登録状態の監視
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        setState((prev) => ({ ...prev, serviceWorkerState: 'installing' }));

        newWorker.addEventListener('statechange', () => {
          const workerState = newWorker.state as ServiceWorkerState;
          switch (workerState) {
            case 'installed':
              setState((prev) => ({
                ...prev,
                serviceWorkerState: 'installed',
              }));
              if (navigator.serviceWorker.controller) {
                setState((prev) => ({ ...prev, updateAvailable: true }));
                showNotification({
                  type: 'info',
                  title: 'アップデート利用可能',
                  message: '新しいバージョンが利用可能です',
                  action: {
                    label: '更新',
                    onClick: () => updateServiceWorker(),
                  },
                });
              } else {
                showSuccess(
                  'インストール完了',
                  'オフライン機能が有効になりました'
                );
              }
              break;
            case 'waiting':
              setState((prev) => ({ ...prev, serviceWorkerState: 'waiting' }));
              break;
            case 'active':
              setState((prev) => ({ ...prev, serviceWorkerState: 'active' }));
              break;
            case 'redundant':
              setState((prev) => ({
                ...prev,
                serviceWorkerState: 'redundant',
              }));
              break;
          }
        });
      });

      // 既存のサービスワーカーが存在する場合
      if (registration.active) {
        setState((prev) => ({ ...prev, serviceWorkerState: 'active' }));
      }

      setState((prev) => ({ ...prev, isInstalling: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isInstalling: false,
        serviceWorkerState: 'not-supported',
      }));

      if (error instanceof Error) {
        showError('サービスワーカー登録失敗', error.message);
      }
    }
  }, [showNotification, showSuccess, showError]);

  // サービスワーカー更新
  const updateServiceWorker = useCallback(async () => {
    if (!navigator.serviceWorker.controller) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });

        // ページリロードを促す
        showNotification({
          type: 'success',
          title: '更新完了',
          message: 'ページを再読み込みして変更を適用してください',
          action: {
            label: '再読み込み',
            onClick: () => window.location.reload(),
          },
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        showError('更新失敗', error.message);
      }
    }
  }, [showNotification, showError]);

  // PWA インストールプロンプト監視
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setPWAState((prev) => ({
        ...prev,
        canInstall: true,
        installPrompt: e,
      }));

      showNotification({
        type: 'info',
        title: 'アプリインストール',
        message: 'ホーム画面にアプリを追加できます',
        action: {
          label: 'インストール',
          onClick: () => installPWA(),
        },
        duration: 10000,
      });
    };

    const handleAppInstalled = () => {
      setPWAState((prev) => ({
        ...prev,
        canInstall: false,
        isInstalled: true,
        installPrompt: null,
      }));

      showSuccess('インストール完了', 'アプリがホーム画面に追加されました');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);

      return () => {
        window.removeEventListener(
          'beforeinstallprompt',
          handleBeforeInstallPrompt
        );
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    return () => {}; // デフォルトの戻り値
  }, [showNotification, showSuccess]);

  // PWA インストール実行
  const installPWA = useCallback(async () => {
    if (!pwaState.installPrompt) return;

    try {
      const result = await pwaState.installPrompt.prompt();

      if (result.outcome === 'accepted') {
        showSuccess('インストール開始', 'アプリをインストールしています...');
      } else {
        showWarning('インストール中断', 'インストールがキャンセルされました');
      }

      setPWAState((prev) => ({ ...prev, installPrompt: null }));
    } catch (error) {
      if (error instanceof Error) {
        showError('インストール失敗', error.message);
      }
    }
  }, [pwaState.installPrompt, showSuccess, showWarning, showError]);

  // キャッシュサイズ計算
  const calculateCacheSize = useCallback(async () => {
    if (!('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();

        for (const request of keys) {
          const response = await cache.match(request);
          if (response) {
            const blob = await response.blob();
            totalSize += blob.size;
          }
        }
      }

      setState((prev) => ({ ...prev, cacheSize: totalSize }));
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
    }
  }, []);

  // キャッシュクリア
  const clearCache = useCallback(async () => {
    if (!('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      setState((prev) => ({ ...prev, cacheSize: 0 }));
      showSuccess('キャッシュクリア', 'すべてのキャッシュが削除されました');
    } catch (error) {
      if (error instanceof Error) {
        showError('キャッシュクリア失敗', error.message);
      }
    }
  }, [showSuccess, showError]);

  // バックグラウンド同期
  const requestBackgroundSync = useCallback(
    async (tag: string) => {
      if (!('serviceWorker' in navigator) || !navigator.serviceWorker.ready)
        return;

      try {
        const registration = await navigator.serviceWorker.ready;

        if ('sync' in registration) {
          await (registration as any).sync.register(tag);

          setState((prev) => ({
            ...prev,
            pendingSync: [...prev.pendingSync, tag],
          }));

          showNotification({
            type: 'info',
            title: 'バックグラウンド同期',
            message: 'オンライン復帰時に同期されます',
            duration: 3000,
          });
        }
      } catch (error) {
        if (error instanceof Error) {
          showError('同期登録失敗', error.message);
        }
      }
    },
    [showNotification, showError]
  );

  // 同期完了通知の受信
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SYNC_COMPLETE') {
        const { tag, success } = event.data;

        setState((prev) => ({
          ...prev,
          pendingSync: prev.pendingSync.filter((t) => t !== tag),
          lastSync: new Date(),
        }));

        if (success) {
          showSuccess('同期完了', 'データが正常に同期されました');
        } else {
          showWarning('同期失敗', '一部のデータの同期に失敗しました');
        }
      }
    };

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }

    return () => {}; // デフォルトの戻り値
  }, [showSuccess, showWarning]);

  // ネットワーク状態監視
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));

      // オンライン復帰時の同期
      if (state.pendingSync.length > 0) {
        showNotification({
          type: 'info',
          title: 'オンライン復帰',
          message: 'データを同期しています...',
          duration: 3000,
        });
      }
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {}; // デフォルトの戻り値
  }, [state.pendingSync, showNotification]);

  // 初期化
  useEffect(() => {
    registerServiceWorker();
    calculateCacheSize();
  }, [registerServiceWorker, calculateCacheSize]);

  // キャッシュサイズ定期更新
  useEffect(() => {
    const interval = setInterval(calculateCacheSize, 5 * 60 * 1000); // 5分間隔
    return () => clearInterval(interval);
  }, [calculateCacheSize]);

  // オフライン対応のネットワークリクエスト
  const fetchWithFallback = useCallback(
    async (
      url: string,
      options: RequestInit = {},
      cacheStrategy: CacheStrategy = 'network-first'
    ): Promise<Response> => {
      if (!('caches' in window)) {
        return fetch(url, options);
      }

      const cache = await caches.open('api-cache-v1');
      const cacheKey = new Request(url, options);

      switch (cacheStrategy) {
        case 'cache-first':
          try {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) {
              return cachedResponse;
            }

            const networkResponse = await fetch(url, options);
            if (networkResponse.ok) {
              cache.put(cacheKey, networkResponse.clone());
            }
            return networkResponse;
          } catch (error) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) {
              return cachedResponse;
            }
            throw error;
          }

        case 'stale-while-revalidate':
          const cachedResponse = await cache.match(cacheKey);

          // バックグラウンドで更新
          const networkPromise = fetch(url, options).then((response) => {
            if (response.ok) {
              cache.put(cacheKey, response.clone());
            }
            return response;
          });

          // キャッシュがあれば即座に返す
          if (cachedResponse) {
            return cachedResponse;
          }

          return networkPromise;

        case 'network-first':
        default:
          try {
            const networkResponse = await fetch(url, options);
            if (networkResponse.ok) {
              cache.put(cacheKey, networkResponse.clone());
            }
            return networkResponse;
          } catch (error) {
            const cachedResponse = await cache.match(cacheKey);
            if (cachedResponse) {
              showWarning('オフライン', 'キャッシュからデータを取得しました');
              return cachedResponse;
            }
            throw error;
          }
      }
    },
    [showWarning]
  );

  return {
    // 状態
    ...state,
    ...pwaState,

    // サービスワーカー操作
    registerServiceWorker,
    updateServiceWorker,

    // PWA操作
    installPWA,

    // キャッシュ操作
    calculateCacheSize,
    clearCache,

    // 同期操作
    requestBackgroundSync,

    // ネットワーク操作
    fetchWithFallback,
  };
};

/**
 * オフライン状態監視フック
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return undefined;
  }, []);

  return { isOnline };
};

/**
 * PWA機能検出フック
 */
export const usePWACapabilities = () => {
  const [capabilities, setCapabilities] = useState({
    canInstall: false,
    hasServiceWorker: 'serviceWorker' in navigator,
    hasNotifications: 'Notification' in window,
    hasPushManager: 'PushManager' in window,
    hasBackgroundSync: false,
    hasPeriodicBackgroundSync: false,
  });

  useEffect(() => {
    const checkCapabilities = async () => {
      let hasBackgroundSync = false;
      let hasPeriodicBackgroundSync = false;

      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          hasBackgroundSync = 'sync' in registration;
          hasPeriodicBackgroundSync = 'periodicSync' in registration;
        } catch (error) {
          console.error('Failed to check PWA capabilities:', error);
        }
      }

      setCapabilities((prev) => ({
        ...prev,
        hasBackgroundSync,
        hasPeriodicBackgroundSync,
      }));
    };

    checkCapabilities();
    return () => {}; // デフォルトの戻り値
  }, []);

  return capabilities;
};

/**
 * キャッシュユーティリティ
 */
export const cacheUtils = {
  /**
   * 指定したキャッシュからアイテムを取得
   */
  async getFromCache(
    cacheName: string,
    request: string | Request
  ): Promise<Response | undefined> {
    if (!('caches' in window)) return undefined;

    try {
      const cache = await caches.open(cacheName);
      return await cache.match(request);
    } catch (error) {
      console.error('Failed to get from cache:', error);
      return undefined;
    }
  },

  /**
   * 指定したキャッシュにアイテムを保存
   */
  async putToCache(
    cacheName: string,
    request: string | Request,
    response: Response
  ): Promise<void> {
    if (!('caches' in window)) return;

    try {
      const cache = await caches.open(cacheName);
      await cache.put(request, response);
    } catch (error) {
      console.error('Failed to put to cache:', error);
    }
  },

  /**
   * 指定したキャッシュからアイテムを削除
   */
  async deleteFromCache(
    cacheName: string,
    request: string | Request
  ): Promise<boolean> {
    if (!('caches' in window)) return false;

    try {
      const cache = await caches.open(cacheName);
      return await cache.delete(request);
    } catch (error) {
      console.error('Failed to delete from cache:', error);
      return false;
    }
  },

  /**
   * キャッシュ内のすべてのキーを取得
   */
  async getCacheKeys(cacheName: string): Promise<readonly Request[]> {
    if (!('caches' in window)) return [];

    try {
      const cache = await caches.open(cacheName);
      return await cache.keys();
    } catch (error) {
      console.error('Failed to get cache keys:', error);
      return [];
    }
  },
};
