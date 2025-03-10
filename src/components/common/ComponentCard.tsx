import React from "react";

interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string; // Additional custom classes for styling
  desc?: React.ReactNode; // Description text
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc,
}) => {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      {/* Card Header */}
      <div className="px-6 py-2 flex items-center justify-between">
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
          {title}
        </h3>
        {!!desc && (
          <div className="mt-1">
            {desc}
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};

export default ComponentCard;
