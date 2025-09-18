/**
 * 測定画面 - メイン測定ページ
 * 添付画像のUIに合わせた測定開始画面
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.scss';

/**
 * カメラセットアップ状態
 */
interface CameraState {
  stream: MediaStream | null;
  isReady: boolean;
  error: string | null;
}

/**
 * 手の選択
 */
type HandSelection = 'left' | 'right';

/**
 * 画面表示ステップ
 */
type DisplayStep = 'instructions' | 'selection';

/**
 * 測定セットアップ状態
 */
interface MeasurementSetup {
  selectedHand: HandSelection | null;
  currentStep: DisplayStep;
}

/**
 * 説明セクションコンポーネント
 */
const InstructionsSection: React.FC<{
  onNext: () => void;
}> = ({ onNext }) => {
  return (
    <div className={styles.instructionsSection}>
      <div className={styles.instructionsBody}>
        <h1 className={styles.title}>説明</h1>

        <div className={styles.instructionsContent}>
          <div className={styles.instructionItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>1</div>
              <h3 className={styles.stepTitle}>準備</h3>
            </div>
            <p className={styles.stepDescription}>
              明るい場所で、手首と親指がはっきり映るように撮影してください。
              <br />
              時計や指輪は外し、スマホやPCは固定して映しましょう。
              <br />
            </p>
          </div>

          <div className={styles.instructionItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>2</div>
              <h3 className={styles.stepTitle}>姿勢</h3>
            </div>
            <p className={styles.stepDescription}>
              椅子に座り、腕を机などで安定させます。カメラから40～70cm離れ、
              <br />
              手首から指先までを正面から画面に収めてください。
              <br />
            </p>
          </div>

          <div className={styles.instructionItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>3</div>
              <h3 className={styles.stepTitle}>測定動作</h3>
            </div>
            <p className={styles.stepDescription}>
              画面の指示に従い、手首(掌屈・背屈・尺屈・橈屈）をゆっくり最大まで動かしてください。
              <br />
              測定中はカメラから手が外れないよう注意してください。
            </p>
          </div>

          <div className={styles.instructionItem}>
            <div className={styles.stepHeader}>
              <div className={styles.stepNumber}>4</div>
              <h3 className={styles.stepTitle}>注意点</h3>
            </div>
            <p className={styles.stepDescription}>
              手ブレは測定精度を下げます。強い痛みがあれば中止し、値がずれたら再測定してください。
              <br />
              うまく測れない場合はガイダンスを確認してください。
            </p>
          </div>
        </div>
      </div>
      {/* 次へボタン - instructionsContentの外に移動 */}
      <div className={styles.instructionsNext}>
        <button className={styles.nextButton} onClick={onNext}>
          測定へ進む →
        </button>
      </div>
    </div>
  );
};

/**
 * 手首選択コンポーネント
 */
const HandSelectionSection: React.FC<{
  selectedHand: HandSelection | null;
  onHandSelect: (hand: HandSelection) => void;
}> = ({ selectedHand, onHandSelect }) => {
  return (
    <div className={styles.handSelectionSection}>
      <h2 className={styles.selectionTitle}>
        測定部位を選択してください
        <span className={styles.selectionNote}> *どちらか選択してください</span>
      </h2>

      <div className={styles.handCards}>
        <div
          className={`${styles.handCard} ${selectedHand === 'right' ? styles.selected : ''}`}
          onClick={() => onHandSelect('right')}
        >
          <h3 className={styles.handTitle}>右手首</h3>
          <p className={styles.handDescription}>右手首の可動域を測定します</p>
          <div className={styles.movementTags}>
            <span className={styles.tag}>掌屈</span>
            <span className={styles.tag}>背屈</span>
            <span className={styles.tag}>尺屈</span>
            <span className={styles.tag}>橈屈</span>
          </div>
        </div>

        <div
          className={`${styles.handCard} ${selectedHand === 'left' ? styles.selected : ''}`}
          onClick={() => onHandSelect('left')}
        >
          <h3 className={styles.handTitle}>左手首</h3>
          <p className={styles.handDescription}>左手首の可動域を測定します</p>
          <div className={styles.movementTags}>
            <span className={styles.tag}>掌屈</span>
            <span className={styles.tag}>背屈</span>
            <span className={styles.tag}>尺屈</span>
            <span className={styles.tag}>橈屈</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 測定情報コンポーネント
 */
const MeasurementInfoSection: React.FC<{
  selectedHand: HandSelection | null;
  onCameraTest: () => void;
  onStartMeasurement: () => void;
}> = ({ selectedHand, onCameraTest, onStartMeasurement }) => {
  return (
    <div className={styles.measurementInfoSection}>
      <h2 className={styles.infoSectionTitle}>測定について</h2>

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

      {/* ボタンセクション */}
      <div className={styles.bottomSection}>
        <button className={styles.testButton} onClick={onCameraTest}>
          カメラをテストする
        </button>
        <button
          className={styles.startButton}
          onClick={onStartMeasurement}
          disabled={!selectedHand}
        >
          測定へ進む →
        </button>
      </div>
    </div>
  );
};

/**
 * カメラプレビューコンポーネント
 */
const CameraPreview: React.FC<{
  cameraState: CameraState;
  isInactive?: boolean;
}> = ({ cameraState, isInactive = false }) => {
  if (cameraState.error) {
    return (
      <div className={styles.cameraError}>
        <div className={styles.errorMessage}>カメラアクセスに失敗しました</div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.cameraContainer} ${isInactive ? styles.inactive : ''}`}
    >
      {/* 点線の枠（absolute配置） */}
      <div className={styles.dashedFrame}></div>

      {/* 指示テキスト - アクティブ時のみ表示 */}
      {!isInactive && (
        <div className={styles.frameInstruction}>枠内に手を入れてください</div>
      )}

      <div className={styles.cameraFrame}>
        <div className={styles.frameInner}>
          {cameraState.isReady ? (
            <video
              className={styles.cameraVideo}
              autoPlay
              playsInline
              muted
              ref={(video) => {
                if (video && cameraState.stream) {
                  video.srcObject = cameraState.stream;
                }
              }}
            />
          ) : (
            <div className={styles.cameraPlaceholder}>
              <span>カメラ準備中...</span>
            </div>
          )}
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

  // 測定セットアップ状態管理
  const [setup, setSetup] = useState<MeasurementSetup>({
    selectedHand: null,
    currentStep: 'instructions',
  });

  // カメラ状態管理
  const [cameraState, setCameraState] = useState<CameraState>({
    stream: null,
    isReady: false,
    error: null,
  });

  /**
   * 手の選択ハンドラー
   */
  const handleHandSelect = (hand: HandSelection) => {
    setSetup((prev) => ({ ...prev, selectedHand: hand }));
  };

  /**
   * 次のステップへ進む
   */
  const handleNextStep = () => {
    setSetup((prev) => ({ ...prev, currentStep: 'selection' }));
  };

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

      setCameraState({
        stream,
        isReady: true,
        error: null,
      });
    } catch (error) {
      console.error('カメラ初期化エラー:', error);
      setCameraState({
        stream: null,
        isReady: false,
        error: 'カメラへのアクセスを許可してください',
      });
    }
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
    if (setup.selectedHand) {
      router.push(`/measurement/capture?hand=${setup.selectedHand}`);
    }
  };

  /**
   * 初期化
   */
  useEffect(() => {
    // カメラを自動で初期化
    initializeCamera();

    return () => {
      // クリーンアップ
      if (cameraState.stream) {
        cameraState.stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className={styles.measurementPage}>
      {/* メインコンテンツエリア */}
      <div className={styles.mainContent}>
        {/* 左側: コンテンツセクション */}
        <div className={styles.leftContent}>
          {setup.currentStep === 'instructions' ? (
            <InstructionsSection onNext={handleNextStep} />
          ) : (
            <>
              <HandSelectionSection
                selectedHand={setup.selectedHand}
                onHandSelect={handleHandSelect}
              />
              <MeasurementInfoSection
                selectedHand={setup.selectedHand}
                onCameraTest={handleCameraTest}
                onStartMeasurement={handleStartMeasurement}
              />
            </>
          )}
        </div>

        {/* 右側: カメラセクション */}
        <div className={styles.rightContent}>
          {/* ヘッダー - アクティブ時のみ表示 */}
          {!(setup.currentStep === 'instructions' || !setup.selectedHand) && (
            <div className={styles.cameraHeader}>
              <span className={styles.statusBadge}>
                {cameraState.isReady ? '測定中' : 'カメラ準備中'}
              </span>
            </div>
          )}
          <CameraPreview
            cameraState={cameraState}
            isInactive={
              setup.currentStep === 'instructions' || !setup.selectedHand
            }
          />
        </div>
      </div>
    </div>
  );
};

export default MeasurementPage;
