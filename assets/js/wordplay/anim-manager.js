// Global animation manager to track and kill animations
export const animManager = {
  persistentContexts: [],
  timelines: [],
  // register a context that should stick around (do not revert on click)
  registerPersistent(ctx) { this.persistentContexts.push(ctx); return ctx; },

  registerTimeline(tl) {
    this.timelines.push(tl);
    tl.eventCallback("onComplete", () => {
      tl.kill();
      const i = this.timelines.indexOf(tl);
      if (i > -1) this.timelines.splice(i, 1);
    });
    return tl;
  },
};

