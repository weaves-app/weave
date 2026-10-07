export interface LiveResources<Resource> {
  readonly current: Resource;
  update(resource: Resource): void;
}
export function createLiveResources<Resource>(initial: Resource): LiveResources<Resource> {
  let current = initial;
  return {
    get current() {
      return current;
    },
    update: (resource) => {
      current = resource;
    },
  };
}
