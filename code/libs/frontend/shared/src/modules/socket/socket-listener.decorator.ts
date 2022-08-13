import { Subscription } from 'rxjs';
import { AppInjector } from './socket.module';
import { SocketService } from './socket.service';

export function ListenTopic(topic: string, options?: DecoratorOptions) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    if (options?.path) {
      console.warn('Path is not supported for ListenTopic decorator right now');
    }

    // default values for our config, we’ll overwrite this with our options parameter
    const config = {
      path: '/',
    } as DecoratorOptions;

    // overwrite any keys passed in to our decorator in the config object
    if (options) {
      Object.keys(options).forEach(
        (x) =>
          (config[x as keyof DecoratorOptions] =
            options[x as keyof DecoratorOptions])
      );
    }

    // Create subscription object
    let subscription: Subscription;

    const typedTarget = target as {
      ngOnDestroy: () => void;
      ngOnInit: () => void;
    };

    // Destroy subscription on component destroy
    const _originalOnDestroy = typedTarget['ngOnDestroy'];
    typedTarget['ngOnDestroy'] = function () {
      subscription?.unsubscribe();
      if (_originalOnDestroy) {
        _originalOnDestroy?.apply(this);
      }
    };

    // Store original context
    const _originalOnInit = typedTarget['ngOnInit'];
    typedTarget['ngOnInit'] = function () {
      // Get the socket service
      const service = AppInjector.get(SocketService)?.getService({
        path: config.path,
      });

      // Subscribe to the topic
      subscription = service.fromEvent(topic).subscribe((args) => {
        descriptor.value.call(this, args, topic);
      });
      if (_originalOnInit) {
        _originalOnInit?.apply(this);
      }
    };

    return descriptor;
  };
}

export interface DecoratorOptions {
  path?: string;
}
