import { IsIn } from 'class-validator';
import { RegisterDto } from '../auth/auth.dto';
import type { User } from './user.schema';

export class CreateAdminUserDto extends RegisterDto {
  @IsIn(['usuario', 'administrador'], { message: 'Elegí un rol válido.' })
  role!: User['role'];
}
