import { Controller, Post, Headers, Req, BadRequestException, Logger } from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from './stripe.service';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import Stripe from 'stripe';

@Controller('stripe')
export class StripeController {
    private readonly logger = new Logger(StripeController.name);

    constructor(
        private readonly stripeService: StripeService,
        private readonly prisma: PrismaService,
    ) { }

    @Post('webhook')
    async handleWebhook(
        @Headers('stripe-signature') signature: string,
        @Req() req: Request,
    ) {
        if (!signature) {
            throw new BadRequestException('Missing stripe-signature header');
        }

        let event: Stripe.Event;

        try {
            // Access the raw body for signature validation.
            // With rawBody: true in main.ts, the unparsed buffer is available on req.rawBody
            const rawBody = (req as any).rawBody || req.body;
            event = this.stripeService.constructEvent(rawBody, signature);
        } catch (err: any) {
            this.logger.error(`Webhook signature verification failed: ${err.message}`);
            throw new BadRequestException(`Webhook Error: ${err.message}`);
        }

        // Handle the checkout.session.completed event
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            await this.handleCheckoutSessionCompleted(session);
        } else if (event.type === 'customer.subscription.updated') {
            const subscription = event.data.object as Stripe.Subscription;
            await this.handleSubscriptionUpdated(subscription);
        } else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object as Stripe.Subscription;
            await this.handleSubscriptionDeleted(subscription);
        }

        return { received: true };
    }

    private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
        let trialEndDate: Date | null = null;
        let isActive = true;

        if (subscription.status === 'trialing' && subscription.trial_end) {
            trialEndDate = new Date(subscription.trial_end * 1000);
        }
        if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
            isActive = false;
        }

        const updateData: any = {
            trial_end_date: trialEndDate,
            is_active: isActive,
        };

        if ((subscription as any).current_period_start) {
            updateData.start_date = new Date((subscription as any).current_period_start * 1000);
        }

        if ((subscription as any).current_period_end) {
            updateData.end_date = new Date((subscription as any).current_period_end * 1000);
        }

        // Find the subscription by stripe_subscription_id
        const existingSub = await this.prisma.agencySubscription.findFirst({
            where: { stripe_subscription_id: subscription.id },
            select: { id: true, agency_id: true }
        });

        if (!existingSub) {
            this.logger.warn(`Received subscription update for unknown subscription ID: ${subscription.id}`);
            return;
        }

        await this.prisma.agencySubscription.update({
            where: { id: existingSub.id },
            data: updateData
        });

        this.logger.log(`Updated agency ${existingSub.agency_id} subscription status: ${subscription.status}`);
    }

    private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
        // Find the subscription by stripe_subscription_id
        const existingSub = await this.prisma.agencySubscription.findFirst({
            where: { stripe_subscription_id: subscription.id },
            select: { id: true, agency_id: true }
        });

        if (!existingSub) {
            this.logger.warn(`Received subscription deletion for unknown subscription ID: ${subscription.id}`);
            return;
        }

        await this.prisma.agencySubscription.delete({
            where: { id: existingSub.id }
        });

        this.logger.log(`Deleted agency ${existingSub.agency_id} subscription because it was canceled in Stripe.`);
    }

    private async handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
        const agencyIdStr = session.metadata?.agency_id;
        const planIdStr = session.metadata?.plan_id;
        const stripeCustomerId = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        if (!agencyIdStr || !planIdStr) {
            this.logger.warn('Session completed but missing agency_id or plan_id in metadata');
            return;
        }

        const agencyId = parseInt(agencyIdStr, 10);
        const planId = parseInt(planIdStr, 10);

        const plan = await this.prisma.subscriptionPlan.findUnique({
            where: { id: planId },
        });

        if (!plan) {
            this.logger.error(`Plan with ID ${planId} not found during webhook processing`);
            return;
        }

        // Check if there is an existing Stripe subscription for this agency
        // If they just created a new one, we must cancel the old one to prevent double billing!
        const existingSub = await this.prisma.agencySubscription.findUnique({
            where: { agency_id: agencyId },
        });

        if (
            existingSub &&
            existingSub.stripe_subscription_id &&
            existingSub.stripe_subscription_id !== stripeSubscriptionId
        ) {
            try {
                await this.stripeService.cancelSubscription(existingSub.stripe_subscription_id);
                this.logger.log(`Canceled previous Stripe subscription ${existingSub.stripe_subscription_id} for agency ${agencyId} because they upgraded/downgraded.`);
            } catch (error: any) {
                this.logger.error(`Failed to cancel previous Stripe subscription ${existingSub.stripe_subscription_id}: ${error.message}`);
            }
        }

        let trialEndDate: Date | null = null;
        let isActive = true;
        let startDate = new Date();
        // By default, assume a 30 day cycle if Stripe fetch fails
        let endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

        if (stripeSubscriptionId) {
            try {
                const subscription = await this.stripeService.getSubscription(stripeSubscriptionId);
                // If it's a trial, Stripe returns trial_end as a Unix timestamp (seconds)
                if (subscription.status === 'trialing' && subscription.trial_end) {
                    trialEndDate = new Date(subscription.trial_end * 1000);
                }
                if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
                    isActive = false;
                }

                if ((subscription as any).current_period_start) {
                    startDate = new Date((subscription as any).current_period_start * 1000);
                }
                if ((subscription as any).current_period_end) {
                    endDate = new Date((subscription as any).current_period_end * 1000);
                }
            } catch (error: any) {
                this.logger.error(`Failed to fetch subscription details: ${error.message}`);
            }
        }

        await this.prisma.agencySubscription.upsert({
            where: { agency_id: agencyId },
            update: {
                plan_id: plan.id,
                used_interview_sessions: 0,
                used_resume_analysis: 0,
                used_job_posting: 0,
                start_date: startDate,
                end_date: endDate,
                trial_end_date: trialEndDate,
                is_active: isActive,
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: stripeSubscriptionId,
            },
            create: {
                agency_id: agencyId,
                plan_id: plan.id,
                used_interview_sessions: 0,
                used_resume_analysis: 0,
                used_job_posting: 0,
                start_date: startDate,
                end_date: endDate,
                trial_end_date: trialEndDate,
                is_active: isActive,
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: stripeSubscriptionId,
            },
        });

        this.logger.log(`Successfully upgraded agency ${agencyId} to plan ${planId} via Stripe checkout.`);
    }
}
