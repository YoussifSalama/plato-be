import { Module } from "@nestjs/common";
import { SendGridService } from "./sendgrid.services";

@Module({
    providers: [SendGridService],
    exports: [SendGridService],
})
export class EmailModule { }

