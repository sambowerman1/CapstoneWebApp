/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
  async rewrites() {
    const shinyTarget = process.env.SHINY_PROXY_TARGET || "http://127.0.0.1:3838"
    return [
      // Main Shiny mount
      {
        source: "/shiny",
        destination: `${shinyTarget}`,
      },
      {
        source: "/shiny/:path*",
        destination: `${shinyTarget}/:path*`,
      },
      // Shiny absolute asset/session/socket routes
      {
        source: "/shared/:path*",
        destination: `${shinyTarget}/shared/:path*`,
      },
      {
        source: "/session/:path*",
        destination: `${shinyTarget}/session/:path*`,
      },
      {
        source: "/__sockjs__/:path*",
        destination: `${shinyTarget}/__sockjs__/:path*`,
      },
      // Package-scoped Shiny assets are served from root-level versioned prefixes.
      // Match the full prefix segment first, then forward remaining path.
      {
        source:
          "/:asset((?:shiny-css|shiny-javascript|font-awesome|htmltools-fill|jquery|datatables-css|datatables-binding|selectize|bootstrap|crosstalk|AdminLTE|shinydashboard|htmlwidgets)-[^/]+)/:path*",
        destination: `${shinyTarget}/:asset/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
