/**
 * カメラプレビューコンポーネント
 * MediaStreamを表示するビデオ要素の管理
 */

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import styles from './CameraPreview.module.scss';

/**
 * カメラプレビューコンポーネントのProps
 */
interface CameraPreviewProps {
  stream: MediaStream | null;
  isReady: boolean;
  error: string | null;
  onVideoReady?: (video: HTMLVideoElement) => void;
  className?: string;
}

/**
 * カメラプレビューコンポーネント
 * forwardRefを使用してビデオ要素への参照を親コンポーネントに渡す
 */
export const CameraPreview = forwardRef<HTMLVideoElement, CameraPreviewProps>(
  ({ stream, isReady, error, onVideoReady, className }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // 外部参照をビデオ要素に設定
    useImperativeHandle(ref, () => videoRef.current!, []);

    /**
     * ストリームが変更された時の処理
     */
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      if (stream && isReady) {
        video.srcObject = stream;
        video.play().catch((err) => {
          console.error('ビデオ再生エラー:', err);
        });
      } else {
        video.srcObject = null;
      }
    }, [stream, isReady]);

    /**
     * ビデオ要素の準備完了時の処理
     */
    const handleVideoLoadedMetadata = (): void => {
      const video = videoRef.current;
      if (video && onVideoReady) {
        onVideoReady(video);
      }
    };

    /**
     * ビデオエラーハンドリング
     */
    const handleVideoError = (
      event: React.SyntheticEvent<HTMLVideoElement>
    ): void => {
      console.error('ビデオエラー:', event);
    };

    // エラー状態の表示
    if (error) {
      return (
        <div className={`${styles.cameraPreview} ${className || ''}`}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>カメラエラー</h3>
            <p>{error}</p>
            <div className={styles.errorActions}>
              <button
                onClick={() => window.location.reload()}
                className={styles.retryButton}
              >
                再試行
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ローディング状態の表示
    if (!isReady || !stream) {
      return (
        <div className={`${styles.cameraPreview} ${className || ''}`}>
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <h3>カメラを準備中...</h3>
            <p>カメラアクセスの許可をお待ちください</p>
          </div>
        </div>
      );
    }

    // 正常なカメラプレビュー表示
    return (
      <div className={`${styles.cameraPreview} ${className || ''}`}>
        <video
          ref={videoRef}
          className={styles.video}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={handleVideoLoadedMetadata}
          onError={handleVideoError}
        />

        {/* カメラ情報オーバーレイ */}
        <div className={styles.cameraInfo}>
          <div className={styles.statusIndicator}>
            <div className={styles.recordingDot}></div>
            <span>カメラ接続中</span>
          </div>
        </div>

        {/* 測定ガイドライン */}
        <div className={styles.guidelines}>
          <div className={styles.centerGuide}>
            <div className={styles.handFrame}>
              <span className={styles.guideText}>
                手をここに合わせてください
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

CameraPreview.displayName = 'CameraPreview';
