import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { AtGuard } from '../auth/guards/at.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@/common/enums';

@ApiTags('Admin - Stats')
@ApiBearerAuth('access-token')
@UseGuards(AtGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @Get('overview')
  @ApiOkResponse({ description: 'Lấy thông tin tổng quan dashboard' })
  getOverview() {
    return this.statsService.getOverview();
  }
}
