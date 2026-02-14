import EventEmitter from "eventemitter3";

export default class App extends EventEmitter {
  url: (URL | string) | null = null;
  onOpen: ((url: URL | string) => void) | null = null;

  constructor() {
    super();
  }

  open(url: URL | string) {
    this.url = url;
    if (this.onOpen) {
      this.onOpen(url);
    }
    this.emit("open", url);
  }

  close() {
    this.url = null;
    this.emit("close");
  }
}
