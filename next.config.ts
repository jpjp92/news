import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // WSL2에서 Windows 브라우저가 WSL eth0 IP로 접속할 때 dev origin 경고/차단 방지.
  // eth0 IP는 재부팅 시 바뀌므로 172.* 대역 전체를 허용.
  allowedDevOrigins: ['172.25.231.60', '172.*.*.*'],
};

export default nextConfig;
