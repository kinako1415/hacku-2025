import { NextPage } from 'next';
import Head from 'next/head';
import { WifiOff, RefreshCw, Home, Activity, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';

const OfflinePage: NextPage = () => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // 最後の同期時間を取得
    const lastSync = localStorage.getItem('lastSyncTime');
    if (lastSync) {
      setLastSyncTime(new Date(lastSync));
    }

    // オンライン復帰の監視
    const handleOnline = () => {
      window.location.reload();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);

    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-cache',
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.log('Still offline');
    } finally {
      setIsRetrying(false);
    }
  };

  const navigateToHome = () => {
    window.location.href = '/';
  };

  const openCachedPage = (path: string) => {
    window.location.href = path;
  };

  return (
    <>
      <Head>
        <title>オフライン - RehabAI</title>
        <meta name="description" content="オフライン状態です" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* アイコン */}
          <div className="mb-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <WifiOff className="w-12 h-12 text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              オフライン状態です
            </h1>
            <p className="text-gray-600">
              インターネット接続を確認してください
            </p>
          </div>

          {/* 状態情報 */}
          <div className="mb-8 space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">接続状態</span>
              <span className="text-sm font-medium text-red-600">
                オフライン
              </span>
            </div>

            {lastSyncTime && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">最終同期</span>
                <span className="text-sm font-medium text-gray-900">
                  {lastSyncTime.toLocaleString('ja-JP')}
                </span>
              </div>
            )}
          </div>

          {/* 再試行ボタン */}
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 mb-4 flex items-center justify-center space-x-2"
          >
            <RefreshCw
              className={`w-5 h-5 ${isRetrying ? 'animate-spin' : ''}`}
            />
            <span>{isRetrying ? '接続を確認中...' : '再試行'}</span>
          </button>

          {/* キャッシュされたページへのナビゲーション */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              利用可能な機能
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={navigateToHome}
                className="flex flex-col items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <Home className="w-6 h-6 text-gray-600 mb-1" />
                <span className="text-xs font-medium text-gray-700">
                  ホーム
                </span>
              </button>

              <button
                onClick={() => openCachedPage('/measurement')}
                className="flex flex-col items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <Activity className="w-6 h-6 text-gray-600 mb-1" />
                <span className="text-xs font-medium text-gray-700">測定</span>
              </button>

              <button
                onClick={() => openCachedPage('/calendar')}
                className="flex flex-col items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <Calendar className="w-6 h-6 text-gray-600 mb-1" />
                <span className="text-xs font-medium text-gray-700">記録</span>
              </button>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="text-sm font-medium text-yellow-800 mb-2">
              オフライン使用について
            </h4>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• 測定データは端末に保存されます</li>
              <li>• オンライン復帰時に自動同期されます</li>
              <li>• 一部機能に制限があります</li>
            </ul>
          </div>

          {/* 接続ヒント */}
          <div className="mt-4 text-xs text-gray-500">
            <details className="cursor-pointer">
              <summary className="hover:text-gray-700">
                接続トラブルシューティング
              </summary>
              <div className="mt-2 space-y-1 text-left">
                <p>• WiFiまたはモバイルデータの確認</p>
                <p>• 機内モードがオフになっているか確認</p>
                <p>• ルーターの再起動</p>
                <p>• ブラウザの再読み込み</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </>
  );
};

export default OfflinePage;
