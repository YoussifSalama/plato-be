import { Logger } from "@nestjs/common";
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

export const InboxWsEvents = {
    join: "inbox.join",
    joined: "inbox.joined",
    leave: "inbox.leave",
    left: "inbox.left",
    inboxCreated: "inbox.created",
} as const;

const agencyRoom = (agencyId: number) => `agency:${agencyId}`;

@WebSocketGateway({
    namespace: "/agency",
    cors: {
        origin: "*",
        credentials: true,
    },
})
export class InboxGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(InboxGateway.name);

    @WebSocketServer()
    server!: Server;

    handleConnection(client: Socket) {
        this.logger.log(`WebSocket connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`WebSocket disconnected: ${client.id}`);
    }

    emitInboxCreated(agencyId: number, payload: Record<string, unknown>) {
        this.server.to(agencyRoom(agencyId)).emit(InboxWsEvents.inboxCreated, payload);
    }

    @SubscribeMessage(InboxWsEvents.join)
    handleJoin(
        @MessageBody() body: { agencyId?: number },
        @ConnectedSocket() client: Socket,
    ) {
        const agencyId = Number(body?.agencyId);
        if (!Number.isFinite(agencyId) || agencyId <= 0) {
            return { event: InboxWsEvents.joined, data: { ok: false } };
        }
        client.join(agencyRoom(agencyId));
        return { event: InboxWsEvents.joined, data: { ok: true, agencyId } };
    }

    @SubscribeMessage(InboxWsEvents.leave)
    handleLeave(
        @MessageBody() body: { agencyId?: number },
        @ConnectedSocket() client: Socket,
    ) {
        const agencyId = Number(body?.agencyId);
        if (!Number.isFinite(agencyId) || agencyId <= 0) {
            return { event: InboxWsEvents.left, data: { ok: false } };
        }
        client.leave(agencyRoom(agencyId));
        return { event: InboxWsEvents.left, data: { ok: true, agencyId } };
    }
}

