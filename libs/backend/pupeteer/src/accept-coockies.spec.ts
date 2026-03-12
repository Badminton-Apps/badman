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

    // Verify request interception was enabled
    expect(mockPage.setRequestInterception).toHaveBeenCalledWith(true);

    // Verify request handler was attached
    expect(mockPage.on).toHaveBeenCalledWith('request', expect.any(Function));

    // Verify request handler was removed
    expect(mockPage.off).toHaveBeenCalledWith('request', expect.any(Function));

    // Verify request interception was disabled at the end
    expect(mockPage.setRequestInterception).toHaveBeenCalledWith(false);

    // Verify the order of calls
    const calls = mockPage.setRequestInterception.mock.calls;
    expect(calls[0][0]).toBe(true); // First call should enable
    expect(calls[calls.length - 1][0]).toBe(false); // Last call should disable
  });

  it('should still cleanup even if an error occurs', async () => {
    // Make waitForSelectors throw an error
    (shared.waitForSelectors as jest.Mock).mockRejectedValueOnce(
      new Error('Navigation failed')
    );

    try {
      await acceptCookies({ page: mockPage }, { logger });
    } catch (e) {
      // Expected to fail
    }

    // Verify cleanup still happened
    expect(mockPage.off).toHaveBeenCalledWith('request', expect.any(Function));
    expect(mockPage.setRequestInterception).toHaveBeenCalledWith(false);
  });

  it('should use the same handler for on and off', async () => {
    let capturedHandler: Function | null = null;

    mockPage.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'request') {
        capturedHandler = handler;
      }
    });

    await acceptCookies({ page: mockPage }, { logger });

    // Verify the same handler was used for both on and off
    expect(mockPage.off).toHaveBeenCalledWith('request', capturedHandler);
  });

  it('should have request handler that continues allowed requests', async () => {
    let capturedHandler: any = null;

    mockPage.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'request') {
        capturedHandler = handler;
      }
    });

    await acceptCookies({ page: mockPage }, { logger });

    // Get the handler that was attached
    expect(capturedHandler).toBeDefined();

    // Test that the handler allows normal requests
    const mockRequest = {
      url: () => 'https://example.com/normal-request',
      isInterceptResolutionHandled: () => false,
      continue: jest.fn(),
    };

    capturedHandler(mockRequest);
    expect(mockRequest.continue).toHaveBeenCalled();
  });

  it('should have request handler that aborts analytics requests', async () => {
    let capturedHandler: any = null;

    mockPage.on.mockImplementation((event: string, handler: Function) => {
      if (event === 'request') {
        capturedHandler = handler;
      }
    });

    await acceptCookies({ page: mockPage }, { logger });

    // Test that the handler aborts google-analytics requests
    const mockRequest = {
      url: () => 'https://google-analytics.com/track',
      isInterceptResolutionHandled: () => false,
      abort: jest.fn(),
    };

    capturedHandler(mockRequest);
    expect(mockRequest.abort).toHaveBeenCalled();
  });
});
