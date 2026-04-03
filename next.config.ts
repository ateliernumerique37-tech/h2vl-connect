
import type {NextConfig} from 'next';
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  buildExcludes: [/lien\/.*$/], // Exclure les routes de liens dynamiques du SW
  // @ts-ignore
  navigateFallbackDenylist: [/^\/lien/], // couvre /lien/confirmation/* ET /lien/inscription-invitation/*
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
