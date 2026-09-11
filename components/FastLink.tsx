'use client';

import Link, { useLinkStatus } from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, type ComponentProps } from 'react';

function NavigationFeedback() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span role="status" className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-black/30"><span className="block h-full w-full animate-pulse bg-[#cbb88a] motion-reduce:animate-none" /><span className="sr-only">Opening page...</span></span>;
}

export default function FastLink({ children, onMouseEnter, onFocus, onTouchStart, ...props }: ComponentProps<typeof Link>) {
  const router = useRouter();
  const lastPrefetch = useRef({ href: '', at: 0 });
  function prepare() {
    if (props.prefetch === false || typeof props.href !== 'string' || !props.href.startsWith('/') || props.href.startsWith('//')) return;
    const target = new URL(props.href, window.location.origin);
    if (target.pathname === window.location.pathname && target.search === window.location.search) return;
    if (lastPrefetch.current.href === target.href && Date.now() - lastPrefetch.current.at < 10000) return;
    lastPrefetch.current = { href: target.href, at: Date.now() };
    router.prefetch(target.pathname + target.search);
  }
  return <Link {...props} onMouseEnter={event => { onMouseEnter?.(event); prepare(); }} onFocus={event => { onFocus?.(event); prepare(); }} onTouchStart={event => { onTouchStart?.(event); prepare(); }}>{children}<NavigationFeedback /></Link>;
}
