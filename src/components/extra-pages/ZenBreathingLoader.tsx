import React from 'react';

type ZenBreathingLoaderProps = {
  size?: number;
  compact?: boolean;
  className?: string;
  label?: string;
};

/**
 * Zen breathing-ripple loader shared with mobile + admin.
 * Soft concentric rings (navy / green) instead of a mechanical spinner.
 */
export function ZenBreathingLoader({
  size = 48,
  compact = false,
  className = '',
  label = 'Loading',
}: ZenBreathingLoaderProps) {
  const ringCount = compact ? 2 : 3;
  const classes = [
    'zen-breathing-loader',
    compact ? 'is-compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      role="status"
      aria-label={label}
      className={classes}
      style={{ width: size, height: size }}
    >
      <span className="zen-breathing-core" aria-hidden />
      {Array.from({ length: ringCount }).map((_, index) => (
        <span
          key={index}
          className="zen-breathing-ring"
          style={{ animationDelay: `${(-index * 0.8).toFixed(1)}s` }}
          aria-hidden
        />
      ))}
    </span>
  );
}

export default ZenBreathingLoader;
