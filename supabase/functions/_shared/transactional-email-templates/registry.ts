/// <reference types="npm:@types/react@18.3.1" />
import type { ComponentType } from 'npm:react@18.3.1'
import { template as signupConfirm } from './signup-confirm.tsx'
import { template as signupAdminNotify } from './signup-admin-notify.tsx'
import { template as gutefrageAdminNotify } from './gutefrage-admin-notify.tsx'
import { template as signupPassphrase } from './signup-passphrase.tsx'
import { template as questionSubmitted } from './question-submitted.tsx'
import {
  welcomeTemplate,
  softLaunchTemplate,
  startTemplate,
  finalDayTemplate,
  sogehtsTemplate,
  dailyReportTemplate,
  dailyBriefTemplate,
  nudgeOpinionTemplate,
  nudgeRateTemplate,

  nudgeChatTemplate,
  notificationDigestTemplate,
  wediumSogehtsTemplate,
  wediumStartTemplate,
  wediumFinalDayTemplate,
  wediumResultTemplate,
} from './campaign.tsx'



export interface TemplateEntry {
  // deno-lint-ignore no-explicit-any
  component: ComponentType<any>
  subject: string | ((data: Record<string, unknown>) => string)
  displayName?: string
  previewData?: Record<string, unknown>
  to?: string | ((data: Record<string, unknown>) => string)
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'signup-confirm': signupConfirm,
  'gutefrage-signup-confirm': signupConfirm,
  'gutefrage-admin-notify': gutefrageAdminNotify,
  'signup-admin-notify': signupAdminNotify,
  'signup-passphrase': signupPassphrase,
  'signup-welcome': welcomeTemplate,
  'campaign-soft-launch': softLaunchTemplate,
  'campaign-start': startTemplate,
  'campaign-final-day': finalDayTemplate,
  'campaign-sogehts': sogehtsTemplate,
  'daily-report': dailyReportTemplate,
  'daily-brief': dailyBriefTemplate,

  'question-submitted': questionSubmitted,
  'nudge-opinion': nudgeOpinionTemplate,
  'nudge-rate': nudgeRateTemplate,

  'nudge-chat': nudgeChatTemplate,
  'notification-digest': notificationDigestTemplate,
  'campaign-wedium-sogehts': wediumSogehtsTemplate,
  'campaign-wedium-start': wediumStartTemplate,
  'campaign-wedium-final-day': wediumFinalDayTemplate,
  'campaign-wedium-result': wediumResultTemplate,
}

