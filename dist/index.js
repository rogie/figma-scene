// node_modules/uuid/dist/esm-browser/stringify.js
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
var byteToHex = [];
for (i = 0;i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
var i;

// node_modules/uuid/dist/esm-browser/rng.js
var getRandomValues;
var rnds8 = new Uint8Array(16);
function rng() {
  if (!getRandomValues) {
    getRandomValues = typeof crypto !== "undefined" && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);
    if (!getRandomValues) {
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    }
  }
  return getRandomValues(rnds8);
}

// node_modules/uuid/dist/esm-browser/native.js
var randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
var native_default = {
  randomUUID
};

// node_modules/uuid/dist/esm-browser/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  var rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (var i = 0;i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;
// src/index.ts
class FigmaScene {
  static instance;
  callbacks;
  promises;
  initialized;
  constructor() {
    this.callbacks = new Map;
    this.promises = new Map;
    this.initialized = false;
  }
  static getInstance() {
    if (!FigmaScene.instance) {
      FigmaScene.instance = new FigmaScene;
    }
    return FigmaScene.instance;
  }
  postMessage(message) {
    parent.postMessage({
      pluginMessage: message,
      pluginId: "*"
    }, "*");
  }
  async on(event, func, callback) {
    const id = v4_default();
    this.callbacks.set(id, callback);
    this.postMessage({
      action: "figma-scene-on",
      event,
      id,
      function: func.toString()
    });
  }
  async run(func, args = {}) {
    return new Promise((resolve, reject) => {
      const id = v4_default();
      this.promises.set(id, { resolve, reject });
      this.postMessage({
        action: "figma-scene-run",
        function: func.toString(),
        args,
        id
      });
    });
  }
  init() {
    if (this.initialized)
      return;
    this.initialized = true;
    if (typeof window !== "undefined") {
      this.initUI();
      this.setupMessageListener();
    } else {
      this.setupFigmaUIMessageHandler();
    }
  }
  initUI() {
    this.postMessage({ action: "figma-scene-init" });
  }
  setupMessageListener() {
    window.addEventListener("message", async (event) => {
      const msg = event.data.pluginMessage;
      if (msg && msg.action === "figma-scene-return") {
        const { id, return: returnValue } = msg;
        const promise = this.promises.get(id);
        if (promise) {
          promise.resolve(returnValue);
          this.promises.delete(id);
        }
        const callback = this.callbacks.get(id);
        if (callback) {
          await callback(returnValue);
        }
      }
    });
  }
  setupFigmaUIMessageHandler() {
    globalThis.scene = this;
    figma.ui.on("message", async (msg) => {
      if (msg && msg.action) {
        try {
          switch (msg.action) {
            case "figma-scene-run":
              const result = await this.executeFigmaFunction(msg.function, msg.args);
              this.sendResultToUI(msg.id, result, msg.function);
              break;
            case "figma-scene-on":
              this.setupFigmaEventListener(msg.event, msg.id, msg.function);
              break;
            case "figma-scene-init":
              this.sendErrorToUI(msg.id, new Error("Not implemented"));
              break;
          }
        } catch (error) {
          console.error("Error in Figma UI message handler:", error);
          if (error instanceof Error) {
            this.sendErrorToUI(msg.id, error);
          } else {
            this.sendErrorToUI(msg.id, new Error(String(error)));
          }
        }
      }
    });
  }
  async executeFigmaFunction(functionString, args) {
    const func = new Function(`return ${functionString}`)();
    return await func(args);
  }
  setupFigmaEventListener(event, id, functionString) {
    figma.on(event, async (...args) => {
      const result = await this.executeFigmaFunction(functionString, []);
      this.sendResultToUI(id, result, args[0]);
    });
  }
  sendResultToUI(id, result, functionString) {
    figma.ui.postMessage({
      action: "figma-scene-return",
      id,
      return: result,
      function: functionString
    });
  }
  sendErrorToUI(id, error) {
    figma.ui.postMessage({
      action: "figma-scene-error",
      id,
      error: error.message
    });
  }
}
var src_default = FigmaScene.getInstance();
export {
  src_default as default
};
