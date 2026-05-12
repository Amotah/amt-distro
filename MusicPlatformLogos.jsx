import React from "react";

const PLATFORM_LOGOS = {
  spotify: { label: "Spotify", accent: "#1DB954", monogram: "S" },
  apple: { label: "Apple Music", accent: "#FA243C", monogram: "A" },
  audiomack: { label: "Audiomack", accent: "#FFA200", monogram: "A" },
  boomplay: { label: "Boomplay", accent: "#FF8A00", monogram: "B" },
  youtube: { label: "YouTube", accent: "#FF0000", monogram: "Y" },
  youtubemusic: { label: "YouTube Music", accent: "#FF0000", monogram: "Y" },
  deezer: { label: "Deezer", accent: "#A238FF", monogram: "D" },
  tidal: { label: "TIDAL", accent: "#FFFFFF", monogram: "T" },
  amazonmusic: { label: "Amazon Music", accent: "#00A8E1", monogram: "A" },
  soundcloud: { label: "SoundCloud", accent: "#FF5500", monogram: "S" },
  pandora: { label: "Pandora", accent: "#3668FF", monogram: "P" },
  napster: { label: "Napster", accent: "#7C3AED", monogram: "N" },
  anghami: { label: "Anghami", accent: "#A855F7", monogram: "A" },
};

// Reusable Logo Component
const Logo = ({ name, size = 40 }) => {
  const platform = PLATFORM_LOGOS[name.toLowerCase()];

  if (!platform) {
    return (
      <div style={{ color: "#fff", fontSize: 12 }}>
        Unknown: {name}
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `${platform.accent}18`,
        border: `1px solid ${platform.accent}55`,
        color: platform.accent,
        fontWeight: 900,
        fontSize: Math.max(12, Math.round(size * 0.36)),
      }}
    >
      {platform.monogram}
    </div>
  );
};

// Main Component (grid display)
const MusicPlatformLogos = ({ platforms = Object.keys(PLATFORM_LOGOS) }) => {
  return (
    <div style={styles.container}>
      {platforms.map((platform) => (
        <div key={platform} style={styles.item}>
          <Logo name={platform} size={50} />
          <span style={styles.label}>{PLATFORM_LOGOS[platform]?.label || platform}</span>
        </div>
      ))}
    </div>
  );
};

// Simple styling
const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
    gap: "20px",
    alignItems: "center",
  },
  item: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
  },
  label: {
    fontSize: "12px",
    color: "#fff",
  },
};

export default MusicPlatformLogos;