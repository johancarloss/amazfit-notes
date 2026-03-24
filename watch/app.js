import { BaseApp } from "@zeppos/zml/base-app";

App(
  BaseApp({
    globalData: {},

    onCreate() {
      console.log("Amazfit Notes: app created");
    },

    onDestroy() {
      console.log("Amazfit Notes: app destroyed");
    },
  })
);
