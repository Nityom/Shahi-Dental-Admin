import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "@/components/providers/ConvexClientProvider";

export const metadata: Metadata = {
  title: "Shahi Dental Clinic | Svaasth-HMS",
  description: "Shahi Dental Clinic - Powered by Svaasth-HMS Clinic Management System",
  icons: {
    icon: "/Svaasth_favicon.png",
    shortcut: "/Svaasth_favicon.png",
    apple: "/Svaasth_favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/Svaasth_favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700&family=Manrope:wght@400..800&family=Geist+Mono:wght@400..700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function reloadOnChunkError(err) {
                  var message = (err && (err.message || (err.reason && err.reason.message))) || '';
                  var isChunkErr =
                    message.indexOf('ChunkLoadError') !== -1 ||
                    message.indexOf('Loading chunk') !== -1 ||
                    message.indexOf("Unexpected token '<'") !== -1 ||
                    (err && err.name === 'ChunkLoadError');
                  if (isChunkErr) {
                    var lastReload = sessionStorage.getItem('chunk_reload_ts');
                    var now = Date.now();
                    if (!lastReload || now - parseInt(lastReload, 10) > 8000) {
                      sessionStorage.setItem('chunk_reload_ts', String(now));
                      try {
                        var u = new URL(window.location.href);
                        u.searchParams.set('_v', String(now));
                        window.location.replace(u.toString());
                      } catch (_) {
                        window.location.reload();
                      }
                    }
                  }
                }
                window.addEventListener('error', reloadOnChunkError, true);
                window.addEventListener('unhandledrejection', function(e) {
                  reloadOnChunkError(e && e.reason);
                });
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased text-slate-900">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
