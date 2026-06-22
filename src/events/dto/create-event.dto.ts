import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsInt()
  @Min(1)
  capacity: number;
}
