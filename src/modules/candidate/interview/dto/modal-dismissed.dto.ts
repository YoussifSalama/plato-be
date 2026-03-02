import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsInt, Min } from "class-validator";

export class ModalDismissedDto {
    @ApiProperty({ description: "Interview session id", example: 123 })
    @IsInt()
    @Min(1)
    interview_session_id: number;

    @ApiProperty({
        description: "Dismissed modal type",
        enum: ["cancel", "postpone"],
        example: "postpone",
    })
    @IsIn(["cancel", "postpone"])
    modal_type: "cancel" | "postpone";
}
