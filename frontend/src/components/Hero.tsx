interface HeroProps {
  onCreatePaste: () => void;
}

function Hero({ onCreatePaste }: HeroProps) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div>
        <p className="eyebrow">PasteText</p>
        <h1 id="hero-title">Share code and text snippets instantly</h1>
        <p className="hero-copy">
          Create a paste, share a short URL, and keep controls close to the content.
        </p>
      </div>

      <div className="hero-actions">
        <button className="primary-button" type="button" onClick={onCreatePaste}>
          Create Paste
        </button>
        <div className="hero-meta" aria-label="Core workflow">
          <span>Create</span>
          <span>Share</span>
          <span>Manage access</span>
        </div>
      </div>
    </section>
  );
}

export default Hero;
