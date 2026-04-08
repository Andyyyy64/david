export function createLiveFeedStore() {
  let snapshot = '';
  return {
    getSnapshot: () => snapshot,
    setSnapshot: (value: string) => {
      snapshot = value;
    },
  };
}
