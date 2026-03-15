import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { FeedbackFrom } from "../../generated/prisma";

@Injectable()
export class FeedbackService {
    constructor(private readonly prisma: PrismaService) {}

    async submitFeedback(userId: number, from: FeedbackFrom, dto: SubmitFeedbackDto) {
        const session = await this.prisma.interviewSession.findUnique({
            where: { id: dto.session_id },
            include: {
                invitation_token: {
                    select: {
                        candidate_id: true,
                        invitation_id: true,
                    }
                },
            },
        });

        if (!session) {
            throw new NotFoundException('Interview session not found');
        }

        // Authorization check
        if (from === FeedbackFrom.agency) {
            const agencyId = await this.getAgencyId(userId);
            if (session.agency_id !== agencyId) {
                throw new BadRequestException('Not authorized to give feedback for this session');
            }
        } else {
            if (session.invitation_token.candidate_id !== userId) {
                throw new BadRequestException('Not authorized to give feedback for this session');
            }
        }

        // Optional: Check if interview is completed
        // For now we allow it if the session exists, assuming frontend only shows it for completed ones.

        const feedback = await this.prisma.interviewFeedback.upsert({
            where: {
                session_id_from: {
                    session_id: dto.session_id,
                    from: from,
                },
            },
            update: {
                rating: dto.rating,
                comment: dto.comment,
                decision: dto.decision,
                proposed_date_range_start: dto.proposed_date_range_start ? new Date(dto.proposed_date_range_start) : undefined,
                proposed_date_range_end: dto.proposed_date_range_end ? new Date(dto.proposed_date_range_end) : undefined,
                selected_date: dto.selected_date ? new Date(dto.selected_date) : undefined,
            },
            create: {
                session_id: dto.session_id,
                from: from,
                rating: dto.rating,
                comment: dto.comment,
                decision: dto.decision,
                proposed_date_range_start: dto.proposed_date_range_start ? new Date(dto.proposed_date_range_start) : undefined,
                proposed_date_range_end: dto.proposed_date_range_end ? new Date(dto.proposed_date_range_end) : undefined,
                selected_date: dto.selected_date ? new Date(dto.selected_date) : undefined,
            },
        });

        // If candidate selected an offline date, update invitation status
        if (from === FeedbackFrom.candidate && dto.selected_date) {
            await this.prisma.invitation.update({
                where: { id: (session.invitation_token as any).invitation_id },
                data: { status: 'offline_scheduled' } as any,
            });
        }

        return feedback;
    }

    async getFeedback(userId: number, role: FeedbackFrom, sessionId: number) {
        const feedbacks = await this.prisma.interviewFeedback.findMany({
            where: { session_id: sessionId },
        });

        const agencyFeedback = feedbacks.find(f => f.from === FeedbackFrom.agency);
        const candidateFeedback = feedbacks.find(f => f.from === FeedbackFrom.candidate);

        const isAgencyRole = role === FeedbackFrom.agency;
        
        const visibilityMeta = {
            is_agency_submitted: !!agencyFeedback,
            is_candidate_submitted: !!candidateFeedback,
            is_48h_passed: false,
            can_view_mutual: false,
        };

        if (agencyFeedback || candidateFeedback) {
            const firstSubmission = agencyFeedback || candidateFeedback;
            if (firstSubmission) {
                visibilityMeta.is_48h_passed = new Date().getTime() - new Date(firstSubmission.created_at).getTime() > 48 * 60 * 60 * 1000;
            }
        }

        visibilityMeta.can_view_mutual = (visibilityMeta.is_agency_submitted && visibilityMeta.is_candidate_submitted) || visibilityMeta.is_48h_passed;

        const result: any = {
            visibility_meta: visibilityMeta,
        };

        if (isAgencyRole) {
            result.agency_feedback = agencyFeedback;
            if (visibilityMeta.can_view_mutual) {
                result.candidate_feedback = candidateFeedback;
            }
        } else {
            result.candidate_feedback = candidateFeedback;
            
            // Candidate needs to see agency's proposed range IF agency made that decision
            // Special Case: If agency chose 'advance_offline', candidate sees the decision and range to respond to it.
            if (agencyFeedback?.decision === 'advance_offline') {
                result.agency_feedback = {
                    decision: agencyFeedback.decision,
                    proposed_date_range_start: agencyFeedback.proposed_date_range_start,
                    proposed_date_range_end: agencyFeedback.proposed_date_range_end,
                };
                
                // If visibility is mutual, show full agency feedback
                if (visibilityMeta.can_view_mutual) {
                    result.agency_feedback = agencyFeedback;
                }
            } else if (visibilityMeta.can_view_mutual) {
                result.agency_feedback = agencyFeedback;
            }
        }

        return result;
    }

    async getAllAgencyFeedbacks(
        accountId: number,
        options: { page?: number; limit?: number; } = {}
    ) {
        const agencyId = await this.getAgencyId(accountId);

        const page = options.page ? parseInt(options.page as any, 10) : 1;
        const limit = options.limit ? parseInt(options.limit as any, 10) : 10;
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            this.prisma.interviewFeedback.findMany({
                where: {
                    from: FeedbackFrom.candidate,
                    session: {
                        agency_id: agencyId
                    }
                },
                include: {
                    session: {
                        include: {
                            invitation_token: {
                                include: {
                                    candidate: {
                                        select: { candidate_name: true, f_name: true, l_name: true }
                                    },
                                    invitation: {
                                        include: {
                                            job: {
                                                select: { title: true }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    created_at: 'desc'
                },
                skip,
                take: limit,
            }),
            this.prisma.interviewFeedback.count({
                where: {
                    from: FeedbackFrom.candidate,
                    session: {
                        agency_id: agencyId
                    }
                }
            })
        ]);

        const total_pages = Math.ceil(total / limit);

        const mappedItems = items.map(item => ({
            id: item.id,
            rating: item.rating,
            comment: item.comment,
            created_at: item.created_at,
            candidate: {
                name: (item.session as any)?.invitation_token?.candidate?.candidate_name || 
                      ((item.session as any)?.invitation_token?.candidate?.f_name + ' ' + (item.session as any)?.invitation_token?.candidate?.l_name).trim() || 
                      'Unknown Candidate',
                image_url: null, // Candidate model doesn't have image_url
            },
            job_title: (item.session as any)?.invitation_token?.invitation?.job?.title || 'Unknown Job',
            session_id: item.session_id
        }));

        return {
            items: mappedItems,
            meta: {
                total,
                page,
                limit,
                total_pages,
                has_next_page: page < total_pages,
                has_previous_page: page > 1,
            }
        };
    }

    private async getAgencyId(accountId: number): Promise<number> {
        const account = await this.prisma.account.findUnique({
            where: { id: accountId },
            include: { teamMember: { include: { team: { include: { agency: true } } } } },
        });

        if (!account) {
            throw new NotFoundException("Agency account not found");
        }

        const agencyId = account.teamMember?.team?.agency?.id ?? account.agency_id;
        if (agencyId === null || agencyId === undefined) {
            throw new NotFoundException("Agency ID not found for this account");
        }
        return agencyId;
    }
}
