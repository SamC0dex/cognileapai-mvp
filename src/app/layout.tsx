import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import Script from 'next/script'
import { AppWrapper } from '@/components/app-wrapper'
import { ErrorManagementProvider } from '@/components/error-management/provider'
import { AuthProvider } from '@/contexts/auth-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CogniLeap - Transform PDFs into Study Materials',
  description: 'Upload PDFs and generate study guides, summaries, and notes powered by AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="extension-cleanup"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Enhanced cleanup for browser extension artifacts
              if (typeof window !== 'undefined') {
                // Comprehensive list of extension attributes to clean
                const extensionAttrs = [
                  'bis_skin_checked',
                  'data-coupon-processed',
                  'data-darkreader-inline-bgcolor',
                  'data-darkreader-inline-color',
                  'data-darkreader-inline-fill',
                  'data-darkreader-inline-stroke',
                  'data-darkreader-inline-stopcolor',
                  'data-adblockkey',
                  'data-honey-extension',
                  'data-capital-one-extension'
                ];

                // Function to clean all extension attributes from an element
                function cleanExtensionAttributes(element) {
                  if (!element || !element.removeAttribute) return;
                  extensionAttrs.forEach(attr => {
                    if (element.hasAttribute(attr)) {
                      element.removeAttribute(attr);
                    }
                  });
                }

                // Initial cleanup before React hydration
                function initialCleanup() {
                  extensionAttrs.forEach(attr => {
                    const elements = document.querySelectorAll('[' + attr + ']');
                    elements.forEach(cleanExtensionAttributes);
                  });
                }

                // Immediate cleanup
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', initialCleanup);
                } else {
                  initialCleanup();
                }

                // Continuous monitoring with mutation observer
                const observer = new MutationObserver((mutations) => {
                  mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes') {
                      const target = mutation.target;
                      if (extensionAttrs.includes(mutation.attributeName)) {
                        cleanExtensionAttributes(target);
                      }
                    } else if (mutation.type === 'childList') {
                      mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                          cleanExtensionAttributes(node);
                          // Clean child elements too
                          if (node.querySelectorAll) {
                            extensionAttrs.forEach(attr => {
                              const elements = node.querySelectorAll('[' + attr + ']');
                              elements.forEach(cleanExtensionAttributes);
                            });
                          }
                        }
                      });
                    }
                  });
                });

                // Start observing with more comprehensive options
                observer.observe(document.documentElement, {
                  attributes: true,
                  childList: true,
                  subtree: true,
                  attributeFilter: extensionAttrs
                });

                // Cleanup extension-injected DOM elements
                function removeExtensionElements() {
                  const selectors = [
                    '#coupon-birds-embed-div',
                    '[id*="coupon"]',
                    '[id*="honey"]',
                    '[id*="capital"]',
                    '[class*="darkreader"]',
                    '[id*="adblock"]'
                  ];

                  selectors.forEach(selector => {
                    try {
                      const elements = document.querySelectorAll(selector);
                      elements.forEach(el => {
                        if (el && el.parentNode && !el.closest('[data-app-content]')) {
                          el.parentNode.removeChild(el);
                        }
                      });
                    } catch (e) {
                      // Ignore selector errors
                    }
                  });
                }

                // Run cleanup at multiple points
                document.addEventListener('DOMContentLoaded', removeExtensionElements);
                if (document.readyState === 'complete') {
                  removeExtensionElements();
                }

                // Additional cleanup after a short delay to catch late-loading extensions
                setTimeout(removeExtensionElements, 100);
                setTimeout(initialCleanup, 200);
              }
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AppWrapper>
          <AuthProvider>
            <ErrorManagementProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem={false}
                disableTransitionOnChange
                storageKey="cognileap-theme"
              >
                {children}
                <Toaster richColors closeButton position="top-right" />
              </ThemeProvider>
            </ErrorManagementProvider>
          </AuthProvider>
        </AppWrapper>
      </body>
    </html>
  )
}
