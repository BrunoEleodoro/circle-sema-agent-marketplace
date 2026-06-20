import { Composition } from "remotion";
import { MarketplaceVideo, VIDEO_DURATION_IN_FRAMES, VIDEO_FPS } from "./MarketplaceVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="CircleSemaMarketplace"
      component={MarketplaceVideo}
      durationInFrames={VIDEO_DURATION_IN_FRAMES}
      fps={VIDEO_FPS}
      width={1920}
      height={1080}
    />
  );
};
