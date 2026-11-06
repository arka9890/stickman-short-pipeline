import React from 'react';
import { AbsoluteFill, Img, staticFile, Audio } from 'remotion';
import timeline from './timeline.json';

// Minimal starter scene: title card + per-scene images + segment VO audio, built
// from scripts/make-timeline.mjs output (timeline.json). Replace/augment freely,
// but keep durationInFrames = Math.round(durationSec * fps) logic in Root.tsx
// (Remotion throws on a float).

type Shot = {
  img: string;
  audio: string;
  from: number;
  dur: number;
};

export const Scene: React.FC<{ timeline: typeof timeline }> = ({ timeline }) => {
  const shots: Shot[] = timestampShots(timeline);
  return (
    <AbsoluteFill style={{ backgroundColor: '#15100A' }}>
      {shots.map((s, i) => (
        <SequenceShot key={i} shot={s} fps={timeline.fps} />
      ))}
    </AbsoluteFill>
  );
};

// Generic timeline shape produced by make-timeline.mjs — adjust field names to
// whatever your make-timeline version emits.
function timestampShots(t: typeof timeline): Shot[] {
  const segs: any[] = (t as any).segments ?? (t as any).scenes ?? [];
  const out: Shot[] = [];
  let t0 = 0;
  for (const seg of segs) {
    const dur = Number(seg.durationSec ?? seg.dur ?? 8);
    for (const half of ['a', 'b']) {
      const img = seg[`img_${half}`] ?? seg[`img${half}`];
      if (img) {
        out.push({ img, audio: seg.audio ?? seg.vo, from: t0, dur: dur / 2 });
      }
    }
    t0 += dur;
  }
  return out;
}

const SequenceShot: React.FC<{ shot: Shot; fps: number }> = ({ shot, fps }) => (
  <AbsoluteFill
    style={{
      opacity: 0,
      animation: 'none',
      transform: `translateY(${0}px)`,
    }}
  >
    <Img src={staticFile(shot.img)} />
    {shot.audio ? <Audio src={staticFile(shot.audio)} /> : null}
  </AbsoluteFill>
);
