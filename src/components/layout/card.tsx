'use client';

import React, { useEffect, useState } from 'react';
import styles from './card.module.scss';
import { usePathname } from 'next/navigation';
import { db as measurementDb } from '@/lib/database/measurement-db';

import Image from 'next/image';

import rightIcon from '@/assets/right.svg';
import leftIcon from '@/assets/left.svg';

type CardProps = {
  title?: string;
  description: string;
  role?: string | number;
  onClick?: () => void;
  isBlue?: boolean;
  width?: number;
  height?: number;
  isImprovements?: boolean;
  left?: string;
};

const Card: React.FC<CardProps> = ({
  title,
  description,
  role,
  onClick,
  isBlue = false,
  width = 350,
  height = 180,
  isImprovements = false,
  left,
}) => {
  const cardClass = isBlue ? styles.card : `${styles.card} ${styles.white}`;
  const pathname = usePathname();

  const [changeHand, setChangeHand] = useState<'左手' | '右手'>('右手');

  const improvements = isImprovements ? styles.improvements : '';

  const isCalendarPage = pathname === '/calendar';

  return (
    <div
      className={cardClass}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <div className={`${styles.cardTitle} ${improvements}`}>
        {isImprovements ? changeHand : title}
      </div>
      <div className={`${styles.cardDescription} ${improvements}`}>
        {description}
      </div>
      <div className={styles.cardFooter}>
        {isImprovements ? (
          <div className={styles.cardRole}>
            {changeHand === '右手' ? role : left}
          </div>
        ) : (
          <div className={styles.cardRole}>{role}</div>
        )}
        {isImprovements && (
          <div className={styles.icon}>
            <Image
              src={leftIcon}
              alt="改善率のイメージ画像"
              width={25}
              height={25}
              onClick={() =>
                setChangeHand(changeHand === '左手' ? '右手' : '左手')
              }
            />

            <Image
              src={rightIcon}
              alt="改善率のイメージ画像"
              width={25}
              height={25}
              onClick={() =>
                setChangeHand(changeHand === '左手' ? '右手' : '左手')
              }
            />
          </div>
        )}
      </div>
      <div className={styles.cardArrow}>
        {!isCalendarPage ? (
          <svg
            width="56"
            height="56"
            viewBox="0 0 56 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 38L38 18"
              stroke={isBlue ? '#fff' : '#0542FC'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M18 18H38V38"
              stroke={isBlue ? '#fff' : '#0542FC'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </div>
    </div>
  );
};

export default Card;
