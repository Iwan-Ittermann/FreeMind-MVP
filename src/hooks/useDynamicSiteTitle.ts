import { useEffect } from 'react';
import { useSiteTitle } from './useAppSettings';

const DEFAULT_SITE_TITLE = 'FreeMind - Free and Safe Online Conversations';

export function useDynamicSiteTitle() {
  const { data: siteTitleSetting } = useSiteTitle();

  useEffect(() => {
    const title = siteTitleSetting?.value || DEFAULT_SITE_TITLE;
    document.title = title;
  }, [siteTitleSetting]);

  return siteTitleSetting?.value || DEFAULT_SITE_TITLE;
}
