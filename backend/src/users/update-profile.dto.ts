import { Transform } from 'class-transformer';
import { IsDateString, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const lowercase = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value;

export class UpdateProfileDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) @Matches(/\S/)
  nombre?: string;

  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(60) @Matches(/\S/)
  apellido?: string;

  @IsOptional() @Transform(lowercase) @IsEmail() @MaxLength(254)
  email?: string;

  @IsOptional() @Transform(lowercase) @IsString() @Matches(/^[a-z0-9._-]{3,24}$/)
  username?: string;

  @IsOptional() @IsDateString()
  fechaNacimiento?: string;

  @IsOptional() @Transform(trim) @IsString() @MinLength(3) @MaxLength(280) @Matches(/\S/)
  bio?: string;
}
