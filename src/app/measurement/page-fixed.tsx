/**
 * 測定画面 - メイン測定ページ
 * 添付画像のUIに合わせた測定開始画面
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.scss';

/**
 * 測定部位の型定義
 */
type MeasurementPart = 'wrist' | 'thumb' | 'finger' | 'elbow';

/**
 * 手の選択
 */
type HandSelection = 'left' | 'right';

/**
 * セットアップ状態
 */
interface SetupState {
  selectedHand: HandSelection | null;
  selectedParts: MeasurementPart[];
  cameraReady: boolean;
  cameraError: string | null;
}

/**
 * カメラプレビューコンポーネント
 */
const CameraPreview: React.FC<{
  videoRef: React.RefObject<HTMLVideoElement>;
  stream: MediaStream | null;
  isReady: boolean;
  error: string | null;
}> = ({ videoRef, stream, isReady, error }) => {
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [videoRef, stream]);

  if (error) {
    return (
      <div className={styles.cameraError}>
        <div className={styles.errorMessage}>カメラアクセスに失敗しました</div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className={styles.cameraPlaceholder}>
        <div className={styles.placeholderText}>枠内に手を入れてください</div>
        <div className={styles.handFrame}></div>
      </div>
    );
  }

  return (
    <div className={styles.cameraContainer}>
      <video
        ref={videoRef}
        className={styles.cameraVideo}
        autoPlay
        playsInline
        muted
      />
      <div className={styles.handFrame}></div>
      <div className={styles.instructions}>枠内に手を入れてください</div>
    </div>
  );
};

/**
 * 手首選択カード
 */
const HandSelectionCard: React.FC<{
  hand: HandSelection;
  isSelected: boolean;
  onSelect: (hand: HandSelection) => void;
}> = ({ hand, isSelected, onSelect }) => {
  const handLabel = hand === 'right' ? '右手首' : '左手首';
  const description =
    hand === 'right'
      ? '右手首の可動域を測定します'
      : '左手首の可動域を測定します';

  return (
    <div
      className={`${styles.handCard} ${isSelected ? styles.selected : ''}`}
      onClick={() => onSelect(hand)}
    >
      <h3 className={styles.handTitle}>{handLabel}</h3>
      <p className={styles.handDescription}>{description}</p>
      <div className={styles.measurementTags}>
        <span className={styles.tag}>掌屈</span>
        <span className={styles.tag}>背屈</span>
        <span className={styles.tag}>尺屈</span>
        <span className={styles.tag}>橈屈</span>
      </div>
    </div>
  );
};

/**
 * 測定情報セクション
 */
const MeasurementInfo: React.FC = () => {
  return (
    <div className={styles.measurementInfo}>
      <h2 className={styles.infoTitle}>測定について</h2>
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <h3 className={styles.infoItemTitle}>所要時間</h3>
          <p className={styles.infoItemText}>各部位約3〜5分程度</p>
        </div>
        <div className={styles.infoItem}>
          <h3 className={styles.infoItemTitle}>準備</h3>
          <p className={styles.infoItemText}>
            カメラが使用できる環境でご利用ください
          </p>
        </div>
        <div className={styles.infoItem}>
          <h3 className={styles.infoItemTitle}>測定方法</h3>
          <p className={styles.infoItemText}>
            画面の指示に従って手を動かすだけ
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * メイン測定ページコンポーネント
 */
const MeasurementPage: React.FC = () => {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);

  // 状態管理
  const [setupState, setSetupState] = useState<SetupState>({
    selectedHand: null,
    selectedParts: ['wrist'], // デフォルトで手首を選択
    cameraReady: false,
    cameraError: null,
  });
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  /**
   * カメラ初期化
   */
  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      setCameraStream(stream);
      setSetupState((prev) => ({
        ...prev,
        cameraReady: true,
        cameraError: null,
      }));
    } catch (error) {
      console.error('カメラ初期化エラー:', error);
      setSetupState((prev) => ({
        ...prev,
        cameraReady: false,
        cameraError: 'カメラへのアクセスを許可してください',
      }));
    }
  };

  /**
   * 手の選択
   */
  const handleHandSelection = (hand: HandSelection) => {
    setSetupState((prev) => ({ ...prev, selectedHand: hand }));
  };

  /**
   * カメラテスト
   */
  const handleCameraTest = () => {
    initializeCamera();
  };

  /**
   * 測定開始
   */
  const handleStartMeasurement = () => {
    if (setupState.selectedHand && setupState.cameraReady) {
      // 実際の測定画面に遷移
      router.push(`/measurement/capture?hand=${setupState.selectedHand}`);
    }
  };

  /**
   * 初期化
   */
  useEffect(() => {
    return () => {
      // クリーンアップ
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  return (
    <div className={styles.measurementPage}>
      <div className={styles.setupSection}>
        <div className={styles.setupContent}>
          {/* 測定部位選択 */}
          <div className={styles.selectionSection}>
            <h1 className={styles.title}>
              測定部位を選択してください
              <span className={styles.required}>※どちらか選択してください</span>
            </h1>

            <div className={styles.handSelection}>
              <HandSelectionCard
                hand="right"
                isSelected={setupState.selectedHand === 'right'}
                onSelect={handleHandSelection}
              />
              <HandSelectionCard
                hand="left"
                isSelected={setupState.selectedHand === 'left'}
                onSelect={handleHandSelection}
              />
            </div>
          </div>

          {/* 測定について */}
          <MeasurementInfo />

          {/* アクションボタン */}
          <div className={styles.actionButtons}>
            <button
              className={styles.testButton}
              onClick={handleCameraTest}
              disabled={!setupState.selectedHand}
            >
              カメラをテストする
            </button>
            <button
              className={styles.startButton}
              onClick={handleStartMeasurement}
              disabled={!setupState.selectedHand || !setupState.cameraReady}
            >
              測定へ進む →
            </button>
          </div>
        </div>
      </div>

      {/* カメラプレビューセクション */}
      <div className={styles.cameraSection}>
        <div className={styles.cameraWrapper}>
          <div className={styles.cameraHeader}>
            <span className={styles.statusBadge}>
              {setupState.cameraReady ? '測定中' : 'カメラ準備中'}
            </span>
          </div>
          <CameraPreview
            videoRef={videoRef}
            stream={cameraStream}
            isReady={setupState.cameraReady}
            error={setupState.cameraError}
          />
        </div>
      </div>
    </div>
  );
};

export default MeasurementPage;
