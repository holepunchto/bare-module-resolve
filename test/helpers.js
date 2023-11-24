exports.url = function url (href) {
  return new URL(href)
}

exports.expand = function expand (resolutions) {
  const result = []

  for (const url of resolutions) {
    result.push(url.href)
  }

  return result
}
