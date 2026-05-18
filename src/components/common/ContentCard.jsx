import React from "react";

export default function ContentCard({
  children,
  className = "",
  padding = "default",
  as: Tag = "div",
  ...rest
}) {
  const paddings = {
    none: "",
    sm: "p-4 sm:p-5 lg:p-6 2xl:p-8",
    default: "p-6 sm:p-7 lg:p-8 2xl:p-10",
    lg: "p-8 sm:p-10 lg:p-12 2xl:p-16",
  };
  const padCls = paddings[padding] ?? paddings.default;

  return (
    <Tag
      className={`bg-white dark:bg-[#151822] border border-gray-200 dark:border-[#1f2833] rounded-2xl 2xl:rounded-3xl shadow-md 2xl:shadow-xl ${padCls} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
