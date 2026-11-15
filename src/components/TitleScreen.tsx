import { GemIcon } from "./GemIcon";

const HOUSES = ["white", "blue", "green", "red", "black"] as const;

export function TitleScreen({ onStart }: { onStart: () => void }) {
  return (
    <button type="button" className="title-screen" onClick={onStart}>
      <span className="title-frame">
        <span className="title-kicker">A royal audience</span>
        <svg className="title-crown" viewBox="0 0 160 72" aria-hidden="true">
          <polygon points="8,64 24,20 48,48 80,8 112,48 136,20 152,64" fill="#c9a227" />
          <polygon points="20,64 32,28 48,50 80,16 112,50 128,28 140,64" fill="#f3dd8a" />
          <rect x="6" y="60" width="148" height="10" rx="2" fill="#8a5a12" />
          <rect x="10" y="62" width="140" height="4" fill="#f3dd8a" opacity="0.55" />
        </svg>
        <span className="title-houses" aria-hidden="true">
          {HOUSES.map((color) => (
            <GemIcon key={color} color={color} size={36} />
          ))}
        </span>
        <h1>The Court of Stones</h1>
        <span className="title-cta">Tap to start</span>
      </span>
    </button>
  );
}
