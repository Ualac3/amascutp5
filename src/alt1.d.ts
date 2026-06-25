declare global {
  interface Window {
    alt1?: {
      rsWidth: number;
      rsHeight: number;
      overLayClearGroup: (id: string) => void;
      overLaySetGroup: (id: string) => void;
      overLayTextEx: (
        message: string,
        color: number,
        size: number,
        x: number,
        y: number,
        duration: number,
        font: string,
        centered: boolean,
        outlined: boolean
      ) => void;
    };
  }
}

export {};
