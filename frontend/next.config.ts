import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/thesis",
        destination:
          "https://paragraph.com/@0xc91ed1978a1b89d0321fcf6bff919a0f785d5ec7/openinnovate-dao-thesis",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
