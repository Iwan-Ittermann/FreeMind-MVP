import { useEffect } from 'react';
import { useSiteTitle } from './useAppSettings';

const DEFAULT_SITE_TITLE = 'FreeMind - Free and Safe Online Conversations';

export function useDynamicSiteTitle() {
  const { data: siteTitleSetting } = useSiteTitle();

  useEffect(() => {
    // Event landing pages set their own document title.
    if (window.location.pathname.startsWith('/gutefrage')) return;
    const title = siteTitleSetting?.value || DEFAULT_SITE_TITLE;
    document.title = title;
  }, [siteTitleSetting]);

  return siteTitleSetting?.value || DEFAULT_SITE_TITLE;
}
