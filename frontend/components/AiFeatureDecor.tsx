/**
 * Shared “new AI feature” visuals: sparkle + NEW pill (used on Summarize + Enhance).
 */
export default function AiFeatureDecor() {
  return (
    <span className="li-ai-feature-btn__lead" aria-hidden>
      <svg className="li-ai-sparkle" viewBox="0 0 24 24" width={22} height={22} aria-hidden focusable="false">
        <path
          fill="currentColor"
          d="M12 2l1.4 5.2L18.5 9 13.4 10.8 12 16l-1.4-5.2L5.5 9l5.1-1.8L12 2zm7 11l.9 2.9 2.9.9-2.9.9-.9 2.9-.9-2.9-2.9-.9 2.9-.9.9-2.9z"
        />
      </svg>
      <span className="li-ai-new-pill">
        <span className="li-ai-new-pill__glyph" aria-hidden>
          ✦
        </span>
        NEW
      </span>
    </span>
  );
}
