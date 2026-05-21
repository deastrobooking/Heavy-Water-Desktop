const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("heavyWaterDesktop", {
  isDesktop: true,
  platform: process.platform,
});
