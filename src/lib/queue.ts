export default class Queue {
  private topics: any[];
  constructor() {
    this.topics = [];
  }

  async topicOnQueue(topic: any) {
    this.topics.push(topic);
  }

  async getTopicsQueue() {
    return this.topics;
  }

  async clearQueue() {
    this.topics = [];
  }
}
