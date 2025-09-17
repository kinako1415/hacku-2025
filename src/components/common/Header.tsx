'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.scss';
export default function Header() {
  const pathname = usePathname();
  return (
    <header className={styles.header}>
      <div className={styles.simpleHeaderContainer}>
        {/* 左: タイトル */}
        <div className={styles.simpleTitle}>Rehabit</div>
        {/* 右: メニュー */}
        <nav className={styles.simpleNav}>
          <Link
            href="/progress"
            className={
              pathname === '/progress'
                ? styles.simpleActionButton
                : styles.simpleNavLink
            }
          >
            進捗確認
          </Link>
          <Link
            href="/calendar"
            className={
              pathname === '/calendar'
                ? styles.simpleActionButton
                : styles.simpleNavLink
            }
          >
            記録管理
          </Link>
          <Link
            href="/measurement"
            className={
              pathname === '/measurement'
                ? styles.simpleActionButton
                : styles.simpleNavLink
            }
          >
            測定
          </Link>
        </nav>
      </div>
    </header>
  );
}
