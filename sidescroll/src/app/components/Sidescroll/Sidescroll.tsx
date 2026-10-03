'use client';

import styles from './sidescroll.module.css';
import {
  Children,
  isValidElement,
  useRef,
} from 'react';

type SideScrollProps = React.PropsWithChildren;

export const SideScroll: React.FC<SideScrollProps> = ({
  children,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const childrenSlides = Children.toArray(children);
  const allChildrenAreValidElements = childrenSlides.every(isValidElement);

  if (!allChildrenAreValidElements) {
    return null;
  }

  return (
    <div
      className={styles.container}
    >
      <div
        className={styles['slide-container']}
        ref={trackRef}
      >
        {childrenSlides.map((slide, index) => (
          <div
            className={styles.slide}
            key={index}
          >
            {slide}
          </div>
        ))}
      </div>
    </div>
  );
};