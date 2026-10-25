const props = [
  {
    id: "dumbbell",
    x: -215,
    y: -190,
    z: 60,
    size: 152,
    rot: -12,
    iconUrl: "/download/gym-3d/dumbbell.png",
    layer: 2,
  },
  {
    id: "bottle",
    x: 225,
    y: -210,
    z: 80,
    size: 152,
    rot: 12,
    iconUrl: "/download/gym-3d/bottle.png",
    layer: 3,
  },
  {
    id: "kettlebell",
    x: 235,
    y: 175,
    z: 60,
    size: 148,
    rot: -10,
    iconUrl: "/download/gym-3d/kettlebell.png",
    layer: 2,
  },
] as const;

export const downloadScenes = [
  {
    id: "discover",
    props,
    peek: {
      x: -90,
      y: 285,
      z: 100,
      width: 232,
      rot: -3,
      reviewerPhotoId: "1680022150842-00dca46d25e7",
      stars: 5,
    },
  },
  {
    id: "class",
    props,
    peek: {
      x: -80,
      y: 285,
      z: 100,
      width: 232,
      rot: 3,
      reviewerPhotoId: "1594318223885-20dc4b889f9e",
      stars: 5,
    },
  },
  {
    id: "schedule",
    props,
    peek: {
      x: -90,
      y: 285,
      z: 100,
      width: 232,
      rot: -2,
      reviewerPhotoId: "1595085610896-fb31cfd5d4b7",
      stars: 5,
    },
  },
] as const;

export const downloadAvatars = [
  "1768762471508-3929166dc34e",
  "1619539465730-fea9ebf950f8",
  "1724435811349-32d27f4d5806",
  "1586297135537-94bc9ba060aa",
  "1669475535925-a011d7c31d45",
] as const;
