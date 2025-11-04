/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com', // For your uploaded product images
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // For our fallback placeholder
        port: '',
        pathname: '**',
      }
    ],
  },
};

export default nextConfig;
