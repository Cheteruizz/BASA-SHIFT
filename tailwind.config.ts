import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        electric: "#006BFF",
        cyanx: "#00D4FF",
        deep: "#071B2F",
        ink: "#020B18",
        snow: "#F4F8FF"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(7, 27, 47, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
