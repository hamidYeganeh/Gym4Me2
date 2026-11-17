import Image from "next/image";
import { useState } from "react";

import cover from "./artwork/club-cover.jpg";
import { clubClasses } from "./club-classes";

export function imageUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") return url.href;
  } catch {
    // The default artwork or initials are used when a URL is unavailable.
  }
  return undefined;
}

export const ClubCover = (props: { url: string }) => {
  const { url } = props;
  const [failedUrl, setFailedUrl] = useState<string>();
  const image = imageUrl(url);
  return (
    <div className={clubClasses.cover}>
      <Image
        src={image && image !== failedUrl ? image : cover}
        onError={() => setFailedUrl(image)}
        alt=""
        fill
        unoptimized
        sizes="(min-width: 1120px) 1080px, 100vw"
      />
    </div>
  );
};

export const ClubLogo = (props: { name: string; url: string }) => {
  const { name, url } = props;
  const image = imageUrl(url);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("");
  return (
    <span className={clubClasses.logo} aria-hidden>
      {initials || "G"}
      {image && (
        <Image
          key={image}
          src={image}
          alt=""
          fill
          unoptimized
          sizes="104px"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      )}
    </span>
  );
};
