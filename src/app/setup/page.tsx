/**
 * セットアップページ
 * ユーザー設定とアプリケーション設定を管理
 */

'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.scss';

/**
 * ユーザー設定の型
 */
interface UserSettings {
  name: string;
  age: number;
  dominantHand: 'right' | 'left';
  injuryType: 'wrist' | 'thumb' | 'both';
  injuryDate?: Date;
  rehabilitationGoal: string;
  targetAngle?: number;
}

/**
 * アプリ設定の型
 */
interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'ja' | 'en';
  notifications: boolean;
  reminderTime?: string;
  measurementFrequency: 'daily' | 'weekly' | 'custom';
  autoSave: boolean;
  cameraQuality: 'low' | 'medium' | 'high';
}

/**
 * デフォルト設定
 */
const defaultUserSettings: UserSettings = {
  name: '',
  age: 0,
  dominantHand: 'right',
  injuryType: 'wrist',
  rehabilitationGoal: '',
};

const defaultAppSettings: AppSettings = {
  theme: 'auto',
  language: 'ja',
  notifications: true,
  measurementFrequency: 'daily',
  autoSave: true,
  cameraQuality: 'medium',
};

/**
 * セットアップページコンポーネント
 */
export default function SetupPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'user' | 'app' | 'camera' | 'data'
  >('user');
  const [userSettings, setUserSettings] =
    useState<UserSettings>(defaultUserSettings);
  const [appSettings, setAppSettings] =
    useState<AppSettings>(defaultAppSettings);
  const [isModified, setIsModified] = useState(false);

  // 設定の読み込み
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);

        // 実際の実装では localStorage や API からデータを読み込む
        const savedUserSettings = localStorage.getItem('userSettings');
        const savedAppSettings = localStorage.getItem('appSettings');

        if (savedUserSettings) {
          setUserSettings({
            ...defaultUserSettings,
            ...JSON.parse(savedUserSettings),
          });
        }

        if (savedAppSettings) {
          setAppSettings({
            ...defaultAppSettings,
            ...JSON.parse(savedAppSettings),
          });
        }

        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : '設定の読み込みに失敗しました'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 設定の保存
  const handleSaveSettings = async () => {
    try {
      setIsLoading(true);

      // 実際の実装では API に送信
      localStorage.setItem('userSettings', JSON.stringify(userSettings));
      localStorage.setItem('appSettings', JSON.stringify(appSettings));

      setIsModified(false);
      setError(null);

      // 成功メッセージの表示（今回は省略）
    } catch (err) {
      setError(err instanceof Error ? err.message : '設定の保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 設定のリセット
  const handleResetSettings = () => {
    if (confirm('設定をリセットしてもよろしいですか？')) {
      setUserSettings(defaultUserSettings);
      setAppSettings(defaultAppSettings);
      setIsModified(true);
    }
  };

  // ユーザー設定の更新
  const updateUserSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setUserSettings((prev) => ({ ...prev, [key]: value }));
    setIsModified(true);
  };

  // アプリ設定の更新
  const updateAppSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    setAppSettings((prev) => ({ ...prev, [key]: value }));
    setIsModified(true);
  };

  // カメラテスト
  const handleCameraTest = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user',
        },
      });

      // カメラテスト成功
      stream.getTracks().forEach((track) => track.stop());
      alert('カメラテストが成功しました！');
    } catch (err) {
      alert(
        'カメラへのアクセスができませんでした。ブラウザの設定を確認してください。'
      );
    }
  };

  // データエクスポート
  const handleDataExport = () => {
    const data = {
      userSettings,
      appSettings,
      measurements: [], // 実際の実装では測定データを含める
      calendarRecords: [], // 実際の実装ではカレンダーデータを含める
      exportDate: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rehabilitation-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // データインポート
  const handleDataImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);

        if (data.userSettings) {
          setUserSettings({ ...defaultUserSettings, ...data.userSettings });
        }

        if (data.appSettings) {
          setAppSettings({ ...defaultAppSettings, ...data.appSettings });
        }

        setIsModified(true);
        alert('データのインポートが完了しました！');
      } catch (err) {
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <h2>設定を読み込んでいます</h2>
          <p>少々お待ちください...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.setupPage}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>⚙️</span>
            設定
          </h1>
          <nav className={styles.navigation}>
            <a href="/measurement" className={styles.navLink}>
              <span>📏</span>
              測定
            </a>
            <a href="/calendar" className={styles.navLink}>
              <span>📅</span>
              カレンダー
            </a>
            <a href="/progress" className={styles.navLink}>
              <span>📊</span>
              進捗
            </a>
          </nav>
        </div>
      </header>

      {/* エラー表示 */}
      {error && (
        <div className={styles.errorContainer}>
          <div className={styles.errorMessage}>
            <span className={styles.errorIcon}>⚠️</span>
            <span>エラー: {error}</span>
            <button
              onClick={() => setError(null)}
              className={styles.errorResetButton}
            >
              閉じる
            </button>
          </div>
        </div>
      )}

      <main className={styles.mainContent}>
        {/* タブナビゲーション */}
        <section className={styles.tabNavigation}>
          <div className={styles.tabButtons}>
            <button
              onClick={() => setActiveTab('user')}
              className={`${styles.tabButton} ${activeTab === 'user' ? styles.active : ''}`}
            >
              <span>👤</span>
              ユーザー情報
            </button>
            <button
              onClick={() => setActiveTab('app')}
              className={`${styles.tabButton} ${activeTab === 'app' ? styles.active : ''}`}
            >
              <span>🎨</span>
              アプリ設定
            </button>
            <button
              onClick={() => setActiveTab('camera')}
              className={`${styles.tabButton} ${activeTab === 'camera' ? styles.active : ''}`}
            >
              <span>📹</span>
              カメラ設定
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`${styles.tabButton} ${activeTab === 'data' ? styles.active : ''}`}
            >
              <span>💾</span>
              データ管理
            </button>
          </div>
        </section>

        {/* ユーザー情報タブ */}
        {activeTab === 'user' && (
          <section className={styles.settingsSection}>
            <h2>ユーザー情報</h2>
            <div className={styles.settingsGrid}>
              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>お名前</label>
                <input
                  type="text"
                  value={userSettings.name}
                  onChange={(e) => updateUserSetting('name', e.target.value)}
                  className={styles.settingInput}
                  placeholder="お名前を入力してください"
                />
              </div>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>年齢</label>
                <input
                  type="number"
                  value={userSettings.age || ''}
                  onChange={(e) =>
                    updateUserSetting('age', parseInt(e.target.value) || 0)
                  }
                  className={styles.settingInput}
                  placeholder="年齢を入力してください"
                  min="0"
                  max="120"
                />
              </div>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>利き手</label>
                <select
                  value={userSettings.dominantHand}
                  onChange={(e) =>
                    updateUserSetting(
                      'dominantHand',
                      e.target.value as 'right' | 'left'
                    )
                  }
                  className={styles.settingSelect}
                >
                  <option value="right">右手</option>
                  <option value="left">左手</option>
                </select>
              </div>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>怪我の部位</label>
                <select
                  value={userSettings.injuryType}
                  onChange={(e) =>
                    updateUserSetting(
                      'injuryType',
                      e.target.value as 'wrist' | 'thumb' | 'both'
                    )
                  }
                  className={styles.settingSelect}
                >
                  <option value="wrist">手首</option>
                  <option value="thumb">母指</option>
                  <option value="both">手首・母指両方</option>
                </select>
              </div>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>怪我をした日</label>
                <input
                  type="date"
                  value={
                    userSettings.injuryDate?.toISOString().split('T')[0] || ''
                  }
                  onChange={(e) =>
                    updateUserSetting(
                      'injuryDate',
                      e.target.value ? new Date(e.target.value) : undefined
                    )
                  }
                  className={styles.settingInput}
                />
              </div>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>
                  リハビリテーション目標
                </label>
                <textarea
                  value={userSettings.rehabilitationGoal}
                  onChange={(e) =>
                    updateUserSetting('rehabilitationGoal', e.target.value)
                  }
                  className={styles.settingTextarea}
                  placeholder="リハビリテーションの目標を入力してください"
                  rows={3}
                />
              </div>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>目標角度（度）</label>
                <input
                  type="number"
                  value={userSettings.targetAngle || ''}
                  onChange={(e) =>
                    updateUserSetting(
                      'targetAngle',
                      parseInt(e.target.value) || undefined
                    )
                  }
                  className={styles.settingInput}
                  placeholder="目標とする可動域角度"
                  min="0"
                  max="180"
                />
              </div>
            </div>
          </section>
        )}

        {/* アプリ設定タブ */}
        {activeTab === 'app' && (
          <section className={styles.settingsSection}>
            <h2>アプリ設定</h2>
            <div className={styles.settingsGrid}>
              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>テーマ</label>
                <select
                  value={appSettings.theme}
                  onChange={(e) =>
                    updateAppSetting(
                      'theme',
                      e.target.value as 'light' | 'dark' | 'auto'
                    )
                  }
                  className={styles.settingSelect}
                >
                  <option value="light">ライト</option>
                  <option value="dark">ダーク</option>
                  <option value="auto">システム設定に従う</option>
                </select>
              </div>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>言語</label>
                <select
                  value={appSettings.language}
                  onChange={(e) =>
                    updateAppSetting('language', e.target.value as 'ja' | 'en')
                  }
                  className={styles.settingSelect}
                >
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>通知</label>
                <div className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={appSettings.notifications}
                    onChange={(e) =>
                      updateAppSetting('notifications', e.target.checked)
                    }
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                </div>
              </div>

              {appSettings.notifications && (
                <div className={styles.settingGroup}>
                  <label className={styles.settingLabel}>
                    リマインダー時刻
                  </label>
                  <input
                    type="time"
                    value={appSettings.reminderTime || ''}
                    onChange={(e) =>
                      updateAppSetting(
                        'reminderTime',
                        e.target.value || undefined
                      )
                    }
                    className={styles.settingInput}
                  />
                </div>
              )}

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>測定頻度</label>
                <select
                  value={appSettings.measurementFrequency}
                  onChange={(e) =>
                    updateAppSetting(
                      'measurementFrequency',
                      e.target.value as 'daily' | 'weekly' | 'custom'
                    )
                  }
                  className={styles.settingSelect}
                >
                  <option value="daily">毎日</option>
                  <option value="weekly">週1回</option>
                  <option value="custom">カスタム</option>
                </select>
              </div>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>自動保存</label>
                <div className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={appSettings.autoSave}
                    onChange={(e) =>
                      updateAppSetting('autoSave', e.target.checked)
                    }
                    className={styles.toggleInput}
                  />
                  <span className={styles.toggleSlider}></span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* カメラ設定タブ */}
        {activeTab === 'camera' && (
          <section className={styles.settingsSection}>
            <h2>カメラ設定</h2>
            <div className={styles.settingsGrid}>
              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>カメラ品質</label>
                <select
                  value={appSettings.cameraQuality}
                  onChange={(e) =>
                    updateAppSetting(
                      'cameraQuality',
                      e.target.value as 'low' | 'medium' | 'high'
                    )
                  }
                  className={styles.settingSelect}
                >
                  <option value="low">低画質（処理速度優先）</option>
                  <option value="medium">中画質（バランス）</option>
                  <option value="high">高画質（精度優先）</option>
                </select>
              </div>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>カメラテスト</label>
                <button
                  onClick={handleCameraTest}
                  className={styles.testButton}
                >
                  📹 カメラをテスト
                </button>
                <p className={styles.settingDescription}>
                  カメラが正常に動作するかテストします
                </p>
              </div>
            </div>
          </section>
        )}

        {/* データ管理タブ */}
        {activeTab === 'data' && (
          <section className={styles.settingsSection}>
            <h2>データ管理</h2>
            <div className={styles.settingsGrid}>
              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>
                  データエクスポート
                </label>
                <button
                  onClick={handleDataExport}
                  className={styles.exportButton}
                >
                  💾 データをエクスポート
                </button>
                <p className={styles.settingDescription}>
                  すべての設定と測定データをJSONファイルでダウンロードします
                </p>
              </div>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>データインポート</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleDataImport}
                  className={styles.fileInput}
                />
                <p className={styles.settingDescription}>
                  以前にエクスポートしたJSONファイルからデータを復元します
                </p>
              </div>

              <div className={styles.settingGroup}>
                <label className={styles.settingLabel}>データリセット</label>
                <button
                  onClick={handleResetSettings}
                  className={styles.resetButton}
                >
                  🔄 設定をリセット
                </button>
                <p className={styles.settingDescription}>
                  すべての設定を初期値に戻します（測定データは削除されません）
                </p>
              </div>
            </div>
          </section>
        )}

        {/* 保存ボタン */}
        <section className={styles.saveSection}>
          <div className={styles.saveButtons}>
            <button
              onClick={handleSaveSettings}
              disabled={!isModified || isLoading}
              className={`${styles.saveButton} ${!isModified ? styles.disabled : ''}`}
            >
              {isLoading ? '保存中...' : '設定を保存'}
            </button>
            {isModified && (
              <p className={styles.modifiedIndicator}>
                ⚠️ 未保存の変更があります
              </p>
            )}
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>AI駆動手首・母指可動域リハビリテーションアプリ</p>
          <div className={styles.footerLinks}>
            <a href="/privacy">プライバシーポリシー</a>
            <a href="/terms">利用規約</a>
            <a href="/help">ヘルプ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
