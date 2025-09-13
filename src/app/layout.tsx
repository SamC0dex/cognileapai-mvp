import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import Script from 'next/script'
import { AppWrapper } from '@/components/app-wrapper'

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
              // Clean up browser extension artifacts before React hydration
              if (typeof window !== 'undefined') {
                // Remove extension-injected attributes
                const observer = new MutationObserver((mutations) => {
                  mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes') {
                      const target = mutation.target;
                      if (target && target.removeAttribute) {
                        // Remove common extension attributes
                        if (target.hasAttribute('bis_skin_checked')) {
                          target.removeAttribute('bis_skin_checked');
                        }
                        if (target.hasAttribute('data-coupon-processed')) {
                          target.removeAttribute('data-coupon-processed');
                        }
                      }
                    }
                  });
                });
                
                // Start observing before React loads
                observer.observe(document.documentElement, {
                  attributes: true,
                  childList: true,
                  subtree: true,
                  attributeFilter: ['bis_skin_checked', 'data-coupon-processed']
                });
                
                // Remove extension-injected divs and Dark Reader modifications
                document.addEventListener('DOMContentLoaded', () => {
                  const extensionDivs = document.querySelectorAll('#coupon-birds-embed-div, [id*="coupon"], [id*="honey"], [id*="capital"]');
                  extensionDivs.forEach(div => {
                    if (div && div.parentNode) {
                      div.parentNode.removeChild(div);
                    }
                  });

                  // Clean up Dark Reader attributes that cause hydration issues
                  const darkReaderAttrs = ['data-darkreader-inline-bgcolor', 'data-darkreader-inline-color', 'data-darkreader-inline-fill', 'data-darkreader-inline-stroke', 'data-darkreader-inline-stopcolor'];
                  darkReaderAttrs.forEach(attr => {
                    const elements = document.querySelectorAll('[' + attr + ']');
                    elements.forEach(el => {
                      el.removeAttribute(attr);
                      const style = el.style;
                      const cssProp = '--darkreader-inline-' + attr.replace('data-darkreader-inline-', '');
                      if (style.getPropertyValue(cssProp)) {
                        style.removeProperty(cssProp);
                      }
                    });
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <AppWrapper>
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
        </AppWrapper>
      </body>
    </html>
  )
}
