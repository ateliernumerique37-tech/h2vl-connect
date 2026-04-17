"use client"

import { useState, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

function playSound(variant?: string) {
  try {
    const src = variant === 'destructive' ? '/sounds/error.mp3' : '/sounds/success.mp3';
    const audio = new Audio(src);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  } catch {}
}

export function Toaster() {
  const { toasts } = useToast()
  const [isMounted, setIsMounted] = useState(false)
  const seenIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    toasts.forEach(toast => {
      if (!seenIds.current.has(toast.id)) {
        seenIds.current.add(toast.id);
        playSound(toast.variant);
      }
    });
  }, [toasts])

  if (!isMounted) {
    return null
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
