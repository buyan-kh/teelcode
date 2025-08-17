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
      className={`absolute top-1/2 left-1/2 rounded-xl border border-white bg-black [transform-style:preserve-3d] [will-change:transform] [backface-visibility:hidden] ${
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
  const refs = useMemo(
    () => childArr.map(() => React.createRef<HTMLDivElement>()),
    [childArr.length]
  );

  const order = useRef(Array.from({ length: childArr.length }, (_, i) => i));
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const intervalRef = useRef<number | undefined>(undefined);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const total = refs.length;

    // Initialize card positions
    refs.forEach((r, i) => {
      if (r.current) {
        const slot = {
          x: i * cardDistance,
          y: -i * verticalDistance,
          z: -i * cardDistance * 1.5,
          zIndex: total - i,
        };

        gsap.set(r.current, {
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

    // Animation function
    const swap = () => {
      if (order.current.length < 2) return;

      const [front, ...rest] = order.current;
      const elFront = refs[front].current;
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
        const el = refs[idx].current;
        if (!el) return;

        const slot = {
          x: i * cardDistance,
          y: -i * verticalDistance,
          z: -i * cardDistance * 1.5,
          zIndex: refs.length - i,
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
        x: (refs.length - 1) * cardDistance,
        y: -(refs.length - 1) * verticalDistance,
        z: -(refs.length - 1) * cardDistance * 1.5,
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

    // Start animation
    swap();
    intervalRef.current = window.setInterval(swap, delay);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cardDistance, verticalDistance, delay, skewAmount, refs]);

  const rendered = childArr.map((child, i) =>
    isValidElement(child)
      ? cloneElement(child, {
          key: i,
          ref: refs[i],
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
      style={{ width, height }}
    >
      {rendered}
    </div>
  );
};

export default CardSwap;
