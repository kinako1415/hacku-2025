/**
 * クロスブラウザ互換性テスト
 *
 * 対象ブラウザ:
 * - Chrome/Chromium (デスクトップ・モバイル)
 * - Firefox (デスクトップ・モバイル)
 * - Safari (デスクトップ・モバイル)
 * - Edge (デスクトップ)
 *
 * テスト項目:
 * - 基本機能
 * - MediaPipe互換性
 * - PWA機能
 * - パフォーマンス
 * - レスポンシブデザイン
 */

import {
  test,
  expect,
  devices,
  Browser,
  BrowserContext,
  Page,
} from '@playwright/test';

// 型定義
type BrowserFeatures = {
  mediapipe: boolean;
  pwa: boolean;
  webgl: boolean;
  webrtc: boolean;
};

type BrowserConfig = {
  name: string;
  device: any;
  features: BrowserFeatures;
};

type CompatibilityResult = {
  browser: string;
  feature: string;
  supported: boolean;
  errorMessage?: string;
};

// テスト対象ブラウザ設定
const BROWSER_CONFIGS = [
  {
    name: 'Chrome Desktop',
    device: devices['Desktop Chrome'],
    features: {
      mediapipe: true,
      pwa: true,
      webgl: true,
      webrtc: true,
    },
  },
  {
    name: 'Chrome Mobile',
    device: devices['Pixel 5'],
    features: {
      mediapipe: true,
      pwa: true,
      webgl: true,
      webrtc: true,
    },
  },
  {
    name: 'Firefox Desktop',
    device: devices['Desktop Firefox'],
    features: {
      mediapipe: true,
      pwa: false, // Firefoxでは制限あり
      webgl: true,
      webrtc: true,
    },
  },
  {
    name: 'Firefox Mobile',
    device: devices['Pixel 5 Firefox'],
    features: {
      mediapipe: true,
      pwa: false,
      webgl: true,
      webrtc: true,
    },
  },
  {
    name: 'Safari Desktop',
    device: devices['Desktop Safari'],
    features: {
      mediapipe: false, // Safari制限
      pwa: true,
      webgl: true,
      webrtc: true,
    },
  },
  {
    name: 'Safari Mobile',
    device: devices['iPhone 12'],
    features: {
      mediapipe: false,
      pwa: true,
      webgl: true,
      webrtc: true,
    },
  },
  {
    name: 'Edge Desktop',
    device: devices['Desktop Edge'],
    features: {
      mediapipe: true,
      pwa: true,
      webgl: true,
      webrtc: true,
    },
  },
];

// 共通テストケース
interface TestCase {
  name: string;
  description: string;
  test: (page: Page, config: any) => Promise<void>;
  requiredFeatures?: string[];
}

