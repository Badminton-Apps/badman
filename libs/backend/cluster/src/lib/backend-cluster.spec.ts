import { backendCluster } from './backend-cluster';

describe('backendCluster', () => {
  it('should work', () => {
    expect(backendCluster()).toEqual('backend-cluster');
  });
});
