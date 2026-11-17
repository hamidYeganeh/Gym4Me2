import { withI18n } from "@repo/i18n/plugin";

export default withI18n()({
  devIndicators: { position: "top-right" },
  async rewrites() {
    const origin = (process.env.PANEL_OTP_API_ORIGIN ?? "http://127.0.0.1:3003").replace(/\/$/, "");
    return [
      { source: "/api/schedule/:path*", destination: `${origin}/api/v1/admin/schedule/:path*` },
      {
        source: "/api/dashboard/geography",
        destination: `${origin}/api/v1/admin/dashboard/geography`,
      },
      { source: "/api/auth/otp/request", destination: `${origin}/api/v1/admin/auth/otp` },
      { source: "/api/auth/otp/verify", destination: `${origin}/api/v1/admin/auth/otp/confirm` },
      { source: "/api/auth/password/login", destination: `${origin}/api/v1/admin/auth/login` },
      { source: "/api/auth/logout", destination: `${origin}/api/v1/admin/auth/logout` },
      { source: "/api/auth/session", destination: `${origin}/api/v1/admin/auth/session` },
      {
        source: "/api/auth/account/complete",
        destination: `${origin}/api/v1/admin/auth/account/complete`,
      },
      {
        source: "/api/auth/password/reset/request",
        destination: `${origin}/api/v1/admin/auth/password/reset/request`,
      },
      {
        source: "/api/auth/password/reset/confirm",
        destination: `${origin}/api/v1/admin/auth/password/reset/confirm`,
      },
      {
        source: "/api/club-requests/:path*",
        destination: `${origin}/api/v1/admin/club-requests/:path*`,
      },
      {
        source: "/api/coach-requests/:path*",
        destination: `${origin}/api/v1/admin/coach-requests/:path*`,
      },
      { source: "/api/resources/:path*", destination: `${origin}/api/v1/resources/:path*` },
      {
        source: "/api/club-publications/:path*",
        destination: `${origin}/api/v1/admin/club-publications/:path*`,
      },
    ];
  },
  transpilePackages: ["@repo/api", "@repo/theme", "@repo/ui", "@repo/icons", "@repo/i18n"],
});
