"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type FeaturebaseFn = (command: string, payload?: unknown) => void;

type UseFeaturebaseHelpEmbedOptions = {
  organization: string;
  routeSyncingBasePath: string;
  path: string;
  filters: string;
};

type FeaturebaseWindow = Window & {
  Featurebase?: FeaturebaseFn;
};

function getFeaturebase(): FeaturebaseFn | null {
  if (typeof window === "undefined") {
    return null;
  }

  const featurebase = (window as FeaturebaseWindow).Featurebase;
  if (typeof featurebase !== "function") {
    return null;
  }

  return featurebase;
}

export function useFeaturebaseHelpEmbed({
  organization,
  routeSyncingBasePath,
  path,
  filters,
}: UseFeaturebaseHelpEmbedOptions) {
  const [isInitialized, setIsInitialized] = useState(false);
  const lastConfigKey = useRef<string>("");

  const config = useMemo(
    () => ({
      organization,
      embedOptions: {
        path,
        filters,
        routeSyncingBasePath,
      },
      stylingOptions: {
        theme: "dark",
        hideMenu: false,
        hideLogo: false,
      },
    }),
    [filters, organization, path, routeSyncingBasePath],
  );

  const initEmbed = useCallback(
    (force = false) => {
      const featurebase = getFeaturebase();
      if (!featurebase) {
        setIsInitialized(false);
        return false;
      }

      const configKey = JSON.stringify(config);
      if (!force && configKey === lastConfigKey.current) {
        return true;
      }

      featurebase("init_embed_widget", config);
      lastConfigKey.current = configKey;
      setIsInitialized(true);
      return true;
    },
    [config],
  );

  useEffect(() => {
    const didInit = initEmbed();

    if (didInit) {
      return;
    }

    const retryTimer = window.setTimeout(() => {
      initEmbed();
    }, 300);

    return () => {
      window.clearTimeout(retryTimer);
    };
  }, [initEmbed]);

  return {
    initEmbed,
    isInitialized,
  };
}
