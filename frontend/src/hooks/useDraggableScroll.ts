import { useRef } from 'react';

export function useDraggableScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const isDragging = useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!ref.current) return;
    isDown.current = true;
    isDragging.current = false;
    ref.current.style.cursor = 'grabbing';
    ref.current.style.userSelect = 'none';
    ref.current.style.scrollSnapType = 'none'; // disable snap during drag
    startX.current = e.pageX - ref.current.offsetLeft;
    scrollLeft.current = ref.current.scrollLeft;
  };

  const onMouseLeave = () => {
    isDown.current = false;
    isDragging.current = false;
    if (ref.current) {
      ref.current.style.cursor = 'grab';
      ref.current.style.userSelect = 'auto';
      ref.current.style.scrollSnapType = 'x mandatory'; // re-enable snap
    }
  };

  const onMouseUp = () => {
    isDown.current = false;
    if (ref.current) {
      ref.current.style.cursor = 'grab';
      ref.current.style.userSelect = 'auto';
      ref.current.style.scrollSnapType = 'x mandatory'; // re-enable snap
    }
    // Delay resetting isDragging so click handlers can check it
    setTimeout(() => {
      isDragging.current = false;
    }, 50);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    if (Math.abs(walk) > 5) {
      isDragging.current = true;
    }
    ref.current.scrollLeft = scrollLeft.current - walk;
  };

  return { ref, onMouseDown, onMouseLeave, onMouseUp, onMouseMove, isDragging, className: "cursor-grab snap-x snap-mandatory" };
}
