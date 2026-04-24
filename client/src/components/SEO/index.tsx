import { useEffect } from 'react'

interface Props {
  title: string
  description?: string
  image?: string
  url?: string
}

export default function SEO({
  title,
  description = 'Elite Boutique - Trải nghiệm mua sắm đẳng cấp và sang trọng.',
  image,
  url = window.location.href
}: Props) {
  const siteTitle = `${title} | Elite Boutique`

  useEffect(() => {
    document.title = siteTitle
    
    // Update basic meta description
    const metaDescription = document.querySelector('meta[name="description"]')
    if (metaDescription) {
      metaDescription.setAttribute('content', description)
    }

    // Update OG meta tags
    const updateMetaProperty = (property: string, content: string) => {
      let element = document.querySelector(`meta[property="${property}"]`)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute('property', property)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    updateMetaProperty('og:title', siteTitle)
    updateMetaProperty('og:description', description)
    if (image) updateMetaProperty('og:image', image)
    updateMetaProperty('og:url', url)

  }, [siteTitle, description, image, url])

  return null
}
