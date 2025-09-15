import Link from 'next/link';
import styles from './page.module.scss';

export default function Home() {
  return (
    <div className={styles.homePage}>
      <div className={styles.heroSection}>
        <h1 className={styles.heroTitle}>
          <span className={styles.titleIcon}>🏥</span>
          AI リハビリテーション
        </h1>
        <p className={styles.heroDescription}>
          カメラベースの手首・母指可動域測定と
          <br />
          包括的なリハビリテーション記録管理
        </p>
      </div>

      <div className={styles.featuresGrid}>
        <Link href="/measurement" className={styles.featureCard}>
          <div className={styles.cardIcon}>📏</div>
          <h3 className={styles.cardTitle}>測定開始</h3>
          <p className={styles.cardDescription}>
            AIカメラで手首と母指の可動域を正確に測定
          </p>
        </Link>

        <Link href="/progress" className={styles.featureCard}>
          <div className={styles.cardIcon}>📊</div>
          <h3 className={styles.cardTitle}>進捗確認</h3>
          <p className={styles.cardDescription}>
            測定データの推移と詳細な統計情報を表示
          </p>
        </Link>

        <Link href="/calendar" className={styles.featureCard}>
          <div className={styles.cardIcon}>📅</div>
          <h3 className={styles.cardTitle}>記録管理</h3>
          <p className={styles.cardDescription}>
            日々のリハビリ記録をカレンダーで管理
          </p>
        </Link>
      </div>

      <div className={styles.infoSection}>
        <h2 className={styles.infoTitle}>使い方</h2>
        <div className={styles.stepsGrid}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h4>測定</h4>
            <p>カメラで手の可動域を測定</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h4>記録</h4>
            <p>測定結果を自動保存</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h4>確認</h4>
            <p>進捗を可視化して確認</p>
          </div>
        </div>
      </div>
    </div>
  );
}
