export const dbg = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.debug("[dbg]", ...args);
  }
};
