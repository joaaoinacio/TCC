import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateSaleDto {
  @IsUUID()
  ticketId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
