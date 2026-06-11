import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  healthCheck() {
    return {
      success: true,
      message: 'API is running',
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
