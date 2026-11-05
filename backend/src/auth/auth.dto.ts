import { IsDateString, IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(60) @Matches(/\S/, { message: 'Ingresá un nombre válido.' }) nombre!: string;
  @IsString() @MinLength(2) @MaxLength(60) @Matches(/\S/, { message: 'Ingresá un apellido válido.' }) apellido!: string;
  @IsEmail() email!: string;
  @IsString() @Matches(/^[a-zA-Z0-9._-]{3,24}$/, { message: 'El usuario debe tener entre 3 y 24 letras, números, puntos, guiones o guiones bajos.' }) username!: string;
  @IsString() @Matches(/^(?=.*[A-Z])(?=.*\d).{8,}$/, { message: 'La contraseña necesita 8 caracteres, una mayúscula y un número.' }) password!: string;
  @IsString() @IsNotEmpty() repetirPassword!: string;
  @IsDateString() fechaNacimiento!: string;
  @IsString() @MinLength(3) @MaxLength(280) @Matches(/\S/, { message: 'Escribí una descripción válida.' }) bio!: string;
}

export class LoginDto {
  @IsString() @IsNotEmpty() identifier!: string;
  @IsString() @IsNotEmpty() password!: string;
}

export class ForgotPasswordDto {
  @IsString() @IsNotEmpty() @MinLength(3) @MaxLength(254) identifier!: string;
}

export class ResetPasswordDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/, { message: 'El enlace de recuperación no es válido.' }) token!: string;
  @IsString() @Matches(/^(?=.*[A-Z])(?=.*\d).{8,}$/, { message: 'La contraseña necesita 8 caracteres, una mayúscula y un número.' }) password!: string;
  @IsString() @IsNotEmpty() repetirPassword!: string;
}
