'use client';

import styles from './sidescroll.module.css';
import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

type SideScrollProps = {
  prevButtonLabel?: string;
  nextButtonLabel?: string;
} & React.PropsWithChildren;

export const SideScroll: React.FC<SideScrollProps> = ({
  children,
  prevButtonLabel,
  nextButtonLabel,
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

  const hidePrevButton = visibleSlides === null || visibleSlides.has(0);
  const hideNextButton =
    visibleSlides === null || visibleSlides.has(childrenSlides.length - 1);

  const handleNextClick = (): void => {
    if (!visibleSlides) {
      return;
    }
    if (visibleSlides.size === 0) return;
    scrollToSlide(Math.min(...visibleSlides) + 1);
  };

  const handlePrevClick = (): void => {
    if (!visibleSlides) {
      return;
    }
    if (visibleSlides.size === 0) return;
    scrollToSlide(Math.min(...visibleSlides) - 1);
  };

  const scrollToSlide = (index: number): void => {
    const el = trackRef.current;
    if (!el) {
      return;
    }
    if (index < 0 || index >= el.children.length) {
      return;
    }
    const trackRect = el.getBoundingClientRect();
    const slide = el.children[index];
    const slideRect = slide.getBoundingClientRect();
    const targetScrollLeft = el.scrollLeft + slideRect.left - trackRect.left;

    el.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
  };
  const trackId = useId();
  if (!allChildrenAreValidElements) {
    return null;
  }

  return (
    <div
      className={styles.container}
    >
      <button
        className={`${styles['control-button']} ${styles['prev-button']}`}
        type="button"
        hidden={hidePrevButton}
        aria-controls={trackId}
        aria-label={prevButtonLabel || 'Vorherige Folie'}
        onClick={handlePrevClick}
      >
        {prevButtonLabel || 'Zurück'}
      </button>
      <div
        className={styles['slide-container']}
        ref={trackRef}
        id={trackId}
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
      <button
        className={`${styles['control-button']} ${styles['next-button']}`}
        type="button"
        hidden={hideNextButton}
        aria-controls={trackId}
        aria-label={nextButtonLabel || 'Nächste Folie'}
        onClick={handleNextClick}
      >
        {nextButtonLabel || 'Weiter'}
      </button>
    </div>
  );
};