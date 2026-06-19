"use client";

import { useSyncExternalStore } from "react";
import { DASHBOARD_MOBILE_NAV_BODY_ATTR } from "@/lib/constants/dashboard-layout";

function subscribe(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: [DASHBOARD_MOBILE_NAV_BODY_ATTR],
  });
  return () => observer.disconnect();
}

function getSnapshot() {
  return document.body.hasAttribute(DASHBOARD_MOBILE_NAV_BODY_ATTR);
}

function getServerSnapshot() {
  return false;
}

/** True when a dashboard workspace page has mounted the mobile bottom tab bar. */
export function useDashboardMobileNavActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function setDashboardMobileNavActive(active: boolean): void {
  if (active) {
    document.body.setAttribute(DASHBOARD_MOBILE_NAV_BODY_ATTR, "");
  } else {
    document.body.removeAttribute(DASHBOARD_MOBILE_NAV_BODY_ATTR);
  }
}
