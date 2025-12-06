import styles from './page.module.scss';
import Card from '@/components/layout/card';
import Link from 'next/link';
import Image from 'next/image';

import icon from '@/assets/homeDescription.svg';

export default function Home() {
  return (
    <div className={styles.homePage}>
      <div className={styles.cardWrapper}>
        <Link href="/measurement">
          <Card
            title="測定"
            description={'AIカメラで手首と\n母指の可動域を正確に測定'}
            width={340}
            isBlue={true}
          />
        </Link>
        <Link href="/progress">
          <Card
            title="進捗確認"
            description={'測定データの推移と\n詳細な統計情報を表示'}
            isBlue={false}
            width={340}
          />
        </Link>
        <Link href="/calendar">
          <Card
            title="記録管理"
            description={'日々のリハビリ記録を\nカレンダーで管理'}
            isBlue={false}
            width={340}
          />
        </Link>
      </div>
      <Link 
        href="/assets/homeDescription.svg" 
        target="_blank" 
        rel="noopener noreferrer"
        className={styles.flowLink}
      >
        <Image src={icon} alt="利用の流れ" width={1060} height={220} />
      </Link>
    </div>
  );
}
