// Clear press releases cache to force fresh fetch
console.log('🧹 Clearing press releases cache...')

// Clear localStorage cache
if (typeof window !== 'undefined') {
  const keys = Object.keys(localStorage)
  keys.forEach(key => {
    if (key.includes('press-releases') || key.includes('enhanced')) {
      localStorage.removeItem(key)
      console.log(`🗑️ Cleared: ${key}`)
    }
  })
}

// Clear sessionStorage cache
if (typeof window !== 'undefined') {
  const keys = Object.keys(sessionStorage)
  keys.forEach(key => {
    if (key.includes('press-releases') || key.includes('enhanced')) {
      sessionStorage.removeItem(key)
      console.log(`🗑️ Cleared: ${key}`)
    }
  })
}

console.log('✅ Cache cleared! Please refresh the page.')

export {} 