export const State = {
  state: {
    currentRoute: '#home',
    currentView: 'home',
    currentCard: null,
    sessionProgress: { reviewed: 0, correct: 0, total: 0 },
    settings: {}
  },
  subscribers: [],
  
  subscribe(fn) {
    this.subscribers.push(fn);
  },
  
  unsubscribe(fn) {
    this.subscribers = this.subscribers.filter(sub => sub !== fn);
  },
  
  get() {
    return this.state;
  },
  
  update(newState) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...newState };
    this.notifySubscribers(this.state, prevState);
  },
  
  notifySubscribers(state, prevState) {
    this.subscribers.forEach(fn => fn(state, prevState));
  }
};
