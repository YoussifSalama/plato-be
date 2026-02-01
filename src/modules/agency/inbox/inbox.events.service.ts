import { Injectable } from "@nestjs/common";
import { InboxGateway } from "./inbox.gateway";

@Injectable()
export class InboxEventsService {
    constructor(private readonly inboxGateway: InboxGateway) { }

    emitInboxCreated(agencyId: number, payload: Record<string, unknown>) {
        this.inboxGateway.emitInboxCreated(agencyId, payload);
    }
}

