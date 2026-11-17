"use client";

import Image from "next/image";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import weights from "./artwork/free-weights.webp";
import floor from "./artwork/gym-floor.webp";
import training from "./artwork/strength-training.webp";
import { authClasses } from "./auth-classes";

const slides = [floor, training, weights];

export const AuthCarousel = () => (
  <div className={authClasses.gallery} dir="ltr" aria-hidden="true">
    <Swiper
      className={authClasses.carousel}
      modules={[Autoplay, Pagination]}
      loop
      pagination
      autoplay={{ delay: 5000, disableOnInteraction: false }}
      onSwiper={(swiper) => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) swiper.autoplay.stop();
      }}
    >
      {slides.map((slide) => (
        <SwiperSlide key={slide.src}>
          <Image
            src={slide}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 1px"
            className={authClasses.artwork}
            draggable={false}
          />
        </SwiperSlide>
      ))}
    </Swiper>
  </div>
);
