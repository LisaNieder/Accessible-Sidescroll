'use client';

import styles from './sidescroll.module.css';
import {
  Children,
  isValidElement,
  useEffect,
  useRef,
  useState,
} from 'react';

type SideScrollProps = React.PropsWithChildren;

export const SideScroll: React.FC<SideScrollProps> = ({
  children,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const childrenSlides = Children.toArray(children);
  const allChildrenAreValidElements = childrenSlides.every(isValidElement);
  const [visibleSlides, setVisibleSlides] =
    useState<ReadonlySet<number> | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const slides = Array.from(el.children);

    const visible = new Set<number>();

    const commit = (): void => {
      setVisibleSlides((prev) => {
        const next = new Set(visible);
        if (prev === null) {
          return next;
        }
        if (prev.size !== next.size) {
          return next;
        }

        const isUnchanged = [...next].every((index) => prev.has(index));
        if (isUnchanged) {
          return prev;
        }
        return next;
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = slides.indexOf(entry.target);
          const isInView = entry.intersectionRatio >= 0.99;
          if (isInView) {
            visible.add(index);
          } else {
            visible.delete(index);
          }
        }

        commit();
      },
      {
        root: el,
        rootMargin: '0px',
        threshold: [0, 0.99, 1],
      },
    );
    slides.forEach((slide) => observer.observe(slide));
    return () => {
      observer.disconnect();
    };
  }, [childrenSlides.length]);

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