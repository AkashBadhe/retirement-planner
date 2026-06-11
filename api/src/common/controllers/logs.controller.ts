import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../user/schemas/user.schema';
import { ErrorLog, ErrorLogDocument } from '../schemas/error-log.schema';

@Controller('logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class LogsController {
  constructor(
    @InjectModel(ErrorLog.name)
    private readonly errorLogModel: Model<ErrorLogDocument>,
  ) {}

  @Get()
  async findAll(@Query('limit') limit = 100) {
    const cap = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const logs = await this.errorLogModel
      .find()
      .sort({ createdAt: -1 })
      .limit(cap)
      .lean();

    return {
      success: true,
      message: 'Logs retrieved successfully',
      data: logs,
    };
  }
}
