import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use webpack instead of Turbopack to prevent memory crashes
  // Turbopack spawns an unbounded Rust watcher process on top of Node
};

export default nextConfig;
