export {};

declare global {
  interface Window {
    heavyWaterDesktop?: {
      isDesktop: boolean;
      platform: NodeJS.Platform;
    };
  }
}
