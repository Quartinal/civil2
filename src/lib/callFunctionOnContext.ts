export default function callFunctionOnContext<
  T,
  F extends (this: T, ...args: any[]) => any,
>(context: T, func: F, ...args: Parameters<F>): ReturnType<F> {
  if (context == null) {
    throw new Error("cannot bind to null or undefined context");
  }

  return func.call(context, ...args);
}