const CROSS_BROWSER_TESTS: TestCase[] = [
  {
    name: 'basic-page-load',
    description: '基本ページ読み込み',
    test: async (page) => {
      await page.goto('/');
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="navigation"]')).toBeVisible();
    },
  },
  {
    name: 'responsive-design',
    description: 'レスポンシブデザイン',
    test: async (page, config) => {
      await page.goto('/');

      // ビューポートサイズに応じたレイアウト確認
      const isMobile = config.device.viewport.width < 768;

      if (isMobile) {
        // モバイルレイアウト確認
        await expect(
          page.locator('[data-testid="mobile-navigation"]')
        ).toBeVisible();
        await expect(
          page.locator('[data-testid="hamburger-menu"]')
        ).toBeVisible();
      } else {
        // デスクトップレイアウト確認
        await expect(
          page.locator('[data-testid="desktop-navigation"]')
        ).toBeVisible();
        await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
      }
    },
  },
  {
    name: 'camera-access',
    description: 'カメラアクセス',
    test: async (page) => {
      await page.goto('/measurement');

      // カメラ許可
      await page.click('[data-testid="start-camera"]');

      // ユーザーメディア取得確認
      const hasCamera = await page.evaluate(async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          stream.getTracks().forEach((track) => track.stop());
          return true;
        } catch {
          return false;
        }
      });

      if (hasCamera) {
        await expect(
          page.locator('[data-testid="camera-stream"]')
        ).toBeVisible();
      } else {
        await expect(
          page.locator('[data-testid="camera-error"]')
        ).toBeVisible();
      }
    },
    requiredFeatures: ['webrtc'],
  },
  {
    name: 'mediapipe-compatibility',
    description: 'MediaPipe互換性',
    test: async (page, config) => {
      if (!config.features.mediapipe) {
        // MediaPipe非対応ブラウザではスキップ
        console.log(`MediaPipe not supported on ${config.name}`);
        return;
      }

      await page.goto('/measurement');

      // MediaPipe初期化
      await page.click('[data-testid="initialize-mediapipe"]');

      // WASM読み込み確認
      const wasmSupported = await page.evaluate(() => {
        return typeof WebAssembly !== 'undefined';
      });

      expect(wasmSupported).toBe(true);

      // MediaPipe読み込み完了確認
      await expect(page.locator('[data-testid="mediapipe-ready"]')).toBeVisible(
        { timeout: 15000 }
      );
    },
    requiredFeatures: ['mediapipe'],
  },
  {
    name: 'webgl-support',
    description: 'WebGL対応',
    test: async (page) => {
      await page.goto('/');

      const webglSupported = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl =
          canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!gl;
      });

      expect(webglSupported).toBe(true);

      // WebGLコンテキスト情報取得
      const webglInfo = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') as WebGLRenderingContext;
        if (!gl) return null;

        return {
          vendor: gl.getParameter(gl.VENDOR),
          renderer: gl.getParameter(gl.RENDERER),
          version: gl.getParameter(gl.VERSION),
          shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        };
      });

      expect(webglInfo).not.toBeNull();
      console.log('WebGL Info:', webglInfo);
    },
    requiredFeatures: ['webgl'],
  },
  {
    name: 'pwa-features',
    description: 'PWA機能',
    test: async (page, config) => {
      if (!config.features.pwa) {
        console.log(`PWA not fully supported on ${config.name}`);
        return;
      }

      await page.goto('/');

      // Service Worker登録確認
      const serviceWorkerSupported = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          try {
            const registration =
              await navigator.serviceWorker.register('/sw.js');
            return !!registration;
          } catch {
            return false;
          }
        }
        return false;
      });

      expect(serviceWorkerSupported).toBe(true);

      // Web App Manifest確認
      const manifestSupported = await page.evaluate(() => {
        return 'manifest' in document.documentElement;
      });

      expect(manifestSupported).toBe(true);
    },
    requiredFeatures: ['pwa'],
  },
  {
    name: 'local-storage',
    description: 'ローカルストレージ',
    test: async (page) => {
      await page.goto('/');

      // localStorage確認
      const localStorageTest = await page.evaluate(() => {
        try {
          localStorage.setItem('test', 'value');
          const value = localStorage.getItem('test');
          localStorage.removeItem('test');
          return value === 'value';
        } catch {
          return false;
        }
      });

      expect(localStorageTest).toBe(true);

      // IndexedDB確認
      const indexedDBTest = await page.evaluate(() => {
        return 'indexedDB' in window;
      });

      expect(indexedDBTest).toBe(true);
    },
  },
  {
    name: 'css-features',
    description: 'CSS機能対応',
    test: async (page) => {
      await page.goto('/');

      // CSS Grid対応確認
      const gridSupported = await page.evaluate(() => {
        return CSS.supports('display', 'grid');
      });

      expect(gridSupported).toBe(true);

      // CSS Flexbox対応確認
      const flexSupported = await page.evaluate(() => {
        return CSS.supports('display', 'flex');
      });

      expect(flexSupported).toBe(true);

      // CSS Custom Properties対応確認
      const customPropsSupported = await page.evaluate(() => {
        return CSS.supports('--custom-property', 'value');
      });

      expect(customPropsSupported).toBe(true);
    },
  },
  {
    name: 'javascript-features',
    description: 'JavaScript機能対応',
    test: async (page) => {
      await page.goto('/');

      const jsFeatures = await page.evaluate(() => {
        return {
          es6Modules: 'import' in document.createElement('script'),
          asyncAwait: typeof (async () => {}) === 'function',
          destructuring: (() => {
            try {
              eval('const {a} = {a:1}');
              return true;
            } catch {
              return false;
            }
          })(),
          arrowFunctions: (() => {
            try {
              eval('() => {}');
              return true;
            } catch {
              return false;
            }
          })(),
          templateLiterals: (() => {
            try {
              eval('`template`');
              return true;
            } catch {
              return false;
            }
          })(),
          promises: typeof Promise !== 'undefined',
          fetch: typeof fetch !== 'undefined',
        };
      });

      expect(jsFeatures.asyncAwait).toBe(true);
      expect(jsFeatures.promises).toBe(true);
      expect(jsFeatures.fetch).toBe(true);

      console.log('JavaScript Features:', jsFeatures);
    },
  },
  {
    name: 'performance-baseline',
    description: 'パフォーマンスベースライン',
    test: async (page, config) => {
      await page.goto('/');

      // ページロード時間計測
      const loadMetrics = await page.evaluate(() => {
        const timing = performance.timing;
        return {
          loadTime: timing.loadEventEnd - timing.navigationStart,
          domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
          firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
        };
      });

      // デバイス別パフォーマンス閾値
      const isMobile = config.device.viewport.width < 768;
      const maxLoadTime = isMobile ? 5000 : 3000; // モバイルは5秒、デスクトップは3秒

      expect(loadMetrics.loadTime).toBeLessThan(maxLoadTime);
      expect(loadMetrics.domReady).toBeLessThan(maxLoadTime * 0.8);

      console.log(`Performance on ${config.name}:`, loadMetrics);
    },
  },
];

