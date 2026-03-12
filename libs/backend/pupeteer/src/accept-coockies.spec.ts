import { acceptCookies } from './accept-coockies';
import { Logger } from '@nestjs/common';

jest.mock('./shared', () => ({
  waitForSelectors: jest.fn().mockResolvedValue({
    click: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('acceptCookies', () => {
  let mockPage: any;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger('test');
    jest.clearAllMocks();

    mockPage = {
      setRequestInterception: jest.fn().mockResolvedValue(undefined),
      waitForNavigation: jest.fn().mockResolvedValue(undefined),
      goto: jest.fn().mockResolvedValue(undefined),
      waitForNetworkIdle: jest.fn().mockResolvedValue(undefined),
      $: jest.fn().mockResolvedValue(null),
      on: jest.fn(),
      off: jest.fn(),
    };
  });

  it('should enable request interception and register a handler', async () => {
    await acceptCookies({ page: mockPage }, { logger });

    expect(mockPage.setRequestInterception).toHaveBeenCalledWith(true);
    expect(mockPage.on).toHaveBeenCalledWith('request', expect.any(Function));
  });

  it('should keep interception active for the page lifetime (no cleanup)', async () => {
    await acceptCookies({ page: mockPage }, { logger });

    // Should NOT disable interception — the page continues to be used after acceptCookies
    expect(mockPage.setRequestInterception).toHaveBeenCalledTimes(1);
    expect(mockPage.setRequestInterception).toHaveBeenCalledWith(true);
    expect(mockPage.off).not.toHaveBeenCalled();
  });

  it('should continue allowed requests', async () => {
    let capturedHandler: any = null;
    mockPage.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'request') capturedHandler = handler;
    });

    await acceptCookies({ page: mockPage }, { logger });

    const mockRequest = {
      url: () => 'https://example.com/normal-request',
      isInterceptResolutionHandled: () => false,
      continue: jest.fn().mockResolvedValue(undefined),
    };

    capturedHandler(mockRequest);
    expect(mockRequest.continue).toHaveBeenCalled();
  });

  it('should abort analytics requests', async () => {
    let capturedHandler: any = null;
    mockPage.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'request') capturedHandler = handler;
    });

    await acceptCookies({ page: mockPage }, { logger });

    const mockRequest = {
      url: () => 'https://google-analytics.com/track',
      isInterceptResolutionHandled: () => false,
      abort: jest.fn().mockResolvedValue(undefined),
    };

    capturedHandler(mockRequest);
    expect(mockRequest.abort).toHaveBeenCalled();
  });

  it('should not crash when request.continue() rejects (interception disabled)', async () => {
    let capturedHandler: any = null;
    mockPage.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'request') capturedHandler = handler;
    });

    await acceptCookies({ page: mockPage }, { logger });

    // Simulate the exact production error
    const mockRequest = {
      url: () => 'https://example.com/page',
      isInterceptResolutionHandled: () => false,
      continue: jest.fn().mockRejectedValue(new Error('Request Interception is not enabled!')),
    };

    // Should NOT throw — the .catch() swallows it
    capturedHandler(mockRequest);

    // Flush microtask queue
    await new Promise((resolve) => setImmediate(resolve));

    expect(mockRequest.continue).toHaveBeenCalled();
  });

  it('should skip already-handled requests', async () => {
    let capturedHandler: any = null;
    mockPage.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'request') capturedHandler = handler;
    });

    await acceptCookies({ page: mockPage }, { logger });

    const mockRequest = {
      url: () => 'https://example.com/page',
      isInterceptResolutionHandled: () => true,
      continue: jest.fn().mockResolvedValue(undefined),
    };

    capturedHandler(mockRequest);
    expect(mockRequest.continue).not.toHaveBeenCalled();
  });
});
