import { Button } from "@repo/ui/kit/Button";
import type { VariantProps } from "class-variance-authority";
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react";
import type * as React from "react";
import type { carouselVariants } from "./Carousel.styles";
export type CarouselApi = UseEmblaCarouselType[1];

export type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;

export type CarouselOptions = UseCarouselParameters[0];

export type CarouselPlugin = UseCarouselParameters[1];

export type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

export type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProps;

export type CarouselRootProps = React.ComponentProps<"div"> & CarouselProps;

export type CarouselContentProps = React.ComponentProps<"div">;

export type CarouselItemProps = React.ComponentProps<"div">;

export type CarouselPreviousProps = React.ComponentProps<typeof Button>;

export type CarouselNextProps = React.ComponentProps<typeof Button>;

export type CarouselVariants = VariantProps<typeof carouselVariants>;
