import { EventEmitter } from 'events';

const eventBus = new EventEmitter();

export const publishUpdate = () => {
  eventBus.emit('update');
};

export const subscribeToUpdates = (handler: () => void) => {
  eventBus.on('update', handler);
  return () => {
    eventBus.off('update', handler);
  };
};
