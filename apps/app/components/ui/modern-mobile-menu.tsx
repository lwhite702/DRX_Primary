import React, { useState, useEffect, useMemo } from "react";
import { Home, Briefcase, Calendar, Settings } from "lucide-react";

type IconComponentType = React.ElementType<{ className?: string }>;

export interface InteractiveMenuItem {
  label: string;
  icon: IconComponentType;
  href?: string;
}

export interface CenterAction {
  icon: IconComponentType;
  label?: string;
}

export interface InteractiveMenuProps {
  items?: InteractiveMenuItem[];
  centerAction?: CenterAction;
  onCenterClick?: () => void;
  onItemClick?: (index: number, item: InteractiveMenuItem) => void;
  accentColor?: string;
}

const defaultItems: InteractiveMenuItem[] = [
  { label: "Home", icon: Home },
  { label: "Search", icon: Briefcase },
  { label: "Cart", icon: Calendar },
  { label: "Profile", icon: Settings },
];

const defaultAccentColor = "var(--component-active-color-default)";

const InteractiveMenu: React.FC<InteractiveMenuProps> = ({
  items,
  centerAction,
  onCenterClick,
  onItemClick,
  accentColor,
}) => {
  const finalItems = useMemo(() => {
    const isValid = items && Array.isArray(items) && items.length === 4;
    if (!isValid) {
      console.warn(
        "InteractiveMenu: 'items' prop must contain exactly 4 items. Using default items.",
        items,
      );
      return defaultItems;
    }
    return items;
  }, [items]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= finalItems.length) {
      setActiveIndex(0);
    }
  }, [finalItems, activeIndex]);

  const handleItemClick = (index: number) => {
    setActiveIndex(index);
    if (onItemClick) {
      onItemClick(index, finalItems[index]);
    }
  };

  const handleCenterClick = () => {
    if (onCenterClick) {
      onCenterClick();
    }
  };

  const navStyle = useMemo(() => {
    const activeColor = accentColor || defaultAccentColor;
    return { "--component-active-color": activeColor } as React.CSSProperties;
  }, [accentColor]);

  // Split items into left (0-1) and right (2-3)
  const leftItems = finalItems.slice(0, 2);
  const rightItems = finalItems.slice(2, 4);

  const CenterIcon = centerAction?.icon || Home;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="relative mx-auto max-w-md px-4 pb-6">
        {/* Center FAB */}
        <button
          onClick={handleCenterClick}
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-10
                     w-16 h-16 rounded-full
                     bg-gradient-to-br from-[#6366f1] to-[#4f46e5]
                     shadow-lg shadow-[#6366f1]/50
                     flex items-center justify-center
                     transition-all duration-150 ease-out
                     hover:scale-105 active:scale-95
                     focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:ring-offset-2 focus:ring-offset-background"
          aria-label={centerAction?.label || "Main action"}
        >
          <CenterIcon className="w-6 h-6 text-white" />
        </button>

        {/* Navigation Bar */}
        <nav
          className="relative rounded-full
                     bg-black/80 dark:bg-black/90
                     backdrop-blur-xl
                     border border-white/10
                     shadow-xl
                     px-4 py-3
                     flex items-center justify-between"
          style={navStyle}
          role="navigation"
        >
          {/* Left Items */}
          <div className="flex items-center gap-2 flex-1 justify-around">
            {leftItems.map((item, index) => {
              const isActive = index === activeIndex;
              const IconComponent = item.icon;

              return (
                <button
                  key={item.label}
                  onClick={() => handleItemClick(index)}
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg
                           transition-all duration-150 ease-out
                           hover:bg-white/5 active:scale-95
                           focus:outline-none focus:ring-2 focus:ring-accent/50"
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <IconComponent
                    className={`w-6 h-6 transition-colors duration-150 ${
                      isActive ? "text-accent" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium transition-colors duration-150 ${
                      isActive ? "text-accent" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Spacer for center FAB */}
          <div className="w-16" />

          {/* Right Items */}
          <div className="flex items-center gap-2 flex-1 justify-around">
            {rightItems.map((item, index) => {
              const actualIndex = index + 2; // Offset by 2 for right items
              const isActive = actualIndex === activeIndex;
              const IconComponent = item.icon;

              return (
                <button
                  key={item.label}
                  onClick={() => handleItemClick(actualIndex)}
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg
                           transition-all duration-150 ease-out
                           hover:bg-white/5 active:scale-95
                           focus:outline-none focus:ring-2 focus:ring-accent/50"
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  <IconComponent
                    className={`w-6 h-6 transition-colors duration-150 ${
                      isActive ? "text-accent" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-xs font-medium transition-colors duration-150 ${
                      isActive ? "text-accent" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};

export { InteractiveMenu };
