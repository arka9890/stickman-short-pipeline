import React from 'react';
import { Composition } from 'remotion';
import { Scene } from './Scene';
import timeline from './timeline.json';

// Project name pattern: PascalCase of the video title.
// Copy root.tsx layout: one Composition, id must match what you pass to
// `npx remotion render <id>` (SKILL.md Phase 4).
export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Scene"
      component={Scene}
      durationInFrames={Math.round(timeline.durationSec * timeline.fps)}
      fps={timeline.fps}
      width={timeline.width}
      height={timeline.height}
      defaultProps={{
        timeline,
      }}
    />
  );
};
