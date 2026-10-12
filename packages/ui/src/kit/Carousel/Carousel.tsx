"use client";
import { carouselStyles } from "./Carousel.styles";
import type {
  CarouselApi,
  CarouselContentProps,
  CarouselContextProps,
  CarouselItemProps,
  CarouselNextProps,
  CarouselPreviousProps,
  CarouselRootProps,
} from "./Carousel.types";

import { cn } from "@repo/ui/lib/utils";
import useEmblaCarousel from "embla-carousel-react";
import * as React from "react";

import { Button } from "@repo/ui/kit/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

const CarouselContext = React.createContext<CarouselContextProps | null>(null);

function useCarousel() {
  const context = React.useContext(CarouselContext);

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />");
  }

  return context;
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}: CarouselRootProps) {
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
    },
    plugins,
  );
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);

  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = React.useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (opts?.direction === "rtl") scrollNext();
        else scrollPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        if (opts?.direction === "rtl") scrollPrev();
        else scrollNext();
      }
    },
    [scrollPrev, scrollNext, opts?.direction],
  );

  React.useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);

  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on("reInit", onSelect);
    api.on("select", onSelect);

    return () => {
      api?.off("select", onSelect);
    };
  }, [api, onSelect]);

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api: api,
        opts,
        orientation:
          orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        className={cn(carouselStyles.carousel(), className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}

function CarouselContent({ className, ...props }: CarouselContentProps) {
  const { carouselRef, orientation } = useCarousel();

  return (
    <div
      ref={carouselRef}
      className={carouselStyles.carouselContent()}
      data-slot="carousel-content"
    >
      <div
        className={cn(
          carouselStyles.carouselContent2(),
          orientation === carouselStyles.carouselContent3()
            ? carouselStyles.carouselContent4()
            : carouselStyles.carouselContent5(),
          className,
        )}
        {...props}
      />
    </div>
  );
}

function CarouselItem({ className, ...props }: CarouselItemProps) {
  const { orientation } = useCarousel();

  return (
    <div
      role="group"
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        carouselStyles.carouselItem(),
        orientation === carouselStyles.carouselItem2()
          ? carouselStyles.carouselItem3()
          : carouselStyles.carouselItem4(),
        className,
      )}
      {...props}
    />
  );
}

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon-sm",
  ...props
}: CarouselPreviousProps) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel();

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      className={cn(
        carouselStyles.carouselPrevious(),
        orientation === carouselStyles.carouselPrevious2()
          ? carouselStyles.carouselPrevious3()
          : carouselStyles.carouselPrevious4(),
        className,
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ChevronLeftIcon className={carouselStyles.carouselPrevious5()} />
      <span className={carouselStyles.carouselPrevious6()}>Previous slide</span>
    </Button>
  );
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon-sm",
  ...props
}: CarouselNextProps) {
  const { orientation, scrollNext, canScrollNext } = useCarousel();

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      className={cn(
        carouselStyles.carouselNext(),
        orientation === carouselStyles.carouselNext2()
          ? carouselStyles.carouselNext3()
          : carouselStyles.carouselNext4(),
        className,
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ChevronRightIcon className={carouselStyles.carouselNext5()} />
      <span className={carouselStyles.carouselNext6()}>Next slide</span>
    </Button>
  );
}

export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
};
