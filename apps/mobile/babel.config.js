module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // En production : retirer les console.log (sauf warn/error)
      process.env.NODE_ENV === "production"
        ? ["transform-remove-console", { exclude: ["error", "warn"] }]
        : null,
    ].filter(Boolean),
  };
};
