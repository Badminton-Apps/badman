import { acceptCookies } from './accept-coockies';
import { Logger } from '@nestjs/common';
import * as shared from './shared';

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

    // Create a mock page with necessary methods
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

  it('should properly cleanup request interception after completion', async () => {
    await acceptCookies({ page: mockPage }, { logger });

    // Verify request interception was enabled then disabled
    const calls = mockPage.setRequestInterception.mock.calls;
    expect(calls[0][0]).toBe(true);
    expect(calls[calls.length - 1][0]).toBe(false);

    // Verify request handler was attached and removed
    expect(mockPage.on).toHaveBeenCalledWith('request', expect.any(Function));
    expect(mockPage.off).toHaveBeenCalledWith('request', expect.any(Function));
  });

  it('should still cleanup even if an error occurs', async () => {
    (shared.waitForSelectors as jest.Mock).mockRejectedValueOnce(
      new Error('Navigation failed'),
    );

    await expect(acceptCookies({ page: mockPage }, { logger })).rejects.toThrow();

    // Verify cleanup still happened
    expect(mockPage.off).toHaveBeenCalledWith('request', expect.any(Function));
    expect(mockPage.setRequestInterception).toHaveBeenCalledWith(false);
  });

  it('should use the same handler reference for on and off', async () => {
    let capturedHandler: Function | null = null;

    mockPage.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'request') capturedHandler = handler;
    });

    await acceptCookies({ page: mockPage }, { logger });

    expect(mockPage.off).toHaveBeenCalledWith('request', capturedHandler);
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

  it('should not crash when request.continue() throws (interception disabled)', async () => {
    let capturedHandler: any = null;

    mockPage.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'request') capturedHandler = handler;
    });

    await acceptCookies({ page: mockPage }, { logger });

    // Simulate the exact error: "Request Interception is not enabled!"
    const mockRequest = {
      url: () => 'https://example.com/page',
      isInterceptResolutionHandled: () => false,
      continue: jest.fn().mockRejectedValue(new Error('Request Interception is not enabled!')),
    };

    // This should NOT throw — the handler catches the rejection
    capturedHandler(mockRequest);

    // Flush the microtask queue to ensure the .catch() runs
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
