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
import { flushSync } from 'react-dom';

const SCROLL_SETTLE_MS = 150;
const FOCUSABLE_SELECTOR =
  'a[href], button, input, select, textarea, [tabindex]';

type SideScrollProps = {
  label?: string;
  labelledBy?: string;
  asLandmark?: boolean;
  prevButtonLabel?: string;
  nextButtonLabel?: string;
  slidesFocusable?: 'auto' | 'always' | 'never';
} & React.PropsWithChildren;

export const SideScroll: React.FC<SideScrollProps> = ({
  children,
  label,
  labelledBy,
  asLandmark,
  prevButtonLabel,
  nextButtonLabel,
  slidesFocusable = 'auto',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const pendingFocusEdgeRef = useRef<'start' | 'end' | null>(null);
  const childrenSlides = Children.toArray(children);
  const allChildrenAreValidElements = childrenSlides.every(isValidElement);
  const [visibleSlides, setVisibleSlides] =
    useState<ReadonlySet<number> | null>(null);
  const [slidesWithFocusableChild, setSlidesWithFocusableChild] =
    useState<ReadonlySet<number> | null>(null);
  const getSlideTabIndex = (index: number): number => {
    switch (slidesFocusable) {
      case 'never':
        return -1;
      case 'always':
        return 0;
      case 'auto':
        if (slidesWithFocusableChild === null) return 0;
        return slidesWithFocusableChild.has(index) ? -1 : 0;
    }
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const slides = Array.from(el.children);

    const withFocusableChild = new Set<number>();
    slides.forEach((slide, index) => {
      const hasFocusableChild = slide.querySelector(FOCUSABLE_SELECTOR);
      if (hasFocusableChild) {
        withFocusableChild.add(index);
      }
    });
    setSlidesWithFocusableChild(withFocusableChild);

    const visible = new Set<number>();

    let hasMeasured = false;
    let settleTimer = 0;

    const commit = (): void => {
      const focusedIndex = slides.findIndex((slide) =>
        slide.contains(document.activeElement),
      );
      let focusTargetIndex: number | null = null;
      if (
        focusedIndex !== -1 &&
        visible.size > 0 &&
        !visible.has(focusedIndex)
      ) {
        const firstVisible = Math.min(...visible);
        const lastVisible = Math.max(...visible);
        const targetIndex =
          focusedIndex < firstVisible ? firstVisible : lastVisible;

        focusTargetIndex = targetIndex;
      }
      if (pendingFocusEdgeRef.current !== null && visible.size > 0) {
        focusTargetIndex =
          pendingFocusEdgeRef.current === 'end'
            ? Math.max(...visible)
            : Math.min(...visible);
      }
      pendingFocusEdgeRef.current = null;

      flushSync(() =>
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
        }),
      );
      if (focusTargetIndex !== null) {
        const target = slides[focusTargetIndex];
        if (target instanceof HTMLElement) {
          target.focus({ preventScroll: true });
        }
      }
    };

    const remeasure = (): void => {
      hasMeasured = false;
      observer.disconnect();
      slides.forEach((slide) => observer.observe(slide));
    };

    const scheduleRemeasure = (): void => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(remeasure, SCROLL_SETTLE_MS);
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

        if (!hasMeasured) {
          hasMeasured = true;
          commit();
        }
      },
      {
        root: el,
        rootMargin: '0px',
        threshold: [0, 0.99, 1],
      },
    );
    slides.forEach((slide) => observer.observe(slide));
    const abortController = new AbortController();
    const { signal } = abortController;

    el.addEventListener('scrollend', remeasure, { passive: true, signal });

    if (!('onscrollend' in window)) {
      el.addEventListener('scroll', scheduleRemeasure, {
        passive: true,
        signal,
      });
    }

    const resizeObserver = new ResizeObserver(scheduleRemeasure);
    resizeObserver.observe(el);
    for (const slide of slides) {
      resizeObserver.observe(slide);
    }
    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      abortController.abort();
      window.clearTimeout(settleTimer);
    };
  }, [childrenSlides.length]);

  const [controlButtonFocus, setControlButtonFocus] = useState<
    'prev' | 'next' | null
  >(null);
  const hidePrevButton =
    (visibleSlides === null || visibleSlides.has(0)) &&
    controlButtonFocus !== 'prev';
  const hideNextButton =
    (visibleSlides === null || visibleSlides.has(childrenSlides.length - 1)) &&
    controlButtonFocus !== 'next';
  const hasAccessibleName = Boolean(label || labelledBy);
  const isCarousel =
    hasAccessibleName &&
    visibleSlides !== null &&
    visibleSlides.size !== childrenSlides.length;

  const handleNextClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    if (!visibleSlides || visibleSlides.size === 0) return;
    if (!event.currentTarget.matches(':focus-visible')) {
      pendingFocusEdgeRef.current = 'end';
    }
    scrollToSlide(Math.min(...visibleSlides) + 1);
  };

  const handlePrevClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    if (!visibleSlides || visibleSlides.size === 0) return;
    if (!event.currentTarget.matches(':focus-visible')) {
      pendingFocusEdgeRef.current = 'start';
    }
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
      role={isCarousel ? (asLandmark ? 'region' : 'group') : undefined}
      aria-roledescription={isCarousel ? 'Karussell' : undefined}
      aria-labelledby={isCarousel ? labelledBy : undefined}
      aria-label={isCarousel ? (labelledBy ? undefined : label) : undefined}
    >
      <button
        className={`${styles['control-button']} ${styles['prev-button']}`}
        type="button"
        hidden={hidePrevButton}
        aria-controls={trackId}
        aria-label={prevButtonLabel || 'Vorherige Folie'}
        onClick={handlePrevClick}
        onBlur={() => setControlButtonFocus(null)}
        onFocus={(event: React.FocusEvent<HTMLButtonElement>) => {
          if (event.currentTarget.matches(':focus-visible')) {
            setControlButtonFocus('prev');
          }
        }}
      >
        {prevButtonLabel || 'Zurück'}
      </button>
      <div
        className={styles['slide-container']}
        role={isCarousel ? 'presentation' : 'list'}
        ref={trackRef}
        id={trackId}
      >
        {childrenSlides.map((slide, index) => (
          <div
            className={styles.slide}
            key={index}
            tabIndex={getSlideTabIndex(index)}
            inert={visibleSlides !== null && !visibleSlides.has(index)}
            role={isCarousel ? 'group' : 'listitem'}
            aria-roledescription={isCarousel ? 'Folie' : undefined}
            aria-label={
              isCarousel
                ? `${index + 1} von ${childrenSlides.length}`
                : undefined
            }
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
        onBlur={() => setControlButtonFocus(null)}
        onFocus={(event: React.FocusEvent<HTMLButtonElement>) => {
          if (event.currentTarget.matches(':focus-visible')) {
            setControlButtonFocus('next');
          }
        }}
      >
        {nextButtonLabel || 'Weiter'}
      </button>
    </div>
  );
};