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

export const NotificationWsEvents = {
    join: "notification.join",
    joined: "notification.joined",
    leave: "notification.leave",
    left: "notification.left",
} as const;

const candidateRoom = (candidateId: number) => `candidate:${candidateId}`;

@WebSocketGateway({
    namespace: "/candidate",
    cors: {
        origin: "*",
        credentials: true,
    },
})
export class CandidateNotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(CandidateNotificationGateway.name);

    @WebSocketServer()
    server!: Server;

    handleConnection(client: Socket) {
        this.logger.log(`Candidate WebSocket connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Candidate WebSocket disconnected: ${client.id}`);
    }

    emitToCandidate(candidateId: number, event: string, payload: Record<string, unknown>) {
        this.server.to(candidateRoom(candidateId)).emit(event, payload);
    }

    @SubscribeMessage(NotificationWsEvents.join)
    handleJoin(
        @MessageBody() body: { candidateId?: number },
        @ConnectedSocket() client: Socket,
    ) {
        const candidateId = Number(body?.candidateId);
        if (!Number.isFinite(candidateId) || candidateId <= 0) {
            return { event: NotificationWsEvents.joined, data: { ok: false } };
        }
        client.join(candidateRoom(candidateId));
        return { event: NotificationWsEvents.joined, data: { ok: true, candidateId } };
    }

    @SubscribeMessage(NotificationWsEvents.leave)
    handleLeave(
        @MessageBody() body: { candidateId?: number },
        @ConnectedSocket() client: Socket,
    ) {
        const candidateId = Number(body?.candidateId);
        if (!Number.isFinite(candidateId) || candidateId <= 0) {
            return { event: NotificationWsEvents.left, data: { ok: false } };
        }
        client.leave(candidateRoom(candidateId));
        return { event: NotificationWsEvents.left, data: { ok: true, candidateId } };
    }
}
