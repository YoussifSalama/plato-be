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
            apiVersion: '2026-02-25.clover', // Use a recent compatible API version
        });
    }

    async createCheckoutSession(
        agencyId: number,
        planId: number,
        successUrl: string,
        cancelUrl: string,
        customerEmail?: string,
        stripeCustomerId?: string | null,
        hasHadTrial: boolean = false,
    ): Promise<{ url: string | null }> {
        try {
            // Map database Plan ID to Stripe Product ID and Unit Amount (in cents)
            let unitAmount = 1000;
            let stripeProductId = 'prod_U4WhJprfP9W6Lz'; // Default to plan 1

            if (planId === 1) {
                unitAmount = 1000;
                stripeProductId = 'prod_U4WhJprfP9W6Lz';
            } else if (planId === 2) {
                unitAmount = 2000;
                stripeProductId = 'prod_U6JWiGbF0Zdiwy';
            } else if (planId === 3) {
                unitAmount = 3000;
                stripeProductId = 'prod_U6JXyVDjXoxm55';
            }

            // Create a checkout session
            const sessionConfig: Stripe.Checkout.SessionCreateParams = {
                payment_method_types: ['card'],
                mode: 'subscription',
                line_items: [
                    {
                        price_data: {
                            currency: 'eur',
                            product: stripeProductId,
                            unit_amount: unitAmount,
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
            };

            if (!hasHadTrial) {
                sessionConfig.subscription_data = {
                    trial_period_days: 14,
                };
            }

            // If we already have a customer ID on file, use it to retain billing history
            if (stripeCustomerId) {
                sessionConfig.customer = stripeCustomerId;
            } else if (customerEmail) {
                sessionConfig.customer_email = customerEmail;
            }

            const session = await this.stripe.checkout.sessions.create(sessionConfig);

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

    async getSubscription(subscriptionId: string) {
        return this.stripe.subscriptions.retrieve(subscriptionId);
    }

    async cancelSubscription(subscriptionId: string) {
        return this.stripe.subscriptions.cancel(subscriptionId);
    }

    async getCustomerInvoices(customerId: string) {
        try {
            const invoices = await this.stripe.invoices.list({
                customer: customerId,
                limit: 12, // Get last 12 invoices
            });

            return invoices.data.map(invoice => ({
                id: invoice.id,
                amount_paid: invoice.amount_paid,
                status: invoice.status,
                created: invoice.created,
                invoice_pdf: invoice.invoice_pdf,
                hosted_invoice_url: invoice.hosted_invoice_url,
                currency: invoice.currency,
            }));
        } catch (error) {
            this.logger.error(`Error fetching invoices for customer ${customerId}`, error);
            throw new Error('Failed to fetch billing history');
        }
    }
}
