// グローバル型定義
/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  var NodeJS: any;
  var PermissionName: string;
  var PermissionState: 'granted' | 'denied' | 'prompt';
  var NotificationPermission: 'granted' | 'denied' | 'default';
  var NotificationOptions: any;
  var RequestInit: any;
  var JSX: any;
}

// 動画ファイルのモジュール宣言
declare module '*.mp4' {
  const src: string;
  export default src;
}

export {};
