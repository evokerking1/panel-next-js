'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PageLoader({ title }: { title: string }) {
  const pathname = usePathname();

  useEffect(() => {
    const overlay = document.getElementById('pl-overlay') as HTMLElement | null;
    const bar = document.getElementById('pl-bar') as HTMLElement | null;
    const msg = document.getElementById('pl-msg') as HTMLElement | null;

    if (!overlay) return;

    let progress = 0;
    overlay.style.display = 'flex';

    const tick = setInterval(() => {
      progress = Math.min(progress + Math.random() * 15, 85);
      if (bar) bar.style.width = `${progress}%`;
    }, 120);

    const finish = () => {
      clearInterval(tick);
      if (bar) bar.style.width = '100%';
      setTimeout(() => {
        overlay.style.display = 'none';
        if (bar) bar.style.width = '0%';
        document.documentElement.classList.remove('js-loading');
      }, 300);
    };

    // Finish on next paint after route is settled
    const raf = requestAnimationFrame(() => setTimeout(finish, 200));

    return () => {
      clearInterval(tick);
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  return (
    <div
      id="pl-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99998,
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'all',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <img
          src="/assets/logo.png"
          alt=""
          style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 10 }}
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
        <p
          id="pl-title"
          style={{
            margin: 0,
            marginTop: -4,
            fontFamily: "'General Sans', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: '-0.015em',
          }}
        >
          {title}
        </p>
        <div
          id="pl-track"
          style={{ width: 128, height: 1.5, borderRadius: 2, overflow: 'hidden', background: 'rgba(0,0,0,0.12)' }}
        >
          <div
            id="pl-bar"
            style={{
              height: '100%',
              width: '0%',
              borderRadius: 2,
              background: '#171717',
              transition: 'width 260ms cubic-bezier(0.4,0,0.2,1)',
            }}
          />
        </div>
        <p
          id="pl-msg"
          style={{
            margin: 0,
            marginTop: -4,
            fontFamily: "'General Sans', sans-serif",
            fontSize: 11,
            color: '#737373',
            letterSpacing: '0.01em',
          }}
        >
          Loading...
        </p>
      </div>
    </div>
  );
}
