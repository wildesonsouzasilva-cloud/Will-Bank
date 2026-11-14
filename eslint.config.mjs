import firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

export default [
  {
    ignores: [".next/*", ".next-dev/*", "node_modules/*", "dist/*"],
  },
  {
    rules: {
      "no-unused-vars": "off",
      "prefer-const": "warn",
    },
  },
  firebaseRulesPlugin.configs["flat/recommended"],
];

