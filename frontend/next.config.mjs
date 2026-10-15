/** Proxy /gw/* to the Python gateway so the browser never deals with CORS or ports. */
const GATEWAY = process.env.GATEWAY_URL || "http://localhost:8000";
export default {
  reactStrictMode: true,
  async rewrites() { return [{ source: "/gw/:path*", destination: `${GATEWAY}/:path*` }]; },
};
