import ss1 from "../../assets/ss1.png";
import ss2 from "../../assets/ss2.png";
import ss3 from "../../assets/ss3.png";

const SHOTS = [
  { src: ss1, alt: "SongSphere popup controlling Spotify" },
  { src: ss2, alt: "SongSphere popup with multiple sessions" },
  { src: ss3, alt: "SongSphere popup on YouTube Music" },
] as const;

export function GallerySection() {
  return (
    <section id="gallery" className="mb-20 scroll-mt-8">
      <h2 className="mb-2 text-2xl font-bold tracking-[-0.02em]">Gallery</h2>
      <p className="mb-8 max-w-2xl text-sm text-[var(--text-secondary)]">
        SongSphere in the wild, one popup for every player tab you have open.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHOTS.map(({ src, alt }) => (
          <figure
            key={alt}
            className="landing-card overflow-hidden rounded-2xl transition hover:border-white/10"
          >
            <img
              src={src}
              alt={alt}
              loading="lazy"
              className="h-auto w-full object-cover object-top"
            />
          </figure>
        ))}
      </div>
    </section>
  );
}
