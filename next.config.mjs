/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://hjavfsgiynsgwncrzhjl.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqYXZmc2dpeW5zZ3duY3J6aGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNTY5NTEsImV4cCI6MjA4NzgzMjk1MX0.jTr48ylE_Au3y9_H34J497MveNiwv3N2ck5WrghQjp0',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_i7T8R3t6xkYyBFLwuw1KZrUh',
    NEXT_PUBLIC_APP_URL: 'https://harbourapp.com.au',
  },
};

export default nextConfig;
