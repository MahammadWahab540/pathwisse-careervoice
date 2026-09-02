# CareerVoiceDegreeIsNotVerdict

Production-oriented 60-second vertical editorial paper-collage explainer for CareerVoice.

## Composition

- ID: `CareerVoiceDegreeIsNotVerdict`
- Size: `1080x1920`
- FPS: `24`
- Duration: `1440` frames / `60s`
- Entry: `src/index.ts`

## Install and review

```bash
cd remotion
npm install
npm run typecheck
npm run build
npm run dev
```

`npm run dev` starts Remotion Studio without opening a browser. Open the local Studio URL it prints, then select `CareerVoiceDegreeIsNotVerdict`.

## Exact render command

Do not render before creative review. Once approved:

```bash
npx remotion render src/index.ts CareerVoiceDegreeIsNotVerdict out/CareerVoiceDegreeIsNotVerdict.mp4 --codec=h264
```

## Optional assets

The composition is designed to work with CSS/HTML graphics when visual assets are not supplied. Optional asset props accept paths relative to `public/`.

Suggested files:

```text
public/assets/careervoice-student-cutout.png
public/assets/careervoice-logo.png
public/audio/careervoice-degree-narration.mp3
public/audio/careervoice-paper-bed.mp3
public/audio/paper-stamp.wav
```

If adding audio, set the corresponding `audio` paths in `defaultCareerVoiceDegreeProps` or pass them as composition props. Keep music around `0.08` beneath narration.

## Creative review checklist

1. Scene 1: confession-card scale, serif italic tone, and SAFE stamp impact.
2. Scene 3 to 4: whether the oversized CSE label feels oppressive enough before collapsing into a small context tag.
3. Scene 7 to 8: pacing of the six work-mode reveals and whether the repeated-choice pattern reads instantly on mute.

## Motion notes

The composition remains 24fps, while tactile graphic movement is stepped by quantizing selected animation frames to 2-frame increments, creating a restrained 12fps editorial feel without lowering final playback fps.
