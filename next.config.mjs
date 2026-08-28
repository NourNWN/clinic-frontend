import createNextIntlPlugin from "next-intl/plugin";

// Path given explicitly so the plugin resolves the JavaScript request file
// instead of looking for the TypeScript default.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.js");

const nextConfig = {
  /* config options here */
};

export default withNextIntl(nextConfig);
