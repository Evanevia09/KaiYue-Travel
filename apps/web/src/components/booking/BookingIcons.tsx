import type { ReactNode } from "react";

type IconName =
  | "car"
  | "clock"
  | "pin"
  | "calendar"
  | "plus"
  | "chevronLeft"
  | "chevronRight"
  | "chevronDown"
  | "chevronUp"
  | "close"
  | "arrow";

type Props = {
  name: IconName;
  size?: number;
};

function IconSvg({
  size,
  children,
}: {
  size: number;
  children: ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function BookingIcon({ name, size = 18 }: Props) {
  if (name === "car") {
    return (
      <IconSvg size={size}>
        <path d="M5 13h14l-1.2-4.2A2 2 0 0 0 15.9 7H8.1a2 2 0 0 0-1.9 1.8L5 13Z" />
        <path d="M5 13v4h14v-4" />
        <path d="M7 17v1" />
        <path d="M17 17v1" />
        <circle cx="7.5" cy="13.5" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="16.5" cy="13.5" r="0.6" fill="currentColor" stroke="none" />
      </IconSvg>
    );
  }
  if (name === "clock") {
    return (
      <IconSvg size={size}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </IconSvg>
    );
  }
  if (name === "pin") {
    return (
      <IconSvg size={size}>
        <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </IconSvg>
    );
  }
  if (name === "calendar") {
    return (
      <IconSvg size={size}>
        <path d="M7 4v3" />
        <path d="M17 4v3" />
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M4 10h16" />
      </IconSvg>
    );
  }
  if (name === "chevronLeft") {
    return (
      <IconSvg size={size}>
        <path d="M15 6 9 12l6 6" />
      </IconSvg>
    );
  }
  if (name === "chevronRight") {
    return (
      <IconSvg size={size}>
        <path d="m9 6 6 6-6 6" />
      </IconSvg>
    );
  }
  if (name === "chevronDown") {
    return (
      <IconSvg size={size}>
        <path d="m6 9 6 6 6-6" />
      </IconSvg>
    );
  }
  if (name === "chevronUp") {
    return (
      <IconSvg size={size}>
        <path d="m6 15 6-6 6 6" />
      </IconSvg>
    );
  }
  if (name === "close") {
    return (
      <IconSvg size={size}>
        <path d="M7 7l10 10" />
        <path d="M17 7 7 17" />
      </IconSvg>
    );
  }
  if (name === "arrow") {
    return (
      <IconSvg size={size}>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </IconSvg>
    );
  }
  return (
    <IconSvg size={size}>
      <path d="M12 6v12" />
      <path d="M6 12h12" />
    </IconSvg>
  );
}
