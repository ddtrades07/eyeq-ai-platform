import React from 'react';
import { Composition } from 'remotion';
import { EyeQDemo } from './EyeQDemo';
import { FPS, TOTAL_FRAMES, WIDTH, HEIGHT } from './constants';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="EyeQDemo"
        component={EyeQDemo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{}}
      />
    </>
  );
};
