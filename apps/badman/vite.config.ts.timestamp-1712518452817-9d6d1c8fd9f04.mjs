// vite.config.ts
import { angular } from "file:///C:/Users/glenn/Documents/Code/Badminton-Apps/badman-meta/node_modules/@nitedani/vite-plugin-angular/lib/plugin/index.js";
import { nxViteTsPaths } from "file:///C:/Users/glenn/Documents/Code/Badminton-Apps/badman-meta/node_modules/@nx/vite/plugins/nx-tsconfig-paths.plugin.js";
import { vavite } from "file:///C:/Users/glenn/Documents/Code/Badminton-Apps/badman-meta/node_modules/vavite/dist/index.js";
import { defineConfig, splitVendorChunkPlugin } from "file:///C:/Users/glenn/Documents/Code/Badminton-Apps/badman-meta/node_modules/vite/dist/node/index.js";
var vite_config_default = defineConfig({
  cacheDir: "../../node_modules/.vite/apps/badman",
  test: {
    globals: true,
    cache: {
      dir: "../../node_modules/.vitest"
    },
    environment: "jsdom",
    passWithNoTests: true,
    include: ["src/**/*.{test,spec}.{js,mjs,ts,mts,cts,jsx,tsx}"],
    reporters: ["default"],
    coverage: {
      reportsDirectory: "../../coverage/apps/badman",
      provider: "v8"
    }
  },
  publicDir: "src/public",
  build: {
    outDir: "../../dist/apps/badman"
  },
  ssr: {},
  plugins: [
    angular({
      swc: true
    }),
    // cjsInterop({
    //   dependencies: ['@apollo/client/core'],
    // }),
    vavite({
      serverEntry: "./src/server/main.ts",
      serveClientAssetsInDev: true,
      useViteRuntime: true
    }),
    nxViteTsPaths(),
    splitVendorChunkPlugin()
  ],
  server: {
    port: 5200,
    fs: {
      allow: [
        "src/",
        "../../node_modules/@fontsource/roboto/files/",
        "../../node_modules/material-icons/iconfont/"
      ]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxnbGVublxcXFxEb2N1bWVudHNcXFxcQ29kZVxcXFxCYWRtaW50b24tQXBwc1xcXFxiYWRtYW4tbWV0YVxcXFxhcHBzXFxcXGJhZG1hblwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcZ2xlbm5cXFxcRG9jdW1lbnRzXFxcXENvZGVcXFxcQmFkbWludG9uLUFwcHNcXFxcYmFkbWFuLW1ldGFcXFxcYXBwc1xcXFxiYWRtYW5cXFxcdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0M6L1VzZXJzL2dsZW5uL0RvY3VtZW50cy9Db2RlL0JhZG1pbnRvbi1BcHBzL2JhZG1hbi1tZXRhL2FwcHMvYmFkbWFuL3ZpdGUuY29uZmlnLnRzXCI7Ly8vIDxyZWZlcmVuY2UgdHlwZXM9J3ZpdGVzdCcgLz5cclxuaW1wb3J0IHsgYW5ndWxhciB9IGZyb20gJ0BuaXRlZGFuaS92aXRlLXBsdWdpbi1hbmd1bGFyL3BsdWdpbic7XHJcbmltcG9ydCB7IG54Vml0ZVRzUGF0aHMgfSBmcm9tICdAbngvdml0ZS9wbHVnaW5zL254LXRzY29uZmlnLXBhdGhzLnBsdWdpbic7XHJcbmltcG9ydCB7IHZhdml0ZSB9IGZyb20gJ3Zhdml0ZSc7XHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgc3BsaXRWZW5kb3JDaHVua1BsdWdpbiB9IGZyb20gJ3ZpdGUnO1xyXG4vLyBpbXBvcnQgeyBjanNJbnRlcm9wIH0gZnJvbSAndml0ZS1wbHVnaW4tY2pzLWludGVyb3AnO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBjYWNoZURpcjogJy4uLy4uL25vZGVfbW9kdWxlcy8udml0ZS9hcHBzL2JhZG1hbicsXHJcbiAgdGVzdDoge1xyXG4gICAgZ2xvYmFsczogdHJ1ZSxcclxuICAgIGNhY2hlOiB7XHJcbiAgICAgIGRpcjogJy4uLy4uL25vZGVfbW9kdWxlcy8udml0ZXN0JyxcclxuICAgIH0sXHJcbiAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcclxuICAgIHBhc3NXaXRoTm9UZXN0czogdHJ1ZSxcclxuICAgIGluY2x1ZGU6IFsnc3JjLyoqLyoue3Rlc3Qsc3BlY30ue2pzLG1qcyx0cyxtdHMsY3RzLGpzeCx0c3h9J10sXHJcblxyXG4gICAgcmVwb3J0ZXJzOiBbJ2RlZmF1bHQnXSxcclxuICAgIGNvdmVyYWdlOiB7XHJcbiAgICAgIHJlcG9ydHNEaXJlY3Rvcnk6ICcuLi8uLi9jb3ZlcmFnZS9hcHBzL2JhZG1hbicsXHJcbiAgICAgIHByb3ZpZGVyOiAndjgnLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHB1YmxpY0RpcjogJ3NyYy9wdWJsaWMnLFxyXG4gIGJ1aWxkOiB7XHJcbiAgICBvdXREaXI6ICcuLi8uLi9kaXN0L2FwcHMvYmFkbWFuJyxcclxuICB9LFxyXG4gIHNzcjoge30sXHJcbiAgcGx1Z2luczogW1xyXG4gICAgYW5ndWxhcih7XHJcbiAgICAgIHN3YzogdHJ1ZSxcclxuICAgIH0pLFxyXG4gICAgLy8gY2pzSW50ZXJvcCh7XHJcbiAgICAvLyAgIGRlcGVuZGVuY2llczogWydAYXBvbGxvL2NsaWVudC9jb3JlJ10sXHJcbiAgICAvLyB9KSxcclxuICAgIHZhdml0ZSh7XHJcbiAgICAgIHNlcnZlckVudHJ5OiAnLi9zcmMvc2VydmVyL21haW4udHMnLFxyXG4gICAgICBzZXJ2ZUNsaWVudEFzc2V0c0luRGV2OiB0cnVlLFxyXG4gICAgICB1c2VWaXRlUnVudGltZTogdHJ1ZSxcclxuICAgIH0pLFxyXG4gICAgbnhWaXRlVHNQYXRocygpLFxyXG4gICAgc3BsaXRWZW5kb3JDaHVua1BsdWdpbigpLFxyXG4gIF0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MjAwLFxyXG4gICAgZnM6IHtcclxuICAgICAgYWxsb3c6IFtcclxuICAgICAgICAnc3JjLycsXHJcbiAgICAgICAgJy4uLy4uL25vZGVfbW9kdWxlcy9AZm9udHNvdXJjZS9yb2JvdG8vZmlsZXMvJyxcclxuICAgICAgICAnLi4vLi4vbm9kZV9tb2R1bGVzL21hdGVyaWFsLWljb25zL2ljb25mb250LycsXHJcbiAgICAgIF0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQ0EsU0FBUyxlQUFlO0FBQ3hCLFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsY0FBYztBQUN2QixTQUFTLGNBQWMsOEJBQThCO0FBR3JELElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFVBQVU7QUFBQSxFQUNWLE1BQU07QUFBQSxJQUNKLFNBQVM7QUFBQSxJQUNULE9BQU87QUFBQSxNQUNMLEtBQUs7QUFBQSxJQUNQO0FBQUEsSUFDQSxhQUFhO0FBQUEsSUFDYixpQkFBaUI7QUFBQSxJQUNqQixTQUFTLENBQUMsa0RBQWtEO0FBQUEsSUFFNUQsV0FBVyxDQUFDLFNBQVM7QUFBQSxJQUNyQixVQUFVO0FBQUEsTUFDUixrQkFBa0I7QUFBQSxNQUNsQixVQUFVO0FBQUEsSUFDWjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFdBQVc7QUFBQSxFQUNYLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxFQUNWO0FBQUEsRUFDQSxLQUFLLENBQUM7QUFBQSxFQUNOLFNBQVM7QUFBQSxJQUNQLFFBQVE7QUFBQSxNQUNOLEtBQUs7QUFBQSxJQUNQLENBQUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUlELE9BQU87QUFBQSxNQUNMLGFBQWE7QUFBQSxNQUNiLHdCQUF3QjtBQUFBLE1BQ3hCLGdCQUFnQjtBQUFBLElBQ2xCLENBQUM7QUFBQSxJQUNELGNBQWM7QUFBQSxJQUNkLHVCQUF1QjtBQUFBLEVBQ3pCO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixJQUFJO0FBQUEsTUFDRixPQUFPO0FBQUEsUUFDTDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
