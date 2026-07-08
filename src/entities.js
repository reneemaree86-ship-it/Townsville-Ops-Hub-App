// Base44 compatibility layer for "@/entities" imports.
//
// In the Base44-hosted builder/preview, @base44/vite-plugin transparently
// redirects any import path containing "/entities" to its own virtual proxy
// (@base44/vite-plugin/compat/entities.cjs) whenever the
// BASE44_LEGACY_SDK_IMPORTS env flag is set. Standalone builds (e.g. Cloudflare
// Pages) don't set that flag, so Vite tries to resolve a literal
// "src/entities" file/folder on disk and fails. This file provides that real,
// on-disk module so `import { Lead } from '@/entities'` (and friends) keep
// working in any build environment.
import { base44 } from '@/base44Client';

export const AdDraft = base44.entities.AdDraft;
export const Business = base44.entities.Business;
export const ErrorLog = base44.entities.ErrorLog;
export const FollowUp = base44.entities.FollowUp;
export const Lead = base44.entities.Lead;
export const LeadScan = base44.entities.LeadScan;
export const Notification = base44.entities.Notification;
export const PlatformConnection = base44.entities.PlatformConnection;
export const QaTest = base44.entities.QaTest;
export const SeoAudit = base44.entities.SeoAudit;
export const SeoIssue = base44.entities.SeoIssue;
export const UrlWatchlist = base44.entities.UrlWatchlist;

// User is special-cased: auth-related calls map to base44.auth.*, everything
// else (list/filter/etc. on user records) falls through to base44.entities.User.
export const User = new Proxy(
  {},
  {
    get: (_, prop) => {
      if (prop === 'me') return base44.auth.me;
      if (prop === 'login' || prop === 'loginWithRedirect') return base44.auth.loginWithRedirect;
      if (prop === 'logout') return base44.auth.logout;
      if (prop === 'updateMyUserData') return base44.auth.updateMe;
      return base44.entities.User[prop];
    },
  }
);
