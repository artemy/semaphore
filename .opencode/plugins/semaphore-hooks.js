export const semaphoreHooks = async ({ $ }) => {
  await $`semaphore --soft boot`;

  return {
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
        case 'permission.asked':
        case 'permission.v2.asked':
        case 'question.asked':
        case 'question.v2.asked':
          await $`semaphore --soft yellow blink 500`;
          break;
        case 'permission.replied':
        case 'permission.v2.replied':
          if (event.properties.reply === 'reject') {
            await $`semaphore --soft green on`;
          } else {
            await $`semaphore --soft red on`;
          }
          break;
        case 'question.replied':
        case 'question.v2.replied':
          await $`semaphore --soft red on`;
          break;
        case 'question.rejected':
        case 'question.v2.rejected':
          await $`semaphore --soft green on`;
          break;
      }
    },
    'tool.execute.after': async () => {
      await $`semaphore --soft red on`;
    },
    dispose: async () => {
      await $`semaphore --soft off`;
    }
  };
};
