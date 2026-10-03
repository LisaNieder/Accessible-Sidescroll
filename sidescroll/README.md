# SideScroll

An accessible, dependency-free horizontal scroller (carousel) component for **React** and **Next.js**, written in TypeScript.

It uses native scrolling and CSS scroll snapping instead of transforms, so touch, trackpad and keyboard behavior stays what users expect. Accessibility is handled in the component: off-screen slides are removed from the tab order and the accessibility tree, and focus never gets stuck on an invisible slide.


## Live demo: 
https://accessible-sidescroll-arswcuw3y-lisa-500a.vercel.app/

## Features

- **Native scrolling** with CSS scroll snapping, no JavaScript animation
- **Previous / next buttons** that hide automatically at the start and end
- **Visibility tracking** via `IntersectionObserver`, re-measured on `scrollend` and on resize
- **Off-screen slides are `inert`**, so they cannot be reached by keyboard or screen readers
- **Smart focus handling**
  - Focus moves to the nearest visible slide if the focused slide scrolls out of view
  - Mouse clicks on the buttons move focus into the new slide set, keyboard users keep focus on the button
  - Slides are focusable only when they need to be (configurable)
- **Adaptive semantics:** exposed as a carousel only when it actually scrolls, otherwise as a plain list
- **Respects `prefers-reduced-motion`**
- No runtime dependencies besides React

## Requirements

- React 19 (or React 18 with a type workaround for the `inert` prop, see [Notes](#notes))
- A bundler/framework that supports CSS Modules, e.g. Next.js
- The component uses hooks, so in the Next.js App Router it must be rendered in a Client Component (the file already contains `'use client'`)


## Usage

```tsx
import { SideScroll } from './components/SideScroll';

export default function Example() {
  return (
    <>
      <h2 id="products-heading">Products</h2>
      <SideScroll
        labelledBy="products-heading"
        asLandmark
        prevButtonLabel="Previous"
        nextButtonLabel="Next"
      >
        {products.map((product) => (
          <article key={product.id} className="card">
            <h3>{product.name}</h3>
            <a href={product.href}>Details</a>
          </article>
        ))}
      </SideScroll>
    </>
  );
}
```

Every direct child becomes one slide. Give your slides a fixed or intrinsic width in your own CSS. The component does not size them.

> **Note:** All children must be valid React elements. If you pass plain strings or numbers as children, the component renders nothing.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `ReactElement[]` | – | The slides. Each child is wrapped in one slide container. |
| `label` | `string` | – | Accessible name for the carousel (`aria-label`). |
| `labelledBy` | `string` | – | ID of an element that names the carousel (`aria-labelledby`). Takes precedence over `label`. |
| `asLandmark` | `boolean` | `false` | Use `role="region"` instead of `role="group"`. Only use it for important content, since too many landmarks add noise for screen reader users. |
| `prevButtonLabel` | `string` | `'Zurück'` | Text of the previous button. Also used as its `aria-label` when set. |
| `nextButtonLabel` | `string` | `'Weiter'` | Text of the next button. Also used as its `aria-label` when set. |
| `slidesFocusable` | `'auto' \| 'always' \| 'never'` | `'auto'` | Controls whether the slide containers themselves are in the tab order. See below. |

### `slidesFocusable`

| Value | Behavior |
| --- | --- |
| `'auto'` | A slide is focusable (`tabIndex=0`) only if it contains no focusable child. Slides with links or buttons are skipped (`tabIndex=-1`), so the interactive element receives focus instead. |
| `'always'` | Every slide is focusable. |
| `'never'` | No slide is focusable. |

Focusable slides make it possible to reach non-interactive content with the keyboard, which is useful for sighted keyboard users who need to scroll the carousel without using the buttons.

## Accessibility

| Situation | Behavior |
| --- | --- |
| All slides fit on screen | Rendered as `list` / `listitem`, buttons are hidden |
| Not all slides fit and the component has a `label` or `labelledBy` | Rendered as a carousel: `aria-roledescription="Karussell"`, each slide is a `group` named "*n* von *total*" |
| Slide scrolls out of view | Slide becomes `inert` |
| Focused slide scrolls out of view | Focus moves to the nearest visible slide |
| Button activated with mouse/touch | Focus moves to the first/last visible slide after scrolling |
| Button activated with keyboard | Focus stays on the button, which stays visible even at the end of the track |

Screen reader testing: <!-- e.g. VoiceOver + Safari, NVDA + Firefox, TalkBack. Fill in what you actually tested. -->

## Browser support

The component relies on modern platform features:

| Feature | Used for |
| --- | --- |
| [`inert`](https://developer.mozilla.org/docs/Web/API/HTMLElement/inert) | Hiding off-screen slides |
| [`scrollend`](https://developer.mozilla.org/docs/Web/API/Element/scrollend_event) | Re-measuring after scrolling (falls back to a debounced `scroll` listener) |
| `:focus-visible` | Distinguishing keyboard from mouse interaction |
| CSS nesting | Stylesheet |
| `IntersectionObserver`, `ResizeObserver` | Visibility tracking |

Current evergreen browsers are supported. Check your own target list against the table above.

## Notes

- **`inert` typing:** `inert` as a boolean prop requires `@types/react@19`. On React 18 you will get a type error.
- **Texts are currently German** (`Karussell`, `Folie`, `Vorherige Folie`, `Nächste Folie`, `… von …`). Button texts can be changed via props, the remaining strings are hard-coded.
- **Keys:** Slides are keyed by index. This is fine for static lists, but can cause unnecessary remounts if you reorder or insert slides.
