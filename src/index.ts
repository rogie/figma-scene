import { v4 as uuidv4 } from "uuid";

type CallbackFunction = (returnValue: any) => void | Promise<void>;
type PromiseResolvers = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
};

class FigmaScene {
  private static instance: FigmaScene;
  private callbacks: Map<string, CallbackFunction>;
  private promises: Map<string, PromiseResolvers>;
  private initialized: boolean;

  constructor() {
    this.callbacks = new Map();
    this.promises = new Map();
    this.initialized = false;
  }

  static getInstance() {
    if (!FigmaScene.instance) {
      FigmaScene.instance = new FigmaScene();
    }
    return FigmaScene.instance;
  }

  postMessage(message: any) {
    parent.postMessage(
      {
        pluginMessage: message,
        pluginId: "*",
      },
      "*"
    );
  }

  async on(
    event: string,
    func: (...args: any[]) => any,
    callback: CallbackFunction
  ) {
    const id = uuidv4();
    this.callbacks.set(id, callback);
    this.postMessage({
      action: "figma-scene-on",
      event,
      id,
      function: func.toString(),
    });
  }

  async run<T>(
    func: (args: any) => T | Promise<T>,
    args: any = {}
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = uuidv4();
      this.promises.set(id, { resolve, reject });
      this.postMessage({
        action: "figma-scene-run",
        function: func.toString(),
        args,
        id,
      });
    });
  }

  init() {
    if (this.initialized) return;
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
    figma.ui.on("message", async (msg) => {
      if (msg && msg.action) {
        try {
          switch (msg.action) {
            case "figma-scene-run":
              const result = await this.executeFigmaFunction(
                msg.function,
                msg.args
              );
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

  async executeFigmaFunction(functionString: string, args: any) {
    const func = new Function(`return ${functionString}`)();
    return await func(args);
  }

  setupFigmaEventListener(event: any, id: string, functionString: string) {
    figma.on(event, async (...args: any[]) => {
      const result = await this.executeFigmaFunction(functionString, []);
      this.sendResultToUI(id, result, args[0]);
    });
  }

  sendResultToUI(id: string, result: any, functionString: string) {
    figma.ui.postMessage({
      action: "figma-scene-return",
      id,
      return: result,
      function: functionString,
    });
  }

  sendErrorToUI(id: string, error: Error) {
    figma.ui.postMessage({
      action: "figma-scene-error",
      id,
      error: error.message,
    });
  }
}

export default FigmaScene.getInstance();
