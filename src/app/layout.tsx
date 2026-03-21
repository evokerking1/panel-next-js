import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AirLink',
  description: 'Game server management panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full js-loading" suppressHydrationWarning>
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
  var d=false;
  try{var s=localStorage.getItem('theme');if(s==='dark')d=true;else if(!s)d=window.matchMedia('(prefers-color-scheme: dark)').matches;}catch(e){}
  if(d)document.documentElement.classList.add('dark');
})();
`,
          }}
        />
      </head>
      <body
        style={{ fontFamily: "'General Sans', sans-serif" }}
        className="bg-neutral-50 dark:bg-[#141414] h-full text-neutral-800 dark:text-white"
      >
        {children}
      </body>
    </html>
  );
}
