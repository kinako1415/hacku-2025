/**
 * Service Worker for PWA functionality
 *
 * 機能:
 * - キャッシュ管理（アプリシェル、API応答、画像）
 * - オフライン対応
 * - バックグラウンド同期
 * - プッシュ通知
 * - データベース同期
 */

const CACHE_NAME = 'rehab-ai-v1.0.0';
const RUNTIME_CACHE = 'runtime-cache-v1';
const API_CACHE = 'api-cache-v1';
const IMAGES_CACHE = 'images-cache-v1';

// キャッシュするリソース
const STATIC_ASSETS = [
  '/',
  '/measurement',
  '/calendar',
  '/dashboard',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // CSS and JS files will be added by Next.js build process
];

// MediaPipe関連のリソース
const MEDIAPIPE_ASSETS = [
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands_solution_packed_assets.data',
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands_solution_simd_wasm_bin.wasm',
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands_solution_packed_assets_loader.js',
];

// インストール時の処理
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // MediaPipeリソースを別途キャッシュ
        return caches.open('mediapipe-cache');
      })
      .then((cache) => {
        console.log('Caching MediaPipe assets...');
        return cache.addAll(MEDIAPIPE_ASSETS);
      })
      .then(() => {
        // 即座にアクティブになる
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Failed to cache resources:', error);
      })
  );
});

// アクティベート時の処理
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // 古いキャッシュを削除
              return (
                cacheName !== CACHE_NAME &&
                cacheName !== RUNTIME_CACHE &&
                cacheName !== API_CACHE &&
                cacheName !== IMAGES_CACHE &&
                cacheName !== 'mediapipe-cache'
              );
            })
            .map((cacheName) => {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // 即座にクライアントを制御する
        return self.clients.claim();
      })
  );
});

// フェッチイベントの処理
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // GET以外のリクエストはキャッシュしない
  if (request.method !== 'GET') {
    return;
  }

  // MediaPipeリソースの処理
  if (
    url.origin === 'https://cdn.jsdelivr.net' &&
    url.pathname.includes('mediapipe')
  ) {
    event.respondWith(handleMediaPipeRequest(request));
    return;
  }

  // APIリクエストの処理
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // 画像リクエストの処理
  if (request.destination === 'image') {
    event.respondWith(handleImageRequest(request));
    return;
  }

  // 静的リソースの処理
  event.respondWith(handleStaticRequest(request));
});

// MediaPipeリソースの処理
async function handleMediaPipeRequest(request) {
  const cache = await caches.open('mediapipe-cache');
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('MediaPipe resource fetch failed:', error);
    return new Response('MediaPipe resource unavailable', { status: 503 });
  }
}

// APIリクエストの処理
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // 成功したAPIレスポンスをキャッシュ
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('API request failed, checking cache:', error);

    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // オフライン用のフォールバック
    return new Response(
      JSON.stringify({
        error: 'オフラインです。インターネット接続を確認してください。',
        offline: true,
        timestamp: Date.now(),
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// 画像リクエストの処理
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGES_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Image fetch failed, using placeholder');

    // プレースホルダー画像を返す
    return new Response(new Blob([''], { type: 'image/svg+xml' }), {
      status: 200,
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }
}

// 静的リソースの処理
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // ランタイムキャッシュに追加
      const runtimeCache = await caches.open(RUNTIME_CACHE);
      await runtimeCache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Static resource fetch failed:', error);

    // ランタイムキャッシュを確認
    const runtimeCache = await caches.open(RUNTIME_CACHE);
    const runtimeResponse = await runtimeCache.match(request);

    if (runtimeResponse) {
      return runtimeResponse;
    }

    // HTMLページの場合はオフラインページを返す
    if (request.headers.get('accept')?.includes('text/html')) {
      const offlineResponse = await cache.match('/offline');
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    return new Response('リソースが利用できません', { status: 503 });
  }
}

// バックグラウンド同期
self.addEventListener('sync', (event) => {
  if (event.tag === 'measurement-sync') {
    event.waitUntil(syncMeasurementData());
  } else if (event.tag === 'calendar-sync') {
    event.waitUntil(syncCalendarData());
  }
});

// 測定データの同期
async function syncMeasurementData() {
  try {
    console.log('Syncing measurement data...');

    // IndexedDBから未同期のデータを取得
    const db = await openIndexedDB();
    const measurements = await getUnsyncedMeasurements(db);

    for (const measurement of measurements) {
      try {
        const response = await fetch('/api/measurements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(measurement),
        });

        if (response.ok) {
          // 同期済みとしてマーク
          await markMeasurementAsSynced(db, measurement.id);
          console.log('Measurement synced:', measurement.id);
        }
      } catch (error) {
        console.error('Failed to sync measurement:', measurement.id, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// カレンダーデータの同期
async function syncCalendarData() {
  try {
    console.log('Syncing calendar data...');

    const db = await openIndexedDB();
    const records = await getUnsyncedCalendarRecords(db);

    for (const record of records) {
      try {
        const response = await fetch('/api/calendar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(record),
        });

        if (response.ok) {
          await markCalendarRecordAsSynced(db, record.id);
          console.log('Calendar record synced:', record.id);
        }
      } catch (error) {
        console.error('Failed to sync calendar record:', record.id, error);
      }
    }
  } catch (error) {
    console.error('Calendar sync failed:', error);
  }
}

// IndexedDBヘルパー関数
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RehabDatabase', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('measurements')) {
        const store = db.createObjectStore('measurements', { keyPath: 'id' });
        store.createIndex('synced', 'synced', { unique: false });
      }

      if (!db.objectStoreNames.contains('calendarRecords')) {
        const store = db.createObjectStore('calendarRecords', {
          keyPath: 'id',
        });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
  });
}

function getUnsyncedMeasurements(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['measurements'], 'readonly');
    const store = transaction.objectStore('measurements');
    const index = store.index('synced');
    const request = index.getAll(false);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function getUnsyncedCalendarRecords(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['calendarRecords'], 'readonly');
    const store = transaction.objectStore('calendarRecords');
    const index = store.index('synced');
    const request = index.getAll(false);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function markMeasurementAsSynced(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['measurements'], 'readwrite');
    const store = transaction.objectStore('measurements');
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const measurement = request.result;
      if (measurement) {
        measurement.synced = true;
        measurement.syncedAt = new Date();
        const updateRequest = store.put(measurement);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve();
      } else {
        resolve();
      }
    };
  });
}

function markCalendarRecordAsSynced(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['calendarRecords'], 'readwrite');
    const store = transaction.objectStore('calendarRecords');
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const record = request.result;
      if (record) {
        record.synced = true;
        record.syncedAt = new Date();
        const updateRequest = store.put(record);
        updateRequest.onerror = () => reject(updateRequest.error);
        updateRequest.onsuccess = () => resolve();
      } else {
        resolve();
      }
    };
  });
}

// プッシュ通知の処理
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      {
        action: 'open',
        title: '開く',
      },
      {
        action: 'dismiss',
        title: '閉じる',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 通知クリックの処理
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    const url = event.notification.data?.url || '/';

    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // 既存のウィンドウがあれば焦点を当てる
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }

        // 新しいウィンドウを開く
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

// メッセージイベントの処理
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
