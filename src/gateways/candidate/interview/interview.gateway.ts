import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InterviewStartDto, InterviewEndDto, InterviewAddChunkDto, InterviewAnswerEndDto } from './dto/interview.dto';
import { InterviewService } from 'src/modules/candidate/interview/interview.service';
import { SpeechService } from 'src/modules/speech/speech.service';

@WebSocketGateway()
export class InterviewGateway {
  private readonly logger = new Logger(InterviewGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly interviewService: InterviewService,
    private readonly speechService: SpeechService
  ) { }

  @SubscribeMessage('interview.start')
  async handleInterviewStart(@MessageBody() body: InterviewStartDto, @ConnectedSocket() client: Socket) {
    this.logger.log(`interview.start from ${client.id} payload=${JSON.stringify(body)}`);
    const { interview_token } = body;
    // intiat session
    const welcomePayload = await this.interviewService.startInterviewWithWelcome(
      interview_token,
      false
    );
    this.logger.log(`interview.start success session=${welcomePayload.interview_session_id}`);
    client.emit("interview.welcome", {
      interview_session_id: welcomePayload.interview_session_id,
      question: welcomePayload.question,
      audioBuffer: welcomePayload.audioBuffer,
      contentType: welcomePayload.contentType,
    });
    if (welcomePayload.question && welcomePayload.language) {
      const language = welcomePayload.language === "en" ? "en" : "ar";
      this.speechService
        .synthesizeSpeech(welcomePayload.question, "ash", "wav", language)
        .then((speech) => {
          client.emit("interview.audio", {
            kind: "welcome",
            interview_session_id: welcomePayload.interview_session_id,
            question: welcomePayload.question,
            audioBuffer: speech.audioBuffer,
            contentType: speech.contentType,
          });
        })
        .catch((error) => {
          this.logger.error(
            `interview.welcome audio failed session=${welcomePayload.interview_session_id}`,
            error instanceof Error ? error.stack : undefined
          );
        });
    }
  }

  @SubscribeMessage('interview.addChunk')
  async handleInterviewAddChunk(@MessageBody() body: InterviewAddChunkDto, @ConnectedSocket() client: Socket) {
    this.logger.log(`interview.addChunk from ${client.id} session=${body.interview_session_id} group=${body.group_index ?? "auto"}`);
    const { interview_session_id, group_index, chunk } = body;
    // add chunk to session
    await this.interviewService.AddAudioChunk(interview_session_id, group_index, chunk);
    this.logger.log(`interview.addChunk stored session=${interview_session_id}`);
  }

  @SubscribeMessage('interview.end')
  handleInterviewEnd(@MessageBody() body: InterviewEndDto, @ConnectedSocket() client: Socket) {
    this.logger.log(`interview.end from ${client.id} session=${body.interview_session_id}`);
    const { interview_session_id } = body;
    // end session
  }

  @SubscribeMessage('interview.answerEnd')
  async handleInterviewAnswerEnd(@MessageBody() body: InterviewAnswerEndDto, @ConnectedSocket() client: Socket) {
    this.logger.log(`interview.answerEnd from ${client.id} session=${body.interview_session_id} group=${body.group_index ?? "auto"}`);
    const { interview_session_id, group_index } = body;
    const result = await this.interviewService.EndSessionGroup(
      interview_session_id,
      group_index,
      false
    );
    if (result.interview_ended) {
      this.logger.log(`interview.ended session=${interview_session_id}`);
      client.emit("interview.ended", {
        interview_session_id,
        message: result.closing_message,
        transcript: result.transcript,
        audioBuffer: result.closing_audio,
        contentType: result.closing_content_type,
      });
      if (result.closing_message && result.interview_language) {
        const language = result.interview_language === "en" ? "en" : "ar";
        this.speechService
          .synthesizeSpeech(result.closing_message, "ash", "wav", language)
          .then((speech) => {
            client.emit("interview.audio", {
              kind: "closing",
              interview_session_id,
              message: result.closing_message,
              audioBuffer: speech.audioBuffer,
              contentType: speech.contentType,
            });
          })
          .catch((error) => {
            this.logger.error(
              `interview.closing audio failed session=${interview_session_id}`,
              error instanceof Error ? error.stack : undefined
            );
          });
      }
      return;
    }
    this.logger.log(`interview.nextQuestion session=${interview_session_id}`);
    client.emit("interview.nextQuestion", {
      interview_session_id,
      question: result.next_question,
      transcript: result.transcript,
      audioBuffer: result.next_question_audio,
      contentType: result.next_question_content_type,
    });
    if (result.next_question && result.interview_language) {
      const language = result.interview_language === "en" ? "en" : "ar";
      this.speechService
        .synthesizeSpeech(result.next_question, "ash", "wav", language)
        .then((speech) => {
          client.emit("interview.audio", {
            kind: "next",
            interview_session_id,
            question: result.next_question,
            audioBuffer: speech.audioBuffer,
            contentType: speech.contentType,
          });
        })
        .catch((error) => {
          this.logger.error(
            `interview.next audio failed session=${interview_session_id}`,
            error instanceof Error ? error.stack : undefined
          );
        });
    }
  }
}
