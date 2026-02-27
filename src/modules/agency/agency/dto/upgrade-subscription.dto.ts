import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class UpgradeSubscriptionDto {
    @ApiProperty({ description: 'The ID of the plan to upgrade/subscribe to.' })
    @IsInt()
    @IsNotEmpty()
    plan_id: number;
}
