class Queueer {
  private queue: (() => Promise<void>)[] = [];
  private processing = false;

  addTask(task: () => Promise<void>) {
    this.queue.push(task);
    if (!this.processing) this.processQueue();
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    this.processing = true;
    const task = this.queue.shift();
    try {
      if (task) await task();
    } catch (error) {
      console.error('Queue task error:', error);
    } finally {
      this.processQueue();
    }
  }
}

export const queueer = new Queueer();
