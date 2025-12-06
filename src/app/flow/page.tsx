import styles from './page.module.scss';
import Image from 'next/image';
import Link from 'next/link';

import icon from '@/assets/homeDescription.svg';

export default function FlowPage() {
  return (
    <div className={styles.flowPage}>
      <div className={styles.header}>
        <Link href="/" className={styles.backButton}>
          ← 戻る
        </Link>
      </div>

      <div className={styles.content}>
        <Image
          src={icon}
          alt="ご利用の流れ"
          className={styles.flowImage}
          priority
        />
      </div>

      <div className={styles.stepsWrapper}>
        <h2 className={styles.stepsTitle}>ご利用の流れ</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <h3>測定</h3>
              <p>AIカメラで手首と母指の可動域を正確に測定します</p>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <h3>進捗確認</h3>
              <p>測定データの推移と詳細な統計情報を確認できます</p>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <h3>記録管理</h3>
              <p>日々のリハビリ記録をカレンダーで管理します</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
