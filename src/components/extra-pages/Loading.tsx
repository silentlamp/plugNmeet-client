import React from 'react';

import './style.css';
import ZenBreathingLoader from './ZenBreathingLoader';
import { resolveZenLeaderLogoPath } from '../../helpers/branding';
import { getConfigValue } from '../../helpers/utils';

interface ILoadingProps {
  text: string;
}

/**
 * Full-page Meet connect loader — logo + zen breathing rings + status text.
 */
const Loading = ({ text }: ILoadingProps) => {
  const assetPath = getConfigValue(
    'staticAssetsPath',
    './assets',
    'STATIC_ASSETS_PATH',
  );
  const logoSrc = resolveZenLeaderLogoPath(assetPath);
  const status = text !== '' ? text : 'loading...';

  return (
    <div
      className={`loader opacity-100 fixed top-0 left-0 w-full h-full bg-Gray-100 dark:bg-dark-primary z-999 flex flex-wrap items-center justify-center`}
    >
      <div
        className="overlay absolute w-full h-full top-0 left-0 bg-center dark:opacity-10"
        style={{
          backgroundImage: `url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%25" height="100%25"%3E%3Cpattern id="bg" patternUnits="userSpaceOnUse" width="20" height="20"%3E%3Cg opacity="0.7"%3E%3Crect x="10" y="10" width="4" height="4" rx="2" fill="%23C2DAF2" /%3E%3C/g%3E%3C/pattern%3E%3Crect width="100%25" height="100%25" fill="url(%23bg)" /%3E%3C/svg%3E')`,
        }}
      ></div>
      <div className="inner relative z-20 flex flex-col items-center gap-5">
        <img
          src={logoSrc}
          alt="ZenLeader"
          className="h-12 w-auto max-w-[140px] object-contain"
        />
        <ZenBreathingLoader size={72} label={status} />
        <p className="text-sm font-medium text-gray-900 dark:text-white capitalize tracking-wide">
          {status}
        </p>
      </div>
    </div>
  );
};

export default Loading;