// 互換性テスト実行
BROWSER_CONFIGS.forEach((config) => {
  test.describe(`${config.name} Compatibility Tests`, () => {
    let context: BrowserContext;
    let page: Page;

    test.beforeAll(async ({ browser }) => {
      context = await browser.newContext({
        ...config.device,
        permissions: ['camera'],
      });
      page = await context.newPage();

      // ブラウザ固有の設定
      await setupBrowserSpecificMocks(page, config);
    });

    test.afterAll(async () => {
      await context.close();
    });

    CROSS_BROWSER_TESTS.forEach((testCase) => {
      test(`${testCase.name}: ${testCase.description}`, async () => {
        // 必要な機能の確認
        if (testCase.requiredFeatures) {
          const hasRequiredFeatures = testCase.requiredFeatures.every(
            (feature) =>
              config.features[feature as keyof typeof config.features]
          );

          if (!hasRequiredFeatures) {
            test.skip();
            return;
          }
        }

        try {
          await testCase.test(page, config);
        } catch (error) {
          console.error(`Test failed on ${config.name}:`, error);
          throw error;
        }
      });
    });

    // ブラウザ固有のテスト
    test('browser-specific-features', async () => {
      await testBrowserSpecificFeatures(page, config);
    });
  });
});

// 統合互換性レポート生成
test.describe('Cross-Browser Compatibility Report', () => {
  test('generate-compatibility-matrix', async ({ browser }) => {
    const compatibilityMatrix: { [key: string]: { [key: string]: boolean } } =
      {};

    for (const config of BROWSER_CONFIGS) {
      const context = await browser.newContext(config.device);
      const page = await context.newPage();

      compatibilityMatrix[config.name] = {};

      for (const testCase of CROSS_BROWSER_TESTS) {
        try {
          await testCase.test(page, config);
          if (compatibilityMatrix[config.name]) {
            compatibilityMatrix[config.name][testCase.name] = true;
          }
        } catch {
          if (compatibilityMatrix[config.name]) {
            compatibilityMatrix[config.name][testCase.name] = false;
          }
        }
      }

      await context.close();
    }

    // 結果をコンソールに出力
    console.table(compatibilityMatrix);

    // 結果をファイルに保存
    const fs = require('fs');
    const reportPath = './test-results/compatibility-report.json';

    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          matrix: compatibilityMatrix,
          summary: generateCompatibilitySummary(compatibilityMatrix),
        },
        null,
        2
      )
    );

    console.log(`Compatibility report saved to ${reportPath}`);
  });
});

