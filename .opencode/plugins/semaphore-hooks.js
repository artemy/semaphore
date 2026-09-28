export const semaphoreHooks = async ({ $ }) => ({
  event: async ({ event }) => {
    switch (event.type) {
      case 'session.created':
        await $`semaphore --soft green on`;
        break;
      case 'message.updated':
        if (event.properties.info.role === 'user') {
          await $`semaphore --soft red on`;
        }
        break;
      case 'session.idle':
        await $`semaphore --soft green on`;
        break;
      case 'session.deleted':
        await $`semaphore --soft off`;
        break;
      case 'permission.asked':
      case 'permission.v2.asked':
      case 'question.asked':
        await $`semaphore --soft yellow blink 500`;
        break;
    }
  },
  'tool.execute.after': async () => {
    await $`semaphore --soft red on`;
  },
  start: async () => {
    await $`semaphore --soft boot`;
  },
  dispose: async () => {
    await $`semaphore --soft off`;
  }
});
