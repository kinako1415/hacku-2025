'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.scss';

interface NavigationItem {
  href: string;
  label: string;
  icon: string;
}

const navigationItems: NavigationItem[] = [
  { href: '/progress', label: '進捗', icon: '📊' },
  { href: '/measurement', label: '測定', icon: '📏' },
  { href: '/calendar', label: 'カレンダー', icon: '📅' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* 左側: ホームボタン */}
        <div className={styles.homeSection}>
          <Link href="/" className={styles.homeButton}>
            <span className={styles.homeIcon}>🏠</span>
            <span className={styles.homeText}>ホーム</span>
          </Link>
        </div>

        {/* 中央: アプリタイトル */}
        <div className={styles.titleSection}>
          <h1 className={styles.title}>AI リハビリテーション</h1>
        </div>

        {/* 右側: ナビゲーションメニュー */}
        <nav className={styles.navigation}>
          <ul className={styles.navList}>
            {navigationItems.map((item) => (
              <li key={item.href} className={styles.navItem}>
                <Link
                  href={item.href}
                  className={`${styles.navLink} ${
                    pathname === item.href ? styles.active : ''
                  }`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navText}>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
