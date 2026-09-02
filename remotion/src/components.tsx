import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

export const BRAND = {
  cream: '#F3EBDD',
  ink: '#1D2524',
  teal: '#19A7A1',
  red: '#D94A3D',
  paper: '#FAF5EA',
  muted: '#B7B0A4',
};

export const steppedFrame = (frame: number) => Math.floor(frame / 2) * 2;

export const PaperCard: React.FC<React.PropsWithChildren<{
  rotate?: number;
  style?: React.CSSProperties;
  border?: boolean;
}>> = ({children, rotate = 0, style, border = true}) => (
  <div style={{
    background: BRAND.paper,
    border: border ? `3px solid ${BRAND.ink}` : undefined,
    boxShadow: '0 16px 0 rgba(29,37,36,0.10), 0 28px 48px rgba(29,37,36,0.12)',
    rotate: `${rotate}deg`,
    padding: 42,
    position: 'relative',
    ...style,
  }}>{children}</div>
);

export const InkStamp: React.FC<{
  text: string;
  color?: string;
  delay?: number;
  style?: React.CSSProperties;
}> = ({text, color = BRAND.red, delay = 0, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const f = steppedFrame(Math.max(0, frame - delay));
  const scale = spring({frame: f, fps, config: {damping: 12, stiffness: 210, mass: 0.5}});
  const opacity = interpolate(f, [0, 2, 5], [0, 1, 1], {extrapolateRight: 'clamp'});
  return <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `7px solid ${color}`,
    color,
    fontWeight: 900,
    fontSize: 64,
    letterSpacing: 5,
    lineHeight: 1,
    padding: '20px 28px 16px',
    textTransform: 'uppercase',
    rotate: '-7deg',
    scale,
    opacity,
    boxShadow: `inset 0 0 0 3px ${color}`,
    ...style,
  }}>{text}</div>;
};

export const MarkerUnderline: React.FC<{color?: string; delay?: number; width?: number}> = ({color = BRAND.teal, delay = 0, width = 260}) => {
  const frame = useCurrentFrame();
  const f = steppedFrame(Math.max(0, frame - delay));
  const revealed = interpolate(f, [0, 12], [0, 1], {extrapolateRight: 'clamp'});
  return <div style={{height: 16, width: width * revealed, background: color, rotate: '-2deg', borderRadius: 12, marginTop: 8}} />;
};

const ICONS: Record<string, React.ReactNode> = {
  BUILD: <><rect x="18" y="18" width="54" height="54" rx="8"/><path d="M31 45h28M45 31v28"/></>,
  ANALYSE: <><path d="M18 70V28M18 70h58"/><path d="M28 61l13-15 13 8 18-25"/><circle cx="72" cy="29" r="4"/></>,
  DESIGN: <><path d="M21 64l12-38 39 12-12 38z"/><path d="M33 26l27 50"/></>,
  EXPLAIN: <><path d="M18 27h58v37H43L29 76V64H18z"/><path d="M29 39h36M29 50h27"/></>,
  SELL: <><path d="M20 30h42l14 14-32 32-24-24z"/><circle cx="34" cy="43" r="4"/></>,
  OPERATE: <><circle cx="47" cy="47" r="23"/><path d="M47 14v12M47 68v12M14 47h12M68 47h12M24 24l9 9M61 61l9 9M70 24l-9 9M33 61l-9 9"/></>,
};

export const WorkModeCard: React.FC<{
  label: 'BUILD'|'ANALYSE'|'DESIGN'|'EXPLAIN'|'SELL'|'OPERATE';
  index: number;
  x: number;
  y: number;
  rotate?: number;
  selected?: boolean;
}> = ({label, index, x, y, rotate = 0, selected = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = steppedFrame(Math.max(0, frame - index * 15));
  const enter = spring({frame: local, fps, config: {damping: 16, stiffness: 150}});
  const bump = selected ? 1 + Math.sin(frame / 3) * 0.015 : 1;
  return <div style={{
    position: 'absolute', left: x, top: y, width: 330, height: 210,
    background: selected ? '#E7F6F4' : BRAND.paper,
    border: `3px solid ${selected ? BRAND.teal : BRAND.ink}`,
    boxShadow: '0 12px 0 rgba(29,37,36,0.10)',
    padding: 28,
    rotate: `${rotate}deg`,
    scale: enter * bump,
    opacity: enter,
    transformOrigin: '50% 50%',
  }}>
    <svg width="82" height="82" viewBox="0 0 94 94" fill="none" stroke={selected ? BRAND.teal : BRAND.ink} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">{ICONS[label]}</svg>
    <div style={{fontSize: 38, fontWeight: 900, letterSpacing: 1.5, marginTop: 14}}>{label}</div>
  </div>;
};

export const SceneTransition: React.FC<{children: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const opacity = interpolate(frame, [0, 8, Math.max(9, durationInFrames - 8), durationInFrames - 1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const y = interpolate(steppedFrame(frame), [0, 10], [18, 0], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity, translate: `0 ${y}px`}}>{children}</AbsoluteFill>;
};

export const Caption: React.FC<{text: string; accent?: string}> = ({text, accent}) => (
  <div style={{position: 'absolute', left: 72, right: 72, bottom: 92, display: 'flex', justifyContent: 'center'}}>
    <div style={{background: 'rgba(250,245,234,0.96)', border: `2px solid ${BRAND.ink}`, padding: '20px 28px', fontSize: 38, lineHeight: 1.18, fontWeight: 800, textAlign: 'center', boxShadow: '0 8px 0 rgba(29,37,36,0.08)'}}>
      {accent ? <><span>{text.replace(accent, '')}</span><span style={{color: BRAND.teal}}>{accent}</span></> : text}
    </div>
  </div>
);

export const PaperGrain: React.FC = () => (
  <AbsoluteFill style={{pointerEvents: 'none', opacity: 0.20, mixBlendMode: 'multiply', backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(29,37,36,.12) 0 1px, transparent 1.5px), radial-gradient(circle at 70% 65%, rgba(29,37,36,.08) 0 1px, transparent 1.2px)', backgroundSize: '9px 9px, 13px 13px'}} />
);
