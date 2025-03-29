import { TuxinRequest } from './index';

describe('TuxinRequest', () => {
  let request: TuxinRequest;

  beforeEach(() => {
    request = new TuxinRequest({
      baseURL: 'https://api.example.com',
      timeout: 5000,
    });
  });

  it('should create an instance with correct config', () => {
    expect(request).toBeDefined();
  });

  // 添加更多测试用例...
}); 