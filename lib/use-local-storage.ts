"use client"

import * as React from "react"

export function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(initial)
  const [loaded, setLoaded] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw !== null) setValue(JSON.parse(raw) as T)
    } catch {
      /* ignored */
    }
    setLoaded(true)
  }, [key])

  React.useEffect(() => {
    if (!loaded) return
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignored */
    }
  }, [key, value, loaded])

  return [value, setValue, loaded] as const
}
