import { IsArray, IsBoolean, IsOptional } from 'class-validator';
import { UserRole } from '../schemas/user.schema';

export class UpdateUserDto {
  @IsOptional()
  @IsArray()
  roles?: UserRole[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
