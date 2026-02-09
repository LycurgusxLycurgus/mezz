export const Router = {
  currentRoute: null,
  subscribers: [],
  
  init() {
    this.currentRoute = window.location.hash || '#home';
    window.addEventListener('hashchange', this.handleHashChange.bind(this));
  },
  
  navigate(route) {
    if (route === this.currentRoute) return;
    window.location.hash = route;
  },
  
  subscribe(fn) {
    this.subscribers.push(fn);
  },
  
  handleHashChange() {
    const newRoute = window.location.hash || '#home';
    if (newRoute !== this.currentRoute) {
      this.currentRoute = newRoute;
      this.notifySubscribers(newRoute);
    }
  },
  
  notifySubscribers(route) {
    this.subscribers.forEach(fn => fn(route));
  }
};
