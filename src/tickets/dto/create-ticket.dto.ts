import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateTicketDto {
  @IsUUID()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  quantity: number;
}