// ヘルパー関数
async function setupBrowserSpecificMocks(page: Page, config: any) {
  // ブラウザ固有のモック設定
  if (config.name.includes('Safari')) {
    // Safari固有の設定
    await page.addInitScript(() => {
      // WebRTCの制限対応
      if (!navigator.mediaDevices) {
        (navigator as any).mediaDevices = {};
      }
    });
  }

  if (config.name.includes('Firefox')) {
    // Firefox固有の設定
    await page.addInitScript(() => {
      // MediaPipe WASMの互換性対応
      if (!window.WebAssembly) {
        console.warn('WebAssembly not supported');
      }
    });
  }
}

async function testBrowserSpecificFeatures(page: Page, config: any) {
  // ブラウザエンジン検出
  const browserInfo = await page.evaluate(() => {
    const ua = navigator.userAgent;
    return {
      isChrome: /Chrome/.test(ua) && !/Edge/.test(ua),
      isFirefox: /Firefox/.test(ua),
      isSafari: /Safari/.test(ua) && !/Chrome/.test(ua),
      isEdge: /Edge/.test(ua),
      isMobile: /Mobile|Android|iPhone|iPad/.test(ua),
    };
  });

  // Chrome固有テスト
  if (browserInfo.isChrome) {
    const chromeFeatures = await page.evaluate(() => {
      return {
        webgl2: !!document.createElement('canvas').getContext('webgl2'),
        offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
        intersectionObserver: typeof IntersectionObserver !== 'undefined',
      };
    });

    expect(chromeFeatures.webgl2).toBe(true);
    expect(chromeFeatures.intersectionObserver).toBe(true);
  }

  // Firefox固有テスト
  if (browserInfo.isFirefox) {
    const firefoxFeatures = await page.evaluate(() => {
      return {
        wasmSupported: typeof WebAssembly !== 'undefined',
        webglSupported: !!document.createElement('canvas').getContext('webgl'),
      };
    });

    expect(firefoxFeatures.wasmSupported).toBe(true);
    expect(firefoxFeatures.webglSupported).toBe(true);
  }

  // Safari固有テスト
  if (browserInfo.isSafari) {
    const safariFeatures = await page.evaluate(() => {
      return {
        webkitPrefix: 'webkitRequestAnimationFrame' in window,
        touchEvents: 'ontouchstart' in window,
      };
    });

    if (browserInfo.isMobile) {
      expect(safariFeatures.touchEvents).toBe(true);
    }
  }
}

function generateCompatibilitySummary(matrix: {
  [key: string]: { [key: string]: boolean };
}) {
  const summary = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    browserSupport: {} as { [key: string]: number },
    featureSupport: {} as { [key: string]: number },
  };

  const browsers = Object.keys(matrix);
  if (browsers.length === 0) return summary;

  const firstBrowser = browsers[0];
  if (!firstBrowser) return summary;

  const firstBrowserMatrix = matrix[firstBrowser];
  const features = firstBrowserMatrix ? Object.keys(firstBrowserMatrix) : [];

  summary.totalTests = browsers.length * features.length;

  browsers.forEach((browser) => {
    const browserMatrix = matrix[browser];
    if (!browserMatrix) return;

    let browserPassed = 0;
    features.forEach((feature) => {
      const passed = browserMatrix[feature];
      if (passed) {
        summary.passedTests++;
        browserPassed++;
      } else {
        summary.failedTests++;
      }

      if (!summary.featureSupport[feature]) {
        summary.featureSupport[feature] = 0;
      }
      if (passed) {
        summary.featureSupport[feature]++;
      }
    });

    summary.browserSupport[browser] = (browserPassed / features.length) * 100;
  });

  // 機能別サポート率計算
  Object.keys(summary.featureSupport).forEach((feature) => {
    const supportCount = summary.featureSupport[feature];
    if (supportCount !== undefined) {
      summary.featureSupport[feature] = (supportCount / browsers.length) * 100;
    }
  });

  return summary;
}
