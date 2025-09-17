import styles from './page.module.scss';
import Card from '@/components/layout/card';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className={styles.homePage}>
      <Image
        src="homeDescription.svg"
        alt="Top Illustration"
        width={1060}
        height={220}
      />
      <div className={styles.cardWrapper}>
        <Link href="/measurement">
          <Card
            title="測定"
            description={'AIカメラで手首と\n母指の可動域を正確に測定'}
          />
        </Link>
        <Link href="/progress">
          <Card
            title="進捗確認"
            description={'測定データの推移と\n詳細な統計情報を表示'}
            isBlue={false}
          />
        </Link>
        <Link href="/calendar">
          <Card
            title="記録管理"
            description={'日々のリハビリ記録を\nカレンダーで管理'}
            isBlue={false}
          />
        </Link>
      </div>
    </div>
  );
}
