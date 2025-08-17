import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
} from "react";
import gsap from "gsap";

interface CardProps {
  customClass?: string;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ customClass, children, ...rest }, ref) => (
    <div
      ref={ref}
      {...rest}
      className={`absolute top-1/2 left-1/2 rounded-xl border-[5px] border-black bg-black [transform-style:preserve-3d] [will-change:transform] [backface-visibility:hidden] shadow-[inset_0_0_30px_rgba(59,130,246,0.8),inset_0_0_60px_rgba(59,130,246,0.4)] ${
        customClass ?? ""
      } ${rest.className ?? ""}`.trim()}
    >
      {children}
    </div>
  )
);
Card.displayName = "Card";

interface CardSwapProps {
  width?: number;
  height?: number;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
  onCardClick?: (index: number) => void;
  skewAmount?: number;
  easing?: string;
  children: React.ReactNode;
}

const CardSwap: React.FC<CardSwapProps> = ({
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  onCardClick,
  skewAmount = 6,
  children,
}) => {
  const childArr = useMemo(() => Children.toArray(children), [children]);
  const refs = useRef<HTMLDivElement[]>([]);

  const order = useRef(Array.from({ length: childArr.length }, (_, i) => i));
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const intervalRef = useRef<number | undefined>(undefined);
  const container = useRef<HTMLDivElement>(null);

  // Initialize refs array if needed
  useEffect(() => {
    if (refs.current.length !== childArr.length) {
      refs.current = childArr.map((_, i) => refs.current[i] || null);
    }
  }, [childArr.length]);

  useEffect(() => {
    const total = childArr.length;

    const initPositions = () => {
      // Initialize card positions
      refs.current.forEach((el, i) => {
        if (el) {
          const slot = {
            x: i * cardDistance,
            y: -i * verticalDistance,
            z: -i * cardDistance * 1.5,
            zIndex: total - i,
          };

          gsap.set(el, {
            x: slot.x,
            y: slot.y,
            z: slot.z,
            xPercent: -50,
            yPercent: -50,
            skewY: skewAmount,
            transformOrigin: "center center",
            zIndex: slot.zIndex,
            force3D: true,
          });
        }
      });
    };

    // Animation function
    const swap = () => {
      if (order.current.length < 2) return;

      // Kill any ongoing animation
      tlRef.current?.kill();

      const [front, ...rest] = order.current;
      const elFront = refs.current[front];
      if (!elFront) return;

      const tl = gsap.timeline();
      tlRef.current = tl;

      // Drop front card
      tl.to(elFront, {
        y: "+=500",
        duration: 0.8,
        ease: "power1.inOut",
      });

      // Move other cards forward
      rest.forEach((idx, i) => {
        const el = refs.current[idx];
        if (!el) return;

        const slot = {
          x: i * cardDistance,
          y: -i * verticalDistance,
          z: -i * cardDistance * 1.5,
          zIndex: refs.current.length - i,
        };

        tl.set(el, { zIndex: slot.zIndex }, "-=0.4");
        tl.to(
          el,
          {
            x: slot.x,
            y: slot.y,
            z: slot.z,
            duration: 0.8,
            ease: "power1.inOut",
          },
          "-=0.4"
        );
      });

      // Return front card to back
      const backSlot = {
        x: (refs.current.length - 1) * cardDistance,
        y: -(refs.current.length - 1) * verticalDistance,
        z: -(refs.current.length - 1) * cardDistance * 1.5,
        zIndex: 1,
      };

      tl.set(elFront, { zIndex: backSlot.zIndex }, "-=0.2");
      tl.set(elFront, { x: backSlot.x, z: backSlot.z }, "-=0.2");
      tl.to(
        elFront,
        {
          y: backSlot.y,
          duration: 0.8,
          ease: "power1.inOut",
        },
        "-=0.2"
      );

      // Update order
      order.current = [...rest, front];
    };

    // Wait for next frame to ensure DOM is ready
    const frameId = requestAnimationFrame(() => {
      initPositions();
      swap();
      intervalRef.current = window.setInterval(swap, delay);
    });

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      tlRef.current?.kill();
      cancelAnimationFrame(frameId);
    };
  }, [childArr.length, cardDistance, verticalDistance, delay, skewAmount]);

  const rendered = childArr.map((child, i) =>
    isValidElement(child)
      ? cloneElement(child, {
          key: i,
          ref: (el: HTMLDivElement) => (refs.current[i] = el),
          style: { width, height, ...((child as any).props.style ?? {}) },
          onClick: (e: React.MouseEvent) => {
            if ((child as any).props.onClick) {
              (child as any).props.onClick(e);
            }
            onCardClick?.(i);
          },
        } as any)
      : child
  );

  return (
    <div
      ref={container}
      className="relative perspective-[900px] overflow-visible max-[768px]:scale-[0.75] max-[480px]:scale-[0.55]"
      style={{
        width,
        height,
        filter: "drop-shadow(0 0 20px rgba(255,255,255,0.5))",
      }}
    >
      {rendered}
    </div>
  );
};

export default CardSwap;
