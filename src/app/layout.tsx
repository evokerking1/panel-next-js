import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Airlink Panel',
  description: 'Game server management panel',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.fontshare.com" />
        <link
          href="https://api.fontshare.com/v2/css?f[]=general-sans@500,300,600,400,700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var s = localStorage.getItem('theme');
                  if (s === 'dark' || (!s && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="bg-neutral-50 dark:bg-[#141414] h-full text-neutral-800 dark:text-white"
        style={{ fontFamily: "'General Sans', system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  )
}

// ~ https://github.com/thavanish made this shitty code
