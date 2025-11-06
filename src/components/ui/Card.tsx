import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
}

export default function Card({
  title,
  subtitle,
  headerRight,
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}
      {...rest}
    >
      {(title || headerRight) && (
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            {title && (
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {headerRight}
        </div>
      )}
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}
