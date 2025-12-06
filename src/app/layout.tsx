import type { Metadata } from 'next';
import './globals.scss';
import '../styles/variables.css';
import Header from '@/components/common/Header';

export const metadata: Metadata = {
  title: 'AI駆動手首・母指可動域リハビリテーションアプリ',
  description: 'カメラベース可動域測定とカレンダー記録管理',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <Header />
        <main className="main-content">{children}</main>
      </body>
    </html>
  );
}
