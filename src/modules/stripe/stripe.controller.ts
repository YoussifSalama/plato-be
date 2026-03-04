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
        }

        return { received: true };
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

        const now = new Date();
        // Stripe Subscriptions manages dates, but for now we set a 30 day local end date
        // If you integrate deeper with Stripe billing periods, you can extract `current_period_end`
        // from a `invoice.payment_succeeded` event or `customer.subscription.updated` event down the line.
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await this.prisma.agencySubscription.upsert({
            where: { agency_id: agencyId },
            update: {
                plan_id: plan.id,
                used_interview_sessions: 0,
                used_resume_analysis: 0,
                used_job_posting: 0,
                start_date: now,
                end_date: endDate,
                is_active: true,
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: stripeSubscriptionId,
            },
            create: {
                agency_id: agencyId,
                plan_id: plan.id,
                used_interview_sessions: 0,
                used_resume_analysis: 0,
                used_job_posting: 0,
                start_date: now,
                end_date: endDate,
                is_active: true,
                stripe_customer_id: stripeCustomerId,
                stripe_subscription_id: stripeSubscriptionId,
            },
        });

        this.logger.log(`Successfully upgraded agency ${agencyId} to plan ${planId} via Stripe checkout.`);
    }
}
