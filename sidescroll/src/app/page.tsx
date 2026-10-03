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
    </main>
  );
}