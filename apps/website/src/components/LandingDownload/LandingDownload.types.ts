export interface LandingDownloadProps {
  id?: string;
  className?: string;
  appStoreHref?: string;
  googlePlayHref?: string;
  autoPlay?: boolean;
}

export interface PhoneMeasurements {
  width: number;
  height: number;
  radius: number;
  front: number;
}
