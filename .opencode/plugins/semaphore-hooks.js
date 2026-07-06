export const semaphoreHooks = async ({ $ }) => ({
  event: async ({ event }) => {
    switch (event.type) {
      case 'session.created':
        await $`semaphore --soft solo green on`;
        break;
      case 'message.updated':
        if (event.properties.info.role === 'user') {
          await $`semaphore --soft solo red on`;
        }
        break;
      case 'session.idle':
        await $`semaphore --soft solo green on`;
        break;
      case 'session.deleted':
        await $`semaphore --soft all off`;
        break;
      case 'permission.asked' | 'permission.v2.asked':
        await $`semaphore --soft solo yellow blink 500`;
        break;
      case 'question.asked':
        await $`semaphore --soft solo yellow blink 500`;
        break;
    }
  },
  'tool.execute.after': async () => {
    await $`semaphore --soft solo red on`;
  },
  start: async () => {
    await $`semaphore --soft boot`;
  },
  dispose: async () => {
    await $`semaphore --soft all off`;
  }
});
