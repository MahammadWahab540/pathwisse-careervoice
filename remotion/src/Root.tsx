import React from 'react';
import {Composition} from 'remotion';
import {CareerVoiceDegreeIsNotVerdict, defaultCareerVoiceDegreeProps} from './CareerVoiceDegreeIsNotVerdict';

const studioDefaultProps = {
  ...defaultCareerVoiceDegreeProps,
  audio: {
    ...defaultCareerVoiceDegreeProps.audio,
    narration: null,
    music: null,
    stampSfx: null,
  },
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="CareerVoiceDegreeIsNotVerdict"
      component={CareerVoiceDegreeIsNotVerdict}
      durationInFrames={1440}
      fps={24}
      width={1080}
      height={1920}
      defaultProps={studioDefaultProps}
    />
  </>
);
