import React, { useEffect, useState, useRef } from 'react';

const AnimatedNumber = ({ value, className = '', duration = 500 }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      setIsAnimating(true);
      
      // Animate the number change
      const startValue = prevValueRef.current;
      const endValue = value;
      const startTime = Date.now();
      
      const animate = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuad = progress * (2 - progress);
        const currentValue = Math.round(startValue + (endValue - startValue) * easeOutQuad);
        
        setDisplayValue(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          prevValueRef.current = value;
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [value, duration]);

  return (
    <span 
      className={`${className} ${isAnimating ? 'animate-pulse-soft' : ''}`}
      style={{
        display: 'inline-block',
        transition: 'transform 0.3s ease-out',
        transform: isAnimating ? 'scale(1.05)' : 'scale(1)'
      }}
    >
      {displayValue}
    </span>
  );
};

export default AnimatedNumber;

