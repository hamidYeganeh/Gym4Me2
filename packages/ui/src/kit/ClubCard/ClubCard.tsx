import type { ClubCardProps } from "./ClubCard.types";
import type { FC } from "react";

import { ArrowUpRight } from "@repo/icons/arrow-up-right";
import { MapPin1 } from "@repo/icons/map-pin-1";
import { StarFull } from "@repo/icons/star-full";

import Badge from "../Badge";
import Card, { CardContent, CardDescription, CardHeader, CardTitle } from "../Card";
import { clubCardVariants } from "./ClubCard.styles";

const ClubCard: FC<ClubCardProps> = (props) => {
  const {
    variant,
    orientation = variant ?? "vertical",
    name,
    href,
    image,
    price,
    address,
    rating,
    amenities,
    className,
    ...rest
  } = props;
  const styles = clubCardVariants({ orientation });
  const horizontal = orientation === "horizontal";
  const priceBadge = price && (
    <Badge color="neutral" size="sm" className={styles.price()}>
      {price}
    </Badge>
  );
  const ratingLabel = rating && (
    <div className={styles.rating()}>
      <StarFull className={styles.star()} />
      <span>{rating.value}</span>
      {rating.reviewCount && <span className={styles.reviewCount()}>({rating.reviewCount})</span>}
    </div>
  );

  return (
    <Card
      {...rest}
      data-orientation={orientation}
      variant="elevated"
      radius="3xl"
      className={styles.root({ className })}
    >
      {image && (
        <>
          <img
            className={styles.image()}
            src={image.src}
            alt={image.alt}
            loading="lazy"
            decoding="async"
          />
          <div className={styles.scrim()} aria-hidden="true" />
        </>
      )}
      {href && horizontal && (
        <span className={styles.arrow()} aria-hidden="true" dir="ltr">
          <ArrowUpRight />
        </span>
      )}
      {!horizontal && priceBadge}
      <CardHeader className={styles.header()}>
        {horizontal && ratingLabel}
        <div className={styles.heading()}>
          <CardTitle className={styles.title()}>
            {href ?
              <a className={styles.link()} href={href}>
                {name}
              </a>
            : name}
          </CardTitle>
          {horizontal ? priceBadge : ratingLabel}
        </div>
        {address && (
          <CardDescription className={styles.address()}>
            {!horizontal && <MapPin1 />}
            <span>{address}</span>
          </CardDescription>
        )}
      </CardHeader>
      {!!amenities?.length && (
        <CardContent>
          <ul role="list" className={styles.amenities()}>
            {amenities.map((amenity, index) => (
              <li key={`${amenity}-${index}`}>{amenity}</li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
};

export default ClubCard;
