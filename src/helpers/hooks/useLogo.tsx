import { useEffect, useState } from 'react';

import { useAppSelector } from '../../store';
import { isBlockedBrandingUrl, resolveZenLeaderLogoPath } from '../branding';
import { getConfigValue, isValidHttpUrl } from '../utils';

interface CustomLogo {
  main_logo_light?: string;
  main_logo_dark?: string;
}

/**
 * Resolves the meet header logo, preferring ZenLeader assets and ignoring upstream branding URLs.
 */
const useLogo = () => {
  const theme = useAppSelector((state) => state.roomSettings.theme);

  const assetPath = getConfigValue(
    'staticAssetsPath',
    './assets',
    'STATIC_ASSETS_PATH',
  );

  const defaultLogo = resolveZenLeaderLogoPath(assetPath);

  const [logo, setLogo] = useState<string>(defaultLogo);
  const [darkLogo, setDarkLogo] = useState<string>(defaultLogo);

  useEffect(() => {
    const customLogo = getConfigValue<string | CustomLogo>(
      'customLogo',
      '',
      'CUSTOM_LOGO',
    );

    if (!customLogo) {
      return;
    }

    if (typeof customLogo === 'string' && isValidHttpUrl(customLogo)) {
      if (!isBlockedBrandingUrl(customLogo)) {
        setLogo(customLogo);
        setDarkLogo(customLogo);
      }
      return;
    }

    if (typeof customLogo !== 'object') {
      return;
    }

    if (
      customLogo.main_logo_light &&
      isValidHttpUrl(customLogo.main_logo_light) &&
      !isBlockedBrandingUrl(customLogo.main_logo_light)
    ) {
      setLogo(customLogo.main_logo_light);
    }

    if (
      customLogo.main_logo_dark &&
      isValidHttpUrl(customLogo.main_logo_dark) &&
      !isBlockedBrandingUrl(customLogo.main_logo_dark)
    ) {
      setDarkLogo(customLogo.main_logo_dark);
    }
  }, [assetPath]);

  return theme === 'dark' ? darkLogo : logo;
};

export default useLogo;
