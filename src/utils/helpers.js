import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(timestamp) {
  if (!timestamp) return '—'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(timestamp) {
  if (!timestamp) return '—'
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function truncate(str, n = 100) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

export function average(arr) {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const group = item[key]
    if (!acc[group]) acc[group] = []
    acc[group].push(item)
    return acc
  }, {})
}

export function capitalise(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
