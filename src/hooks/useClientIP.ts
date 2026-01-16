import { useState, useEffect } from 'react';

/**
 * Hook to fetch the client's public IP address.
 * Uses a public IP detection service.
 */
export function useClientIP() {
  const [ip, setIp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIP = async () => {
      try {
        // Use multiple fallback services for reliability
        const services = [
          'https://api.ipify.org?format=json',
          'https://api.my-ip.io/v2/ip.json',
        ];

        for (const service of services) {
          try {
            const response = await fetch(service, { 
              signal: AbortSignal.timeout(5000) 
            });
            if (response.ok) {
              const data = await response.json();
              const ipAddress = data.ip || data.origin;
              if (ipAddress) {
                setIp(ipAddress);
                break;
              }
            }
          } catch {
            // Try next service
            continue;
          }
        }
      } catch (error) {
        console.error('Failed to fetch IP:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIP();
  }, []);

  return { ip, isLoading };
}

/**
 * Standalone function to get client IP (for use in mutations)
 */
export async function getClientIP(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      return data.ip || null;
    }
  } catch (error) {
    console.error('Failed to fetch IP:', error);
  }
  return null;
}
