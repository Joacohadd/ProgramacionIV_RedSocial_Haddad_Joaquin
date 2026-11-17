import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CommentMessageDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1, { message: 'Escribí un comentario.' })
  @MaxLength(1000, { message: 'El comentario no puede superar los 1000 caracteres.' })
  message!: string;
}

export class ListCommentsDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset = 0;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30) limit = 10;
}
