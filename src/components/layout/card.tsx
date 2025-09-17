import React from 'react';
import styles from './card.module.scss';

type CardProps = {
  title: string;
  description: string;
  onClick?: () => void;
  isBlue?: boolean;
};

const Card: React.FC<CardProps> = ({
  title,
  description,
  onClick,
  isBlue = true,
}) => {
  const cardClass = isBlue ? styles.card : `${styles.card} ${styles.white}`;
  return (
    <div className={cardClass}>
      <div className={styles.cardTitle}>{title}</div>
      <div className={styles.cardDescription}>{description}</div>
      <div className={styles.cardArrow}>
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
      </div>
    </div>
  );
};

export default Card;
