type CallbackFunction = (returnValue: any) => void | Promise<void>;
declare class FigmaScene {
    private static instance;
    private callbacks;
    private promises;
    private initialized;
    constructor();
    static getInstance(): FigmaScene;
    postMessage(message: any): void;
    on(event: string, func: (...args: any[]) => any, callback: CallbackFunction): Promise<void>;
    run<T>(func: (args: any) => T | Promise<T>, args?: any): Promise<T>;
    init(): void;
    initUI(): void;
    setupMessageListener(): void;
    setupFigmaUIMessageHandler(): void;
    executeFigmaFunction(functionString: string, args: any): Promise<any>;
    setupFigmaEventListener(event: any, id: string, functionString: string): void;
    sendResultToUI(id: string, result: any, functionString: string): void;
    sendErrorToUI(id: string, error: Error): void;
}
declare const _default: FigmaScene;
export default _default;
