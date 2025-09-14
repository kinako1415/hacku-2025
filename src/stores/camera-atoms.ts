/**
 * カメラ関連の状態管理アトム (Jotai)
 */

import { atom } from 'jotai';

/**
 * カメラ状態の型定義
 */
export interface CameraState {
  stream: MediaStream | null;
  isReady: boolean;
  isInitializing: boolean;
  error: string | null;
  permissions: {
    camera: PermissionState | null;
  };
  constraints: MediaStreamConstraints;
}

/**
 * カメラデバイス情報の型定義
 */
export interface CameraDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

/**
 * カメラ設定の型定義
 */
export interface CameraSettings {
  width: number;
  height: number;
  facingMode: 'user' | 'environment';
  frameRate: number;
}

/**
 * デフォルトのカメラ制約
 */
const defaultConstraints: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
    frameRate: { ideal: 30 },
  },
  audio: false,
};

/**
 * カメラ状態アトム
 */
export const cameraStateAtom = atom<CameraState>({
  stream: null,
  isReady: false,
  isInitializing: false,
  error: null,
  permissions: {
    camera: null,
  },
  constraints: defaultConstraints,
});

/**
 * 利用可能なカメラデバイス一覧アトム
 */
export const availableCamerasAtom = atom<CameraDevice[]>([]);

/**
 * 現在のカメラ設定アトム
 */
export const cameraSettingsAtom = atom<CameraSettings>({
  width: 1280,
  height: 720,
  facingMode: 'user',
  frameRate: 30,
});

/**
 * カメラが利用可能かの派生アトム
 */
export const isCameraAvailableAtom = atom((get) => {
  const cameraState = get(cameraStateAtom);
  return cameraState.stream !== null && cameraState.isReady && !cameraState.error;
});

/**
 * カメラ権限が許可されているかの派生アトム
 */
export const isCameraPermissionGrantedAtom = atom((get) => {
  const cameraState = get(cameraStateAtom);
  return cameraState.permissions.camera === 'granted';
});

/**
 * カメラ初期化中かの派生アトム
 */
export const isCameraInitializingAtom = atom((get) => {
  const cameraState = get(cameraStateAtom);
  return cameraState.isInitializing;
});

/**
 * カメラエラーの派生アトム
 */
export const cameraErrorAtom = atom((get) => {
  const cameraState = get(cameraStateAtom);
  return cameraState.error;
});

/**
 * 現在のビデオ解像度の派生アトム
 */
export const currentResolutionAtom = atom((get) => {
  const settings = get(cameraSettingsAtom);
  return `${settings.width}x${settings.height}`;
});

/**
 * カメラ初期化用の書き込み可能アトム
 */
export const initializeCameraAtom = atom(
  null,
  async (get, set, customConstraints?: MediaStreamConstraints) => {
    const currentState = get(cameraStateAtom);
    
    set(cameraStateAtom, {
      ...currentState,
      isInitializing: true,
      error: null,
    });

    try {
      // カメラ権限の確認
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      // MediaStreamの取得
      const constraints = customConstraints || currentState.constraints;
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // ビデオトラックの設定を取得
      const videoTrack = stream.getVideoTracks()[0];
      const settings = videoTrack?.getSettings();
      
      set(cameraStateAtom, {
        ...currentState,
        stream,
        isReady: true,
        isInitializing: false,
        error: null,
        permissions: {
          camera: permission.state,
        },
      });

      // カメラ設定を更新
      if (settings && settings.width && settings.height && settings.frameRate) {
        set(cameraSettingsAtom, {
          width: settings.width,
          height: settings.height,
          facingMode: settings.facingMode as 'user' | 'environment' || 'user',
          frameRate: settings.frameRate,
        });
      }

      return stream;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'カメラの初期化に失敗しました';
      
      set(cameraStateAtom, {
        ...currentState,
        stream: null,
        isReady: false,
        isInitializing: false,
        error: errorMessage,
      });

      throw error;
    }
  }
);

/**
 * カメラ停止用の書き込み可能アトム
 */
export const stopCameraAtom = atom(
  null,
  (get, set) => {
    const currentState = get(cameraStateAtom);
    
    if (currentState.stream) {
      // すべてのトラックを停止
      currentState.stream.getTracks().forEach(track => track.stop());
    }

    set(cameraStateAtom, {
      ...currentState,
      stream: null,
      isReady: false,
      error: null,
    });
  }
);

/**
 * カメラデバイス一覧取得用の書き込み可能アトム
 */
export const getCameraDevicesAtom = atom(
  null,
  async (get, set) => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 8)}`,
          groupId: device.groupId,
        }));

      set(availableCamerasAtom, videoDevices);
      return videoDevices;

    } catch (error) {
      console.error('カメラデバイス一覧の取得に失敗:', error);
      return [];
    }
  }
);

/**
 * カメラデバイス切り替え用の書き込み可能アトム
 */
export const switchCameraDeviceAtom = atom(
  null,
  async (get, set, deviceId: string) => {
    const currentState = get(cameraStateAtom);
    const currentSettings = get(cameraSettingsAtom);

    // 現在のストリームを停止
    if (currentState.stream) {
      currentState.stream.getTracks().forEach(track => track.stop());
    }

    try {
      // 新しいデバイスでストリームを開始
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: currentSettings.width },
          height: { ideal: currentSettings.height },
          frameRate: { ideal: currentSettings.frameRate },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      set(cameraStateAtom, {
        ...currentState,
        stream,
        isReady: true,
        error: null,
        constraints,
      });

      return stream;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'カメラデバイスの切り替えに失敗しました';
      
      set(cameraStateAtom, {
        ...currentState,
        stream: null,
        isReady: false,
        error: errorMessage,
      });

      throw error;
    }
  }
);

/**
 * カメラ解像度変更用の書き込み可能アトム
 */
export const changeCameraResolutionAtom = atom(
  null,
  async (get, set, width: number, height: number) => {
    const currentState = get(cameraStateAtom);
    const currentSettings = get(cameraSettingsAtom);

    if (!currentState.stream) {
      throw new Error('カメラが初期化されていません');
    }

    try {
      const videoTrack = currentState.stream.getVideoTracks()[0];
      
      if (!videoTrack) {
        throw new Error('ビデオトラックが見つかりません');
      }
      
      await videoTrack.applyConstraints({
        width: { ideal: width },
        height: { ideal: height },
        frameRate: { ideal: currentSettings.frameRate },
      });

      set(cameraSettingsAtom, {
        ...currentSettings,
        width,
        height,
      });

    } catch (error) {
      console.error('解像度の変更に失敗:', error);
      throw error;
    }
  }
);

/**
 * カメラエラーリセット用の書き込み可能アトム
 */
export const resetCameraErrorAtom = atom(
  null,
  (get, set) => {
    const currentState = get(cameraStateAtom);
    
    set(cameraStateAtom, {
      ...currentState,
      error: null,
    });
  }
);
