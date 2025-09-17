import Link from 'next/link';
import styles from './page.module.scss';
import Card from '@/components/layout/card';

export default function Home() {
  return (
    <div className={styles.homePage}>
      <Card
        title="測定"
        description={'AIカメラで手首と\n母指の可動域を正確に測定'}
        isBlue={false}
      />
    </div>
  );
}
