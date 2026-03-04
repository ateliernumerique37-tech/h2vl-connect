
import type {NextConfig} from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  buildExcludes: [/public\/.*$/], // Exclure les routes publiques dynamiques du SW
  // NavigateFallbackDenylist empêche le Service Worker de gérer ces URLs comme des requêtes de navigation.
  // Crucial pour les pages publiques dynamiques qui ne doivent pas être gérées par la logique PWA.
  // @ts-ignore
  navigateFallbackDenylist: [/^\/public/],
});

const nextConfig: NextConfig = {
  /* config options here */
  i18n: {
    locales: ['fr'],
    defaultLocale: 'fr',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withPWA(nextConfig);
