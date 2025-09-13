'use client'

import { useEffect } from 'react'

export function useExtensionBlocker() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // List of known extension attributes and IDs to remove
    const extensionAttributes = [
      'bis_skin_checked',
      'data-coupon-processed',
      'data-honey-installed',
      'data-rakuten-processed',
      'data-capital-one-shopping',
      'data-joinhoney-installed',
      // Dark Reader extension attributes
      'data-darkreader-inline-bgcolor',
      'data-darkreader-inline-color',
      'data-darkreader-inline-fill',
      'data-darkreader-inline-stroke',
      'data-darkreader-inline-stopcolor',
      'data-darkreader-inline-border',
      'data-darkreader-inline-boxshadow'
    ]

    const extensionIds = [
      'coupon-birds-embed-div',
      'honey-container',
      'rakuten-cash-back-widget',
      'capital-one-shopping-widget'
    ]

    // Function to clean up extension artifacts
    const cleanupExtensions = () => {
      // Remove extension attributes
      extensionAttributes.forEach(attr => {
        const elements = document.querySelectorAll(`[${attr}]`)
        elements.forEach(el => {
          el.removeAttribute(attr)
          // Also clean up associated CSS custom properties from Dark Reader
          if (attr.startsWith('data-darkreader-inline-')) {
            const style = (el as HTMLElement).style
            const cssProp = `--darkreader-inline-${attr.replace('data-darkreader-inline-', '')}`
            if (style.getPropertyValue(cssProp)) {
              style.removeProperty(cssProp)
            }
          }
        })
      })

      // Remove extension-injected elements
      extensionIds.forEach(id => {
        const element = document.getElementById(id)
        if (element && element.parentNode) {
          element.parentNode.removeChild(element)
        }
      })

      // Remove any elements with IDs containing extension keywords
      const suspiciousElements = document.querySelectorAll(
        '[id*="coupon"], [id*="honey"], [id*="rakuten"], [id*="capital"], [class*="coupon"], [class*="honey"]'
      )
      suspiciousElements.forEach(el => {
        // Only remove if it's likely an extension element (not part of our app)
        if (el.id && !el.id.includes('cognileap') && el.parentNode) {
          el.parentNode.removeChild(el)
        }
      })
    }

    // Initial cleanup
    cleanupExtensions()

    // Set up MutationObserver to catch dynamically added extension elements
    const observer = new MutationObserver((mutations) => {
      let shouldCleanup = false
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes') {
          const target = mutation.target as HTMLElement
          extensionAttributes.forEach(attr => {
            if (target.hasAttribute(attr)) {
              target.removeAttribute(attr)
              shouldCleanup = true
            }
          })
        } else if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              const element = node as HTMLElement
              if (element.id && extensionIds.includes(element.id)) {
                shouldCleanup = true
              }
            }
          })
        }
      })

      if (shouldCleanup) {
        cleanupExtensions()
      }
    })

    // Start observing
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: extensionAttributes
    })

    // Cleanup on unmount
    return () => {
      observer.disconnect()
    }
  }, [])
}