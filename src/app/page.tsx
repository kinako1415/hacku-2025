import styles from './page.module.scss';
import Card from '@/components/layout/card';
import Link from 'next/link';
import Image from 'next/image';

import icon from '@/assets/homeDescription.svg';

export default function Home() {
  return (
    <div className={styles.homePage}>
      <div className={styles.cardWrapper}>
        {/* PC時: 測定、進捗確認、記録管理 / スマホ時: 記録管理、進捗確認、測定、利用の流れ */}
        <Link href="/measurement" className={styles.measurementCard}>
          <Card
            title="測定"
            description={'AIカメラで手首と\n母指の可動域を正確に測定'}
            width={340}
            isBlue={true}
          />
        </Link>
        <Link href="/progress" className={styles.progressCard}>
          <Card
            title="進捗確認"
            description={'測定データの推移と\n詳細な統計情報を表示'}
            isBlue={false}
            width={340}
          />
        </Link>
        <Link href="/calendar" className={styles.calendarCard}>
          <Card
            title="記録管理"
            description={'日々のリハビリ記録を\nカレンダーで管理'}
            isBlue={false}
            width={340}
          />
        </Link>
        {/* スマホ時のみ表示される「利用の流れ」カード */}
        <Link href="/flow" className={styles.flowCard}>
          <Card
            title="利用の流れ"
            description={''}
            isBlue={false}
            width={340}
            height={100}
          />
        </Link>
      </div>
      {/* PC時のみ表示される画像リンク */}
      <Link href="/flow" className={styles.flowLink}>
        <Image src={icon} alt="利用の流れ" width={1060} height={220} />
      </Link>
    </div>
  );
}
