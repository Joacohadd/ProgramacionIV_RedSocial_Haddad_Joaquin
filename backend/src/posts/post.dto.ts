import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsString() @MinLength(3) @MaxLength(120) @Matches(/\S/, { message: 'Escribí un título válido.' }) title!: string;
  @IsString() @MinLength(3) @MaxLength(3000) @Matches(/\S/, { message: 'Escribí un mensaje válido.' }) description!: string;
}
export class ListPostsDto {
  @IsOptional() @IsIn(['date', 'likes']) sort: 'date' | 'likes' = 'date';
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset = 0;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(30) limit = 6;
  @IsOptional() @IsMongoId() userId?: string;
}
