import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

/**
 * Custom hand-drawn wax crayon SVG glyphs.
 * Every path is deliberately organic and filtered through #crayon-stroke-tooth
 * so icons feel drawn by the same hand as the 3D sketchbook — zero corporate SaaS icons.
 */

export function CrayonArrowRight({ size = 16, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M4.2 12.6 C8.4 11.9, 13.8 11.7, 19.2 12.1"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M14.1 7.2 C16.2 9.1, 18.1 10.6, 19.8 12.0 C17.7 13.6, 15.8 15.2, 13.8 17.2"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrayonArrowLeft({ size = 16, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M19.8 12.3 C15.6 11.8, 10.2 11.9, 4.8 12.2"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <path
        d="M9.9 7.1 C7.8 9.0, 5.9 10.7, 4.2 12.1 C6.3 13.7, 8.2 15.3, 10.2 17.1"
        stroke="currentColor"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrayonCheck({ size = 16, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M4.5 13.2 C6.9 15.4, 8.6 17.1, 10.1 18.4 C13.1 13.8, 16.4 9.5, 20.1 5.6"
        stroke="currentColor"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrayonPlay({ size = 15, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M6.8 5.3 C6.5 9.8, 6.7 14.3, 7.1 18.7 C11.4 16.4, 15.6 14.1, 19.3 11.8 C15.4 9.5, 11.2 7.2, 6.8 5.3 Z"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity="0.24"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrayonPause({ size = 15, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M8.6 5.5 C8.2 10.1, 8.5 14.5, 8.8 18.6"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <path
        d="M15.4 5.8 C15.8 10.2, 15.3 14.6, 15.1 18.4"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CrayonMoon({ size = 17, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M18.8 14.9 C16.7 18.5, 11.8 19.9, 8.1 17.6 C4.6 15.5, 3.8 10.5, 6.2 7.1 C7.8 4.9, 10.4 4.1, 12.7 4.4 C10.4 7.3, 10.6 11.8, 13.4 13.9 C15.1 15.1, 17.1 15.3, 18.8 14.9 Z"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity="0.18"
        strokeWidth="2.0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrayonSun({ size = 17, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M12.2 7.6 C14.9 7.5, 16.7 9.6, 16.5 12.2 C16.3 14.9, 14.2 16.6, 11.7 16.4 C9.1 16.2, 7.4 14.1, 7.6 11.6 C7.8 9.2, 9.7 7.7, 12.2 7.6 Z"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity="0.22"
        strokeWidth="2.0"
      />
      <path
        d="M12 2.8 L12.2 5.0 M12 19.1 L11.8 21.3 M2.9 12.1 L5.1 11.9 M18.9 12.2 L21.2 12.0 M5.6 5.7 L7.2 7.2 M16.8 16.9 L18.4 18.5 M18.3 5.6 L16.8 7.3 M7.2 16.8 L5.5 18.4"
        stroke="currentColor"
        strokeWidth="2.0"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CrayonClose({ size = 18, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M6.2 6.4 C10.1 10.3, 14.0 14.1, 17.9 17.8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M17.8 6.1 C14.1 10.1, 10.1 13.9, 6.1 18.0"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CrayonReset({ size = 16, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M5.6 10.2 C6.5 6.4, 10.2 4.5, 14.0 5.3 C17.9 6.1, 19.8 9.8, 18.9 13.7 C18.0 17.5, 14.2 19.6, 10.3 18.7 C8.2 18.2, 6.6 16.9, 5.7 15.1"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M4.6 6.2 L5.4 10.4 L9.6 9.6"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrayonStar({ size = 15, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M12.1 3.8 L14.4 9.1 L20.1 9.6 L15.7 13.4 L17.1 19.1 L12.0 16.0 L6.9 19.0 L8.3 13.4 L4.0 9.5 L9.7 9.0 Z"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity="0.22"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CrayonChevron({
  direction = 'down',
  size = 15,
  className = '',
  ...rest
}: IconProps & { direction?: 'up' | 'down' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      {direction === 'down' ? (
        <path
          d="M5.6 9.2 C8.1 11.7, 10.2 13.9, 12.1 15.6 C14.1 13.7, 16.2 11.4, 18.5 9.1"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M5.6 15.2 C8.1 12.7, 10.2 10.5, 12.1 8.8 C14.1 10.7, 16.2 13.0, 18.5 15.3"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

export function CrayonLeaf({ size = 16, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M5.4 18.8 C5.2 11.4, 10.2 5.4, 19.2 4.8 C19.0 13.4, 14.0 18.8, 5.4 18.8 Z"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity="0.20"
        strokeWidth="2.0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.8 19.4 C8.2 16.1, 11.8 12.6, 15.6 8.9"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CrayonNote({ size = 16, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M5.2 18.2 C7.8 13.4, 11.6 9.8, 17.6 7.4"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path
        d="M13.5 6.0 L18.1 7.2 L16.2 11.6"
        stroke="currentColor"
        strokeWidth="2.0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="5.2"
        cy="18.2"
        r="2.1"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity="0.28"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function CrayonSoundOn({ size = 16, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M4.6 9.6 L8.6 9.4 L13.4 5.8 C13.6 10.0, 13.5 14.1, 13.3 18.2 L8.5 14.7 L4.6 14.5 Z"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity="0.20"
        strokeWidth="2.0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.4 9.2 C17.9 10.7, 17.9 13.3, 16.4 14.8"
        stroke="currentColor"
        strokeWidth="2.0"
        strokeLinecap="round"
      />
      <path
        d="M19.1 6.8 C21.4 9.5, 21.4 14.5, 19.1 17.2"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CrayonSoundOff({ size = 16, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M4.6 9.6 L8.6 9.4 L13.4 5.8 C13.6 10.0, 13.5 14.1, 13.3 18.2 L8.5 14.7 L4.6 14.5 Z"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity="0.12"
        strokeWidth="2.0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.4 9.1 L20.8 14.7 M20.7 9.0 L16.3 14.8"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CrayonLayers({ size = 16, className = '', ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`inline-block shrink-0 crayon-stroke-svg ${className}`}
      {...rest}
    >
      <path
        d="M12.1 4.2 L20.1 8.1 L11.9 11.9 L3.9 8.0 Z"
        stroke="currentColor"
        fill="currentColor"
        fillOpacity="0.18"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.3 12.6 L11.9 16.2 L19.8 12.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 16.9 L12.0 20.4 L19.6 16.8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
