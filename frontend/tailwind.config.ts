import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070b12", panel: "#0d1420", line: "#1c2940",
        red: { team: "#ff4d6d" }, blue: { team: "#4da3ff" }, ok: "#22e6a8", warn: "#ffb020",
      },
      fontFamily: { mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"] },
    },
  },
  plugins: [],
};
export default config;
