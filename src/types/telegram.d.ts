// src/types/telegram.d.ts — v1.1.0

interface TelegramWebAppUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  allows_write_to_pm?: boolean
  photo_url?: string
}

interface TelegramWebApp {
  initData: string
  initDataRaw?: string // ✅ ДОБАВЛЕНО для поддержки Telegram WebApp авторизации
  initDataUnsafe: {
    user?: TelegramWebAppUser
    [key: string]: any
  }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  isExpanded: boolean
  isClosingConfirmationEnabled: boolean
  ready: () => void
  sendData: (data: string) => void
  close: () => void
  expand: () => void
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void
  MainButton: {
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
  }
}

interface TelegramNamespace {
  WebApp: TelegramWebApp
}

interface Window {
  Telegram?: TelegramNamespace
}
