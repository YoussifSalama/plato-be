import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
    private readonly stripe: Stripe;
    private readonly logger = new Logger(StripeService.name);

    constructor(private readonly configService: ConfigService) {
        const secretKey = this.configService.get<string>('env.stripe.secretKey');
        if (!secretKey) {
            this.logger.warn('Stripe secret key is not defined. Stripe functionalities will fail.');
        }
        this.stripe = new Stripe(secretKey || '', {
            apiVersion: '2025-02-24.acacia', // Use a recent compatible API version
        });
    }

    async createCheckoutSession(
        agencyId: number,
        planId: number,
        successUrl: string,
        cancelUrl: string,
        customerEmail?: string,
    ): Promise<{ url: string | null }> {
        try {
            // Create a checkout session
            const session = await this.stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                mode: 'subscription',
                customer_email: customerEmail,
                // Using a generic item since dynamic pricing based on planId isn't fully defined yet 
                // with Stripe Price IDs in the Plan Model. We'll need a way to map planId to Stripe Price ID.
                // For now, placing metadata to identify the intent
                line_items: [
                    {
                        // IMPORTANT: In a real integration, you MUST replace this with the actual Price ID 
                        // string created in your Stripe Dashboard matching the desired `planId`.
                        // Example: price: 'price_1MotwRLkdIwHu7ixYcPLm5uZ', 
                        // price: 'REPLACE_WITH_STRIPE_PRICE_ID', // Replace with dynamic logic based on planId
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: `Subscription Plan ${planId}`,
                            },
                            unit_amount: 1000, // Replace this logic to use actual plan price
                            recurring: {
                                interval: 'month'
                            }
                        },
                        quantity: 1,
                    },
                ],
                success_url: successUrl,
                cancel_url: cancelUrl,
                client_reference_id: agencyId.toString(),
                metadata: {
                    agency_id: agencyId.toString(),
                    plan_id: planId.toString(),
                },
            });

            return { url: session.url };
        } catch (error) {
            this.logger.error('Error creating Stripe checkout session', error);
            throw error;
        }
    }

    constructEvent(payload: string | Buffer, signature: string): Stripe.Event {
        const webhookSecret = this.configService.get<string>('env.stripe.webhookSecret');
        if (!webhookSecret) {
            throw new Error('Stripe webhook secret is missing.');
        }
        return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }
}
