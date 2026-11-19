import { useEffect } from 'react';
export function useRemote() {
  useEffect(() => {
    // Put the focus ring on the first app straight away so the remote works from the first press.
    const t = setTimeout(() => {
      if (!document.activeElement || document.activeElement === document.body)
        document.querySelector<HTMLElement>('.app-launch')?.focus({ preventScroll: true });
    }, 800);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const current = document.activeElement as HTMLElement;
      const scope = document.querySelector('dialog[open]') || document;
      const elements = Array.from(
        scope.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select, a[href], summary'
        )
      ).filter(
        e =>
          e.getClientRects().length > 0 && !e.closest('[inert]') && !e.hasAttribute('data-nav-skip')
      );
      if (event.keyCode === 10009) {
        event.preventDefault();
        document.querySelector<HTMLDialogElement>('dialog[open]')?.close();
        return;
      }
      if (!event.key.startsWith('Arrow')) return;
      // Left/right edit values; up/down can leave form controls using a TV remote.
      if (current?.matches('textarea')) return;
      if (
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
        current?.matches('select, input:not([type="checkbox"]):not([type="color"])')
      )
        return;
      event.preventDefault();
      if (!elements.includes(current)) {
        // Start on the first app rather than the sidebar so one press gets you moving.
        (elements.find(e => e.matches('.app-launch')) ?? elements[0])?.focus();
        return;
      }
      const rect = current.getBoundingClientRect(),
        x = rect.x + rect.width / 2,
        y = rect.y + rect.height / 2;
      const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
      const sign = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
      let best: HTMLElement | undefined,
        score = Infinity;
      for (const el of elements) {
        if (el === current) continue;
        const r = el.getBoundingClientRect(),
          dx = r.x + r.width / 2 - x,
          dy = r.y + r.height / 2 - y;
        const along = (horizontal ? dx : dy) * sign;
        if (along <= 4) continue;
        // Items that overlap this one side to side (or top to bottom) are in the same row/column.
        const overlap = horizontal
          ? Math.min(r.bottom, rect.bottom) - Math.max(r.top, rect.top)
          : Math.min(r.right, rect.right) - Math.max(r.left, rect.left);
        const across = overlap > 8 ? 0 : Math.abs(horizontal ? dy : dx);
        const next = along + across * 2.5;
        if (next < score) {
          score = next;
          best = el;
        }
      }
      if (best) {
        best.focus({ preventScroll: true });
        best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
      } else if (!horizontal) {
        // Nothing focusable further that way: scroll the page so the rest is visible.
        window.scrollBy({ top: sign * 420, behavior: 'smooth' });
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);
}
