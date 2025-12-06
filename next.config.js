/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ビルド時のESLintエラーを無視（開発時はlintコマンドで確認）
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ビルド時の型チェックは実施
    ignoreBuildErrors: false,
  },
  sassOptions: {
    includePaths: ['./src'],
  },
  images: {
    domains: ['api.iconify.design'],
  },
  webpack: (config) => {
    // MediaPipe用の設定
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
};

module.exports = nextConfig;
