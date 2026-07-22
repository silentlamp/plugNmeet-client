import React from 'react';

type ZenBlockLoaderProps = {
  size?: number;
  compact?: boolean;
  className?: string;
  label?: string;
};

/**
 * Horizontal square-block wave loader shared with mobile + admin.
 * Navy / green blocks instead of concentric rings or a circular spinner.
 */
export function ZenBlockLoader({
  size = 40,
  compact = false,
  className = '',
  label = 'Loading',
}: ZenBlockLoaderProps) {
  const count = compact ? 3 : 4;
  const classes = ['zen-block-loader', compact ? 'is-compact' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      role="status"
      aria-label={label}
      className={classes}
      style={{ height: size, fontSize: size }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className="zen-block-dot"
          style={{ animationDelay: `${index * 0.12}s` }}
          aria-hidden
        />
      ))}
    </span>
  );
}

/** @deprecated Prefer ZenBlockLoader. */
export const ZenBreathingLoader = ZenBlockLoader;

export default ZenBlockLoader;
