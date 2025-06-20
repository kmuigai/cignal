export function formatRelativeTime(dateString: string): string {
  let date: Date

  try {
    // Handle RSS pubDate format (e.g., "Mon, 15 Jan 2025 14:00:00 GMT")
    date = new Date(dateString)

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Unknown time"
    }
  } catch {
    return "Unknown time"
  }

  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInMs < 0) {
    return "Just published"
  } else if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    if (diffInMinutes < 1) return "Just now"
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`
  } else if (diffInDays === 1) {
    return "Yesterday"
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`
  } else if (diffInDays < 14) {
    return "1 week ago"
  } else if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7)
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`
  } else {
    const months = Math.floor(diffInDays / 30)
    return `${months} month${months !== 1 ? "s" : ""} ago`
  }
}
