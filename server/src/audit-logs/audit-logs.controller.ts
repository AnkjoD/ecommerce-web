import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { AtGuard } from '../auth/guards/at.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@/common/enums';

@ApiTags('Admin - Audit Logs')
@ApiBearerAuth('access-token')
@UseGuards(AtGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/audit-logs')
export class AuditLogsController {
  constructor(private auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOkResponse({ description: 'Lấy danh sách nhật ký hệ thống' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.auditLogsService.findAll(+page, +limit);
  }
}
