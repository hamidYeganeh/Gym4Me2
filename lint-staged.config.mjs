export default {
  "**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}": [
    "eslint --fix --max-warnings 0 --no-warn-ignored",
    "prettier --write",
  ],
  "**/*.{json,css,md,yaml,yml}": "prettier --write --ignore-unknown",
};
