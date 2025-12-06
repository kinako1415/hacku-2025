/**
 * 角度表示オーバーレイコンポーネント
 * MediaPipe検出結果をもとに手首・母指の角度を計算・表示
 */

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useCallback,
} from 'react';
import { Hands, Results } from '@mediapipe/hands';
import { angleCalculator } from '@/core/infrastructure/mediapipe/angle-calculator';

// 互換性のためのラッパー関数
const calculateWristAngles = (landmarks: any) => {
  const convertedLandmarks = landmarks.map((lm: any, index: number) => ({
    ...lm,
    id: index,
  }));
  return angleCalculator.calculateWristAngles(convertedLandmarks);
};

const calculateThumbAngles = (landmarks: any) => {
  // 母指角度は現在未実装のため、ダミーデータを返す
  return {
    flexion: 0,
    extension: 0,
    abduction: 0,
    adduction: 0,
  };
};
import type { HandType } from '@/lib/data-manager/models/motion-measurement';
import type { AngleData } from '@/stores/measurement-atoms';
import styles from './AngleOverlay.module.scss';

/**
 * 角度オーバーレイコンポーネントのProps
 */
interface AngleOverlayProps {
  videoElement: HTMLVideoElement | null;
  handsDetector: Hands | null;
  isCapturing: boolean;
  selectedHand: HandType;
  onAnglesUpdate?: (angles: AngleData | null) => void;
  className?: string;
}

/**
 * 角度表示オーバーレイコンポーネント
 */
