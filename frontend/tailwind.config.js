/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        site: {
          bg: "#14120F",       // excavation night — near-black warm charcoal
          surface: "#1E1B17",  // strata panel
          surface2: "#272220",
          line: "#3A332C",     // hairline / soil boundary
          bone: "#EDE6D9",     // primary text — parchment/bone
          muted: "#93897A",    // secondary text
          amber: "#C88A3D",    // unearthed artifact gold (primary accent)
          amberDim: "#8F6329",
          teal: "#4FB3A9",     // active/current signal (secondary accent)
          rust: "#B4483A",     // dead code / debt
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'IBM Plex Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
