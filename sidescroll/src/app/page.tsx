import styles from "./page.module.css";
import { SideScroll } from "./components/Sidescroll/Sidescroll";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.itemContainer}>
        <h3 id="accessible-sidescroll">Accessible Sidescroll</h3>
        <SideScroll
          labelledBy="accessible-sidescroll"
          asLandmark
          prevButtonLabel="Zurück"
          nextButtonLabel="Weiter"
        >
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className={styles.testSlide}>
              Slide {i + 1}
            </div>
          ))}
        </SideScroll>
      </div>
      <div className={styles.itemContainer}>
        <h3 id="accessible-sidescroll-with-focusable-children">
          Accessible Sidescroll with focusable children
        </h3>
        <SideScroll
          labelledBy="accessible-sidescroll-with-focusable-children"
          asLandmark
          prevButtonLabel="Zurück"
          nextButtonLabel="Weiter"
        >
          {Array.from({ length: 15 }, (_, i) => (
            <div key={i} className={styles.testSlide}>
              <a href="#">Slide {i + 1}</a>
            </div>
          ))}
        </SideScroll>
      </div>
    </main>
  );
}