import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://nexadesignlab.com';
  
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/shop',
        '/posters/',
        '/about',
        '/contact',
      ],
      disallow: [
        '/cart',
        '/checkout',
        '/profile',
        '/admin',
        '/login',
        '/api/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
