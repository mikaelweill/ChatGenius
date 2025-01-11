type FileDropCallback = (file: File) => void;

class EventBus {
  private fileDropListeners: FileDropCallback[] = [];

  public emitFileDrop(file: File) {
    this.fileDropListeners.forEach(listener => listener(file));
  }

  public onFileDrop(callback: FileDropCallback) {
    this.fileDropListeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.fileDropListeners = this.fileDropListeners.filter(cb => cb !== callback);
    };
  }
}

// Single instance for the app
export const eventBus = new EventBus(); 