export function track(event, properties = {}) {
  if (window.pendo && typeof window.pendo.track === 'function') {
    window.pendo.track(event, properties)
  }
}

export function pageLoad() {
  if (window.pendo && typeof window.pendo.pageLoad === 'function') {
    window.pendo.pageLoad()
  }
}
