const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const dayThisYear = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const dayOtherYear = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

/** "Today, 3:42 PM" / "Yesterday, 9:05 AM" / "Oct 21, 3:42 PM" / "Dec 3, 2025, 3:42 PM". */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const daysAgo = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  const day =
    daysAgo === 0
      ? 'Today'
      : daysAgo === 1
        ? 'Yesterday'
        : (date.getFullYear() === now.getFullYear() ? dayThisYear : dayOtherYear).format(date)
  return `${day}, ${time.format(date)}`
}
