export default function callFunctionOnContext(
  context: Window,
  func: any,
  ...args: any[]
) {
  if (context == null) {
    throw new Error("cannot bind to null or undefined context");
  }

  return func.call(context, ...args);
}
