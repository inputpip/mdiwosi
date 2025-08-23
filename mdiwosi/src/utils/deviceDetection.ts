export const isMobileDevice = (): boolean => {
  // Check user agent for mobile patterns (excluding iPad which we'll handle as tablet)
  const mobileRegex = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUserAgent = mobileRegex.test(navigator.userAgent);
  
  // Check screen width for mobile-like dimensions
  const isMobileWidth = window.innerWidth <= 768;
  
  // Check for touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Special check for mobile browsers in desktop (user agent spoofing)
  const isMobileBrowser = /Mobile|mobile/i.test(navigator.userAgent);
  
  // Consider it mobile if:
  // 1. User agent clearly indicates mobile device, OR
  // 2. Small screen width with touch capability, OR  
  // 3. Browser explicitly says "mobile"
  return isMobileUserAgent || isMobileBrowser || (isMobileWidth && isTouchDevice);
};

export const isTabletDevice = (): boolean => {
  const tabletRegex = /iPad|Android/i;
  const isTabletUserAgent = tabletRegex.test(navigator.userAgent);
  const isTabletWidth = window.innerWidth > 768 && window.innerWidth <= 1024;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return isTabletUserAgent && isTabletWidth && isTouchDevice;
};

export const isDesktopDevice = (): boolean => {
  return !isMobileDevice() && !isTabletDevice();
};

// Force mobile mode (useful for testing or user preference)
export const getForceMobileMode = (): boolean => {
  return localStorage.getItem('forceMobileMode') === 'true';
};

export const setForceMobileMode = (force: boolean): void => {
  if (force) {
    localStorage.setItem('forceMobileMode', 'true');
  } else {
    localStorage.removeItem('forceMobileMode');
  }
};

// Check if should use mobile layout
export const shouldUseMobileLayout = (): boolean => {
  const forceMobile = getForceMobileMode();
  const isMobile = isMobileDevice();
  const shouldUseMobile = forceMobile || isMobile;
  
  return shouldUseMobile;
};