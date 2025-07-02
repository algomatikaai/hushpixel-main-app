'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    fbq: any;
  }
}

const FACEBOOK_PIXEL_ID = '24219411987653826';

export function FacebookPixel() {
  useEffect(() => {
    // Initialize Facebook Pixel if not already loaded
    if (typeof window !== 'undefined' && !window.fbq) {
      const script = document.createElement('script');
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        
        fbq('init', '${FACEBOOK_PIXEL_ID}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);

      // Add noscript fallback
      const noscript = document.createElement('noscript');
      noscript.innerHTML = `
        <img height="1" width="1" style="display:none"
        src="https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1" />
      `;
      document.head.appendChild(noscript);
    }
  }, []);

  return null;
}

// Helper functions for tracking quiz events
export const trackFBQuizEvent = (eventName: string, parameters?: any) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, parameters);
  }
};

export const trackFBQuizStep = (step: string, data?: any) => {
  trackFBQuizEvent('Lead', {
    content_name: `Quiz Step: ${step}`,
    ...data
  });
};

export const trackFBQuizComplete = (selections: any) => {
  trackFBQuizEvent('CompleteRegistration', {
    content_name: 'Quiz Completed',
    value: 1,
    currency: 'USD',
    ...selections
  });
};