import { useEffect, useRef, useState } from 'react';
import { RoughNotation } from 'react-rough-notation';

type AnnoType = 'underline' | 'box' | 'circle' | 'highlight' | 'strike-through' | 'bracket';

interface Props {
  children: React.ReactNode;
  type?: AnnoType;
  color?: string;
  /** which CSS token to pull the color from when `color` is not given */
  token?: '--accent' | '--accent2' | '--hot' | '--ink';
}

/**
 * Hand-drawn annotation that draws itself in when scrolled into view.
 * Usage in MDX:  <Annotate client:visible type="circle">KV cache</Annotate>
 */
export default function Annotate({ children, type = 'underline', color, token = '--accent' }: Props) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [show, setShow] = useState(false);
  const [resolved, setResolved] = useState(color ?? '#1664c0');

  useEffect(() => {
    if (!color) {
      const v = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
      if (v) setResolved(v);
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShow(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [color, token]);

  return (
    <span ref={ref} style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>
      <RoughNotation
        type={type}
        show={show}
        color={resolved}
        animationDuration={700}
        strokeWidth={type === 'underline' ? 3 : 2.3}
        iterations={2}
        padding={type === 'circle' ? 6 : 2}
      >
        {children}
      </RoughNotation>
    </span>
  );
}
