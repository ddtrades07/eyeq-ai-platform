import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { SCENES, sceneFrames, TOTAL_FRAMES } from './constants';
import {
  SceneHero,
  ScenePlatform,
  SceneClinical,
  SceneImaging,
  SceneRxOptical,
  SceneAI,
  ScenePortal,
  SceneBusiness,
  SceneSafety,
  SceneCTA,
} from './scenes/Scenes';

const SCENE_COMPONENTS = [
  SceneHero,
  ScenePlatform,
  SceneClinical,
  SceneImaging,
  SceneRxOptical,
  SceneAI,
  ScenePortal,
  SceneBusiness,
  SceneSafety,
  SceneCTA,
] as const;

export const TRANSITION_FRAMES = 10;

const FadeIn: React.FC<{ children: React.ReactNode; frames: number }> = ({
  children,
  frames,
}) => {
  const frame = useCurrentFrame();
  const opacity =
    frames <= 0
      ? 1
      : interpolate(frame, [0, frames], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/**
 * EyeQDemo — full product tour with product images + AI voiceover.
 */
export const EyeQDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#E8F1F8' }}>
      {SCENES.map((scene, i) => {
        const base = sceneFrames(scene);
        const isFirst = i === 0;
        const isLast = i === SCENES.length - 1;
        const from = isFirst ? base.from : base.from - TRANSITION_FRAMES;
        const duration =
          base.duration + (isFirst || isLast ? TRANSITION_FRAMES : TRANSITION_FRAMES * 2);
        const safeFrom = Math.max(0, from);
        const safeDuration = Math.min(duration, TOTAL_FRAMES - safeFrom);
        const Comp = SCENE_COMPONENTS[i];
        return (
          <React.Fragment key={scene.id}>
            <Sequence from={safeFrom} durationInFrames={safeDuration}>
              <FadeIn frames={isFirst ? 0 : TRANSITION_FRAMES}>
                <Comp />
              </FadeIn>
            </Sequence>
            {/* Voiceover aligned to scene start (no crossfade overlap). */}
            <Sequence from={base.from} durationInFrames={base.duration}>
              <Audio src={staticFile(`voiceover/${scene.id}.mp3`)} />
            </Sequence>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
