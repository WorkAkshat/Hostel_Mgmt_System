import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'framer-motion';

const defaultFormat = (n) => Math.round(n).toLocaleString('en-IN');

// Counts up from the previously shown value to `value`.
const AnimatedNumber = ({ value = 0, format = defaultFormat, duration = 0.8, className }) => {
  const ref = useRef(null);
  const fromRef = useRef(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (reduceMotion) {
      node.textContent = format(value);
      fromRef.current = value;
      return;
    }

    const controls = animate(fromRef.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        node.textContent = format(latest);
      },
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [value, format, duration, reduceMotion]);

  return <span ref={ref} className={className}>{format(0)}</span>;
};

export default AnimatedNumber;
