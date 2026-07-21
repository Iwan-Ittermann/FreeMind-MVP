/// <reference types="npm:@types/react@18.3.1" />
import type { ComponentType } from 'npm:react@18.3.1'
import { template as signupConfirm } from './signup-confirm.tsx'
import { template as signupAdminNotify } from './signup-admin-notify.tsx'
import { template as signupPassphrase } from './signup-passphrase.tsx'

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
  'signup-admin-notify': signupAdminNotify,
}
