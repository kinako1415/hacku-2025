/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ビルド時のESLintエラーを無視（開発時はlintコマンドで確認）
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ビルド時の型チェックを実施
    ignoreBuildErrors: false,
  },
  sassOptions: {
    includePaths: ['./src'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.iconify.design',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3845',
      },
    ],
  },
  webpack: (config) => {
    // MediaPipe用の設定
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };

    // 動画ファイル（.mp4）の処理設定
    config.module.rules.push({
      test: /\.(mp4|webm|ogg)$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/media/[name].[hash][ext]',
      },
    });

    return config;
  },
};

module.exports = nextConfig;
