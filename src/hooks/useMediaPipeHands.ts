/**
 * MediaPipe Hands用カスタムフック
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Hands, Results } from '@mediapipe/hands';

/**
 * MediaPipe Handsフックの戻り値型
 */
interface UseMediaPipeHandsReturn {
  handsDetector: Hands | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  detectHands: (videoElement: HTMLVideoElement) => Promise<Results | null>;
  lastResults: Results | null;
}

/**
 * MediaPipe Hands設定
 */
const MEDIAPIPE_CONFIG = {
  locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  options: {
    maxNumHands: 1,
    modelComplexity: 1 as 0 | 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  },
};

/**
 * MediaPipe Hands用カスタムフック
 */
export function useMediaPipeHands(): UseMediaPipeHandsReturn {
  const [handsDetector, setHandsDetector] = useState<Hands | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<Results | null>(null);
  
  // MediaPipeの初期化状態を追跡
  const initializationRef = useRef<boolean>(false);

  /**
   * MediaPipe Handsの初期化
   */
  const initializeHands = useCallback(async (): Promise<Hands | null> => {
    if (initializationRef.current) {
      return handsDetector;
    }

    setIsLoading(true);
    setError(null);

    try {
      // MediaPipe Handsインスタンスの作成
      const hands = new Hands(MEDIAPIPE_CONFIG);

      // オプションの設定
      hands.setOptions(MEDIAPIPE_CONFIG.options);

      // 結果ハンドラーの設定
      hands.onResults((results: Results) => {
        setLastResults(results);
      });

      // 初期化完了
      setHandsDetector(hands);
      setIsLoaded(true);
      initializationRef.current = true;

      return hands;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'MediaPipe Handsの初期化に失敗しました';
      setError(errorMessage);
      console.error('MediaPipe Hands初期化エラー:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [handsDetector]);

  /**
   * 手の検出実行
   */
  const detectHands = useCallback(async (videoElement: HTMLVideoElement): Promise<Results | null> => {
    if (!handsDetector) {
      setError('MediaPipe Handsが初期化されていません');
      return null;
    }

    if (!videoElement || videoElement.readyState < 2) {
      setError('ビデオ要素が準備できていません');
      return null;
    }

    try {
      await handsDetector.send({ image: videoElement });
      return lastResults;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '手の検出に失敗しました';
      setError(errorMessage);
      console.error('手の検出エラー:', err);
      return null;
    }
  }, [handsDetector, lastResults]);

  /**
   * コンポーネントマウント時の初期化
   */
  useEffect(() => {
    if (!initializationRef.current) {
      initializeHands();
    }
  }, [initializeHands]);

  /**
   * クリーンアップ
   */
  useEffect(() => {
    return () => {
      if (handsDetector) {
        handsDetector.close();
      }
      initializationRef.current = false;
    };
  }, [handsDetector]);

  /**
   * エラーのリセット
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    handsDetector,
    isLoaded,
    isLoading,
    error,
    detectHands,
    lastResults,
  };
}
