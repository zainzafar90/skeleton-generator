import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

interface OverlayStyle {
  left: string;
  top: string;
  width: string;
  height: string;
}

const SkeletonGenerator: React.FC = () => {
  const [hoverElement, setHoverElement] = useState<Element | null>(null);
  const [overlayStyle, setOverlayStyle] = useState<OverlayStyle>({
    left: "0px",
    top: "0px",
    width: "0px",
    height: "0px",
  });
  const [copiedCode, setCopiedCode] = useState<string>("");

  const updateOverlay = useCallback((element: Element | null) => {
    if (!element) return;
    const rect = element.getBoundingClientRect();

    // Constrain overlay to the viewport width and height using Tailwind utilities
    const constrainedLeft = Math.max(0, rect.left + window.scrollX);
    const constrainedTop = Math.max(0, rect.top + window.scrollY);
    const constrainedWidth = Math.min(
      window.innerWidth - constrainedLeft,
      rect.width
    );
    const constrainedHeight = Math.min(
      window.innerHeight - constrainedTop,
      rect.height
    );

    setOverlayStyle({
      left: `${constrainedLeft}px`,
      top: `${constrainedTop}px`,
      width: `${constrainedWidth}px`,
      height: `${constrainedHeight}px`,
    });
  }, []);

  const detectLayout = (element: Element | null): string => {
    if (!element) return "column";
    const computedStyle = getComputedStyle(element);
    const flexDirection = computedStyle.getPropertyValue("flex-direction");
    const display = computedStyle.getPropertyValue("display");

    if (display === "flex" && flexDirection === "row") {
      return "row";
    }

    const gridTemplateColumns = computedStyle.getPropertyValue(
      "grid-template-columns"
    );
    if (gridTemplateColumns && gridTemplateColumns !== "none") {
      return "row";
    }

    return "column";
  };

  const breakDownLargeElement = (height: number): string => {
    const smallHeight = Math.min(height / 4, 300); // Break down into smaller parts
    const numOfDivs = Math.ceil(height / smallHeight);

    return Array(numOfDivs)
      .fill("")
      .map(
        () =>
          `<div class="relative bg-gray-200 rounded animate-pulse w-full h-[${smallHeight}px] my-2"></div>`
      )
      .join("\n");
  };

  const generateSkeletonCode = useCallback(
    (element: Element | null, depth = 0): string => {
      if (!element || depth > 1) return ""; // Stop at 3 levels deep

      const tagName = element.tagName.toLowerCase();
      const rect = element.getBoundingClientRect();

      // Determine the layout of the element (row or column)
      const layout = detectLayout(element);
      let widthClass = "w-full";

      if (layout === "row") {
        widthClass = "w-1/2"; // Less width for row items
      }

      if (tagName.startsWith("h")) {
        widthClass = "w-1/2"; // Less width for headings
      } else if (tagName === "span") {
        widthClass = "w-1/3"; // Even less width for spans
      }

      // If the height is too large, break it down into smaller elements
      if (rect.height > 800) {
        return `<div class="flex ${
          layout === "row" ? "flex-row" : "flex-col"
        } ${widthClass} h-auto">
          ${breakDownLargeElement(rect.height)}
        </div>`;
      }

      // Get the direct children of the element
      const children = Array.from(element.children);

      // Generate skeleton code for children, only go one level deeper if not already deep
      const childrenSkeletons = children
        .map((child) => {
          const childRect = child.getBoundingClientRect();
          let childWidthClass = widthClass;

          // Adjust the width for child elements as well
          const childTagName = child.tagName.toLowerCase();
          if (childTagName.startsWith("h")) {
            childWidthClass = "w-1/2";
          } else if (childTagName === "p") {
            childWidthClass = "w-full";
          } else if (childTagName === "span") {
            childWidthClass = "w-1/3";
          }

          // Generate child skeleton and one level deeper (grandchildren)
          const grandchildrenSkeletons = generateSkeletonCode(child, depth + 1);

          return `<div class="relative bg-gray-200 rounded animate-pulse ${childWidthClass} h-[${childRect.height}px] mb-2">
  ${grandchildrenSkeletons}
</div>`;
        })
        .join("\n");

      return `<div class="flex ${
        layout === "row" ? "flex-row" : "flex-col"
      } ${widthClass} h-[${rect.height}px]">
  ${childrenSkeletons}
</div>`;
    },
    [detectLayout]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setHoverElement(e.target as Element);
      updateOverlay(e.target as Element);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "s" && hoverElement) {
        const skeletonCode = generateSkeletonCode(hoverElement);
        navigator.clipboard
          .writeText(skeletonCode)
          .then(() => {
            setCopiedCode(skeletonCode);
            setTimeout(() => setCopiedCode(""), 2000);
          })
          .catch((err) => {
            console.error("Failed to copy: ", err);
          });
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hoverElement, updateOverlay, generateSkeletonCode]);

  return (
    <>
      <div
        className="fixed pointer-events-none z-[9999] border-2 border-blue-500 bg-blue-100 bg-opacity-10"
        style={overlayStyle}
      />
      <div className="fixed bottom-4 left-4 text-sm sm:text-base md:text-lg text-black bg-amber-400 z-[9999] p-2 rounded shadow">
        {copiedCode
          ? "v1.10 Skeleton code copied!"
          : 'v1.10 Hover and press "s" to copy skeleton'}
      </div>
    </>
  );
};

const div = document.createElement("div");
div.id = "__root";
document.body.appendChild(div);

const rootContainer = document.querySelector("#__root");
if (!rootContainer) throw new Error("Can't find Content root element");
const root = createRoot(rootContainer);
root.render(<SkeletonGenerator />);

try {
  console.log("Relative Positioning Skeleton Generator content script loaded");
} catch (e) {
  console.error(e);
}
