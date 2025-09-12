# Changelog

## [2025-09-12] - Major Version Updates

### Updated Dependencies
- **Next.js**: Upgraded from 14.2.9 to 15.5.3 (latest stable)
- **React**: Upgraded from 18.3.1 to 19.1.1 (latest stable)
- **React DOM**: Upgraded from 18.3.1 to 19.1.1 (latest stable)
- **@types/react**: Upgraded from 18.3.24 to 19.1.13
- **@types/react-dom**: Upgraded from 18.3.7 to 19.1.9
- **eslint-config-next**: Upgraded from 14.2.32 to 15.5.3

### Bug Fixes
- Fixed React hydration error caused by browser extensions (coupon/shopping extensions)
- Added MutationObserver script to clean up extension-injected attributes before React hydration
- Added CSS rules to hide extension-injected elements
- Disabled React Strict Mode temporarily to prevent double rendering issues
- Set ThemeProvider to use fixed theme mode to avoid SSR mismatches
- Added suppressHydrationWarning to body element
- Added storageKey prop to ThemeProvider for consistent theme persistence
- Removed deprecated `swcMinify` option from next.config.js (now enabled by default in Next.js 15)

### Known Issues
- next-themes package shows peer dependency warnings with React 19 (works fine in practice)

### Migration Notes
- Next.js 15 uses React 19 which includes built-in optimizations
- SWC minification is now enabled by default, no need for explicit configuration
- The application is now running on the latest stable versions of all core dependencies