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
  slideFocusMode?: 'auto' | 'always' | 'never';
} & React.PropsWithChildren;

export const SideScroll: React.FC<SideScrollProps> = ({
  children,
  label,
  labelledBy,
  asLandmark,
  prevButtonLabel,
  nextButtonLabel,
  slideFocusMode: slidesFocusable = 'auto',
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const pendingFocusEdgeRef = useRef<'start' | 'end' | null>(null);
  const slideNodes = Children.toArray(children);
  const hasOnlyValidElements = slideNodes.every(isValidElement);
  const [visibleSlideIndexes, setVisibleSlideIndexes] =
    useState<ReadonlySet<number> | null>(null);
  const [indexesWithFocusableChild, setIndexesWithFocusableChild] =
    useState<ReadonlySet<number> | null>(null);
  const getSlideTabIndex = (index: number): number => {
    switch (slidesFocusable) {
      case 'never':
        return -1;
      case 'always':
        return 0;
      case 'auto':
        if (indexesWithFocusableChild === null) return 0;
        return indexesWithFocusableChild.has(index) ? -1 : 0;
    }
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const slideElements = Array.from(track.children);

    const indexesWithFocusableChild = new Set<number>();
    slideElements.forEach((slide, index) => {
      const hasFocusableChild = slide.querySelector(FOCUSABLE_SELECTOR);
      if (hasFocusableChild) {
        indexesWithFocusableChild.add(index);
      }
    });
    setIndexesWithFocusableChild(indexesWithFocusableChild);

    const visibleIndexes = new Set<number>();

    let hasCommittedMeasurement = false;
    let settleTimer = 0;

    const commitMeasurement = (): void => {
      const focusedSlideIndex = slideElements.findIndex((slide) =>
        slide.contains(document.activeElement),
      );
      let focusTargetIndex: number | null = null;
      if (
        focusedSlideIndex !== -1 &&
        visibleIndexes.size > 0 &&
        !visibleIndexes.has(focusedSlideIndex)
      ) {
        const firstVisibleIndex = Math.min(...visibleIndexes);
        const lastVisibleIndex = Math.max(...visibleIndexes);

        focusTargetIndex = focusedSlideIndex < firstVisibleIndex ? firstVisibleIndex : lastVisibleIndex;
      }
      if (pendingFocusEdgeRef.current !== null && visibleIndexes.size > 0) {
        focusTargetIndex =
          pendingFocusEdgeRef.current === 'end'
            ? Math.max(...visibleIndexes)
            : Math.min(...visibleIndexes);
      }
      pendingFocusEdgeRef.current = null;

      flushSync(() =>
        setVisibleSlideIndexes((previousIndexes) => {
          const nextIndexes = new Set(visibleIndexes);
          if (previousIndexes === null) {
            return nextIndexes;
          }
          if (previousIndexes.size !== nextIndexes.size) {
            return nextIndexes;
          }

          const isSameSelection = [...nextIndexes].every((index) => previousIndexes.has(index));
          if (isSameSelection) {
            return previousIndexes;
          }
          return nextIndexes;
        }),
      );
      if (focusTargetIndex !== null) {
        const target = slideElements[focusTargetIndex];
        if (target instanceof HTMLElement) {
          target.focus({ preventScroll: true });
        }
      }
    };

    const remeasure = (): void => {
      hasCommittedMeasurement = false;
      intersectionObserver.disconnect();
      slideElements.forEach((slide) => intersectionObserver.observe(slide));
    };

    const scheduleRemeasure = (): void => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(remeasure, SCROLL_SETTLE_MS);
    };

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = slideElements.indexOf(entry.target);
          const isFullyVisible = entry.intersectionRatio >= 0.99;
          if (isFullyVisible) {
            visibleIndexes.add(index);
          } else {
            visibleIndexes.delete(index);
          }
        }

        if (!hasCommittedMeasurement) {
          hasCommittedMeasurement = true;
          commitMeasurement();
        }
      },
      {
        root: track,
        rootMargin: '0px',
        threshold: [0, 0.99, 1],
      },
    );
    slideElements.forEach((slide) => intersectionObserver.observe(slide));
    const abortController = new AbortController();
    const { signal } = abortController;

    track.addEventListener('scrollend', remeasure, { passive: true, signal });

    if (!('onscrollend' in window)) {
      track.addEventListener('scroll', scheduleRemeasure, {
        passive: true,
        signal,
      });
    }

    const resizeObserver = new ResizeObserver(scheduleRemeasure);
    resizeObserver.observe(track);
    for (const slide of slideElements) {
      resizeObserver.observe(slide);
    }
    return () => {
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      abortController.abort();
      window.clearTimeout(settleTimer);
    };
  }, [slideNodes.length]);

  const [focusedControl, setFocusedControl] = useState<
    'prev' | 'next' | null
  >(null);
  const shouldHidePrevButton =
    (visibleSlideIndexes === null || visibleSlideIndexes.has(0)) &&
    focusedControl !== 'prev';
  const shouldHideNextButton =
    (visibleSlideIndexes === null || visibleSlideIndexes.has(slideNodes.length - 1)) &&
    focusedControl !== 'next';
  const hasAccessibleName = Boolean(label || labelledBy);
  const hasCarouselSemantics =
    hasAccessibleName &&
    visibleSlideIndexes !== null &&
    visibleSlideIndexes.size !== slideNodes.length;

  const handleNextClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    if (!visibleSlideIndexes || visibleSlideIndexes.size === 0) return;
    if (!event.currentTarget.matches(':focus-visible')) {
      pendingFocusEdgeRef.current = 'end';
    }
    scrollToSlide(Math.min(...visibleSlideIndexes) + 1);
  };

  const handlePrevClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    if (!visibleSlideIndexes || visibleSlideIndexes.size === 0) return;
    if (!event.currentTarget.matches(':focus-visible')) {
      pendingFocusEdgeRef.current = 'start';
    }
    scrollToSlide(Math.min(...visibleSlideIndexes) - 1);
  };

  const scrollToSlide = (index: number): void => {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    if (index < 0 || index >= track.children.length) {
      return;
    }
    const trackRect = track.getBoundingClientRect();
    const slide = track.children[index];
    const slideRect = slide.getBoundingClientRect();
    const targetScrollLeft = track.scrollLeft + slideRect.left - trackRect.left;

    track.scrollTo({ left: targetScrollLeft, behavior: 'auto' });
  };
  const trackId = useId();
  if (!hasOnlyValidElements) {
    return null;
  }

  return (
    <div
      className={styles.container}
      role={hasCarouselSemantics ? (asLandmark ? 'region' : 'group') : undefined}
      aria-roledescription={hasCarouselSemantics ? 'Karussell' : undefined}
      aria-labelledby={hasCarouselSemantics ? labelledBy : undefined}
      aria-label={hasCarouselSemantics ? (labelledBy ? undefined : label) : undefined}
    >
      <button
        className={`${styles.controlButton} ${styles.prevButton}`}
        type="button"
        hidden={shouldHidePrevButton}
        aria-controls={trackId}
        aria-label={prevButtonLabel || 'Vorherige Folie'}
        onClick={handlePrevClick}
        onBlur={() => setFocusedControl(null)}
        onFocus={(event: React.FocusEvent<HTMLButtonElement>) => {
          if (event.currentTarget.matches(':focus-visible')) {
            setFocusedControl('prev');
          }
        }}
      >
        {prevButtonLabel || 'Zurück'}
      </button>
      <div
        className={styles.track}
        role={hasCarouselSemantics ? 'presentation' : 'list'}
        ref={trackRef}
        id={trackId}
      >
        {slideNodes.map((slide, index) => (
          <div
            className={styles.slide}
            key={index}
            tabIndex={getSlideTabIndex(index)}
            inert={visibleSlideIndexes !== null && !visibleSlideIndexes.has(index)}
            role={hasCarouselSemantics ? 'group' : 'listitem'}
            aria-roledescription={hasCarouselSemantics ? 'Folie' : undefined}
            aria-label={
              hasCarouselSemantics
                ? `${index + 1} von ${slideNodes.length}`
                : undefined
            }
          >
            {slide}
          </div>
        ))}
      </div>
      <button
        className={`${styles.controlButton} ${styles.nextButton}`}
        type="button"
        hidden={shouldHideNextButton}
        aria-controls={trackId}
        aria-label={nextButtonLabel || 'Nächste Folie'}
        onClick={handleNextClick}
        onBlur={() => setFocusedControl(null)}
        onFocus={(event: React.FocusEvent<HTMLButtonElement>) => {
          if (event.currentTarget.matches(':focus-visible')) {
            setFocusedControl('next');
          }
        }}
      >
        {nextButtonLabel || 'Weiter'}
      </button>
    </div>
  );
};