export const AngleOverlay = forwardRef<HTMLCanvasElement, AngleOverlayProps>(
  (
    {
      videoElement,
      handsDetector,
      isCapturing,
      selectedHand,
      onAnglesUpdate,
      className,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>();

    // 外部参照をCanvas要素に設定
    useImperativeHandle(ref, () => canvasRef.current!, []);

    /**
     * Canvas要素のサイズをビデオ要素に合わせる
     */
    const resizeCanvas = useCallback((): void => {
      const canvas = canvasRef.current;
      const video = videoElement;

      if (!canvas || !video) return;

      canvas.width = video.videoWidth || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;
      canvas.style.width = `${video.clientWidth}px`;
      canvas.style.height = `${video.clientHeight}px`;
    }, [videoElement]);

    /**
     * 手のランドマークを描画
     */
    const drawHandLandmarks = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        landmarks: Array<{ x: number; y: number; z?: number }>,
        canvasWidth: number,
        canvasHeight: number
      ): void => {
        // ビデオは鏡像表示（scaleX(-1)）なのでオーバーレイ側もX座標を反転させて揃える
        const toCanvasX = (x: number): number => (1 - x) * canvasWidth;

        // 関節点の描画
        landmarks.forEach((landmark, index) => {
          const x = toCanvasX(landmark.x);
          const y = landmark.y * canvasHeight;

          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fillStyle =
            index < 5
              ? '#ff6b6b' // 親指
              : index < 9
                ? '#4ecdc4' // 人差し指
                : index < 13
                  ? '#45b7d1' // 中指
                  : index < 17
                    ? '#96ceb4' // 薬指
                    : '#ffeaa7'; // 小指
          ctx.fill();

          // 関節番号の表示（デバッグ用）
          if (isCapturing) {
            ctx.fillStyle = '#fff';
            ctx.font = '10px Arial';
            ctx.fillText(index.toString(), x + 5, y - 5);
          }
        });

        // 手の骨格線の描画
        const connections = [
          // 手首から各指の根元
          [0, 1],
          [0, 5],
          [0, 9],
          [0, 13],
          [0, 17],
          // 親指
          [1, 2],
          [2, 3],
          [3, 4],
          // 人差し指
          [5, 6],
          [6, 7],
          [7, 8],
          // 中指
          [9, 10],
          [10, 11],
          [11, 12],
          // 薬指
          [13, 14],
          [14, 15],
          [15, 16],
          // 小指
          [17, 18],
          [18, 19],
          [19, 20],
          // 手のひら
          [5, 9],
          [9, 13],
          [13, 17],
        ];

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;

        connections.forEach(([start, end]) => {
          const startPoint = landmarks[start];
          const endPoint = landmarks[end];

          if (startPoint && endPoint) {
            ctx.beginPath();
            ctx.moveTo(toCanvasX(startPoint.x), startPoint.y * canvasHeight);
            ctx.lineTo(toCanvasX(endPoint.x), endPoint.y * canvasHeight);
            ctx.stroke();
          }
        });
      },
      [isCapturing]
    );

    /**
     * 角度情報の描画
     */
    const drawAngleInfo = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        angles: AngleData,
        canvasWidth: number,
        canvasHeight: number
      ): void => {
        const padding = 20;
        const lineHeight = 25;
        let yOffset = padding;

        // 背景の描画
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(padding - 10, padding - 15, 250, 200);

        // 角度情報のテキスト描画
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(
          `${selectedHand === 'right' ? '右手' : '左手'} 測定中`,
          padding,
          yOffset
        );
        yOffset += lineHeight + 5;

        ctx.font = '12px Arial';

        // 手首角度
        ctx.fillStyle = '#4ecdc4';
        ctx.fillText('手首角度:', padding, yOffset);
        yOffset += lineHeight;

        ctx.fillStyle = '#fff';
        ctx.fillText(
          `屈曲: ${angles.wrist.flexion.toFixed(1)}°`,
          padding + 10,
          yOffset
        );
        yOffset += lineHeight - 5;
        ctx.fillText(
          `伸展: ${angles.wrist.extension.toFixed(1)}°`,
          padding + 10,
          yOffset
        );
        yOffset += lineHeight - 5;
        ctx.fillText(
          `橈屈: ${angles.wrist.radialDeviation.toFixed(1)}°`,
          padding + 10,
          yOffset
        );
        yOffset += lineHeight - 5;
        ctx.fillText(
          `尺屈: ${angles.wrist.ulnarDeviation.toFixed(1)}°`,
          padding + 10,
          yOffset
        );
        yOffset += lineHeight + 5;

        // 母指角度
        ctx.fillStyle = '#ff6b6b';
        ctx.fillText('母指角度:', padding, yOffset);
        yOffset += lineHeight;

        ctx.fillStyle = '#fff';
        ctx.fillText(
          `屈曲: ${angles.thumb.flexion.toFixed(1)}°`,
          padding + 10,
          yOffset
        );
        yOffset += lineHeight - 5;
        ctx.fillText(
          `伸展: ${angles.thumb.extension.toFixed(1)}°`,
          padding + 10,
          yOffset
        );
        yOffset += lineHeight - 5;
        ctx.fillText(
          `外転: ${angles.thumb.abduction.toFixed(1)}°`,
          padding + 10,
          yOffset
        );
        yOffset += lineHeight - 5;
        ctx.fillText(
          `内転: ${angles.thumb.adduction.toFixed(1)}°`,
          padding + 10,
          yOffset
        );
      },
      [selectedHand]
    );

    /**
     * Canvas描画の更新
     */
    const updateCanvas = useCallback(async (): Promise<void> => {
      const canvas = canvasRef.current;
      const video = videoElement;

      if (!canvas || !video || !handsDetector || !isCapturing) {
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Canvasをクリア
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      try {
        // MediaPipeで手の検出を実行
        await handsDetector.send({ image: video });
      } catch (error) {
        console.error('手の検出エラー:', error);
      }
    }, [videoElement, handsDetector, isCapturing]);

    /**
     * MediaPipeの結果処理
     */
    useEffect(() => {
      if (!handsDetector) return;

      const handleResults = (results: Results): void => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Canvasをクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (
          results.multiHandLandmarks &&
          results.multiHandLandmarks.length > 0
        ) {
          const landmarks = results.multiHandLandmarks[0];

          // 手のランドマークを描画
          drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height);

          // 角度計算
          try {
            const wristAngles = calculateWristAngles(landmarks);
            const thumbAngles = calculateThumbAngles(landmarks);

            const angleData: AngleData = {
              wrist: wristAngles,
              thumb: thumbAngles,
            };

            // 角度情報を描画
            drawAngleInfo(ctx, angleData, canvas.width, canvas.height);

            // 親コンポーネントに角度データを通知
            if (onAnglesUpdate) {
              onAnglesUpdate(angleData);
            }
          } catch (error) {
            console.error('角度計算エラー:', error);
            if (onAnglesUpdate) {
              onAnglesUpdate(null);
            }
          }
        } else {
          // 手が検出されない場合
          if (onAnglesUpdate) {
            onAnglesUpdate(null);
          }

          // 「手を検出中」メッセージを表示
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

          ctx.fillStyle = '#fff';
          ctx.font = '16px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(
            `${selectedHand === 'right' ? '右手' : '左手'}を画面内に入れてください`,
            canvas.width / 2,
            canvas.height - 30
          );
          ctx.textAlign = 'left';
        }
      };

      handsDetector.onResults(handleResults);
    }, [
      handsDetector,
      drawHandLandmarks,
      drawAngleInfo,
      onAnglesUpdate,
      selectedHand,
    ]);

    /**
     * 測定が開始された時のアニメーションループ
     */
    useEffect(() => {
      if (isCapturing) {
        const animate = (): void => {
          updateCanvas();
          animationFrameRef.current = requestAnimationFrame(animate);
        };
        animate();
      } else {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        // Canvasをクリア
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      }

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [isCapturing, updateCanvas]);

    /**
     * ビデオ要素の変更に対応してCanvasサイズを調整
     */
    useEffect(() => {
      if (videoElement) {
        resizeCanvas();

        const handleResize = (): void => resizeCanvas();
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      }
    }, [videoElement, resizeCanvas]);

    return (
      <canvas
        ref={canvasRef}
        className={`${styles.angleOverlay} ${className || ''}`}
      />
    );
  }
);

AngleOverlay.displayName = 'AngleOverlay';
