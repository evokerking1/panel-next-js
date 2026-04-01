export {};

declare global {
  interface Window {
    toggleTheme: () => void;
    getTheme: () => 'dark' | 'light';
    airlinkAnimate: (el: Element, opts?: { duration?: number; delay?: number }) => void;
    airlinkAnimateChildren: (container: Element, opts?: { baseDelay?: number; stagger?: number; duration?: number }) => void;
  }
}
