import Image from "next/image";

export type PromoScene = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  theme: "sky" | "ink" | "foam";
  image?: string;
};

type PromoHomeProps = {
  scenes: PromoScene[];
  onAsk: () => void;
};

const sceneNames = ["intro", "practice", "community"] as const;

export default function PromoHome({ scenes, onAsk }: PromoHomeProps) {
  return (
    <section id="top" className="promo-home">
      <div className="promo-story-thread" aria-hidden="true" />
      {scenes.map((scene, index) => {
        const sceneName = sceneNames[index] || "chapter";
        return (
          <article
            key={scene.id}
            id={index === 1 ? "promo-practice" : undefined}
            className={`promo-story-scene promo-story-${sceneName} ${scene.theme} ${scene.image ? "has-photo" : ""}`}
          >
            <div className="promo-story-media" aria-hidden="true">
              {scene.image && (
                <Image
                  src={scene.image}
                  alt=""
                  fill
                  sizes="100vw"
                  priority={index === 0}
                  unoptimized
                />
              )}
              <span className="promo-story-photo-wash" />
            </div>
            <div className="promo-story-symbol" aria-hidden="true">
              <span />
            </div>
            <div className="promo-story-content">
              <p className="promo-story-eyebrow">{scene.eyebrow}</p>
              <h1>
                {scene.title.split("\n").map((line, lineIndex) => (
                  <span key={`${scene.id}-${lineIndex}`}>{line}</span>
                ))}
              </h1>
              <div className="promo-story-copy">
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <p>{scene.body}</p>
              </div>
              {index === 0 && (
                <a className="promo-scroll-cue" href="#promo-practice">
                  <span>SCROLL</span>
                  <i aria-hidden="true" />
                </a>
              )}
            </div>
          </article>
        );
      })}
      <article className="promo-story-cta">
        <div className="promo-cta-target" aria-hidden="true">
          <span />
        </div>
        <div className="promo-cta-content">
          <p>SIMKOONG ARCHERY CLUB</p>
          <h2>
            우리의 다음 화살은
            <br />
            당신과 함께.
          </h2>
          <button onClick={onAsk}>
            <span>궁금한 점 물어보기</span>
            <i aria-hidden="true">→</i>
          </button>
        </div>
      </article>
    </section>
  );
}
