import React from "react";

const SIZE_MAP = {
  sm: "max-w-2xl 2xl:max-w-3xl",
  md: "max-w-3xl 2xl:max-w-5xl",
  lg: "max-w-5xl 2xl:max-w-6xl",
  xl: "max-w-7xl 2xl:max-w-[1600px]",
  full: "max-w-full",
};

export default function ResponsiveContainer({
  children,
  size = "lg",
  padded = true,
  className = "",
  as: Tag = "div",
}) {
  const max = SIZE_MAP[size] ?? SIZE_MAP.lg;
  const padding = padded ? "px-4 sm:px-6 lg:px-8 2xl:px-12" : "";
  return (
    <Tag className={`w-full mx-auto ${max} ${padding} ${className}`}>
      {children}
    </Tag>
  );
}
