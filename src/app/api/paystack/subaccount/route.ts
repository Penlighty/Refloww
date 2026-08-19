import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { business_name, settlement_bank, account_number, percentage_charge } = body;

        const secretKey = process.env.PAYSTACK_SECRET_KEY || 'sk_test_221afeafa90d3cac87407956963d8ebb3fa2ae87';

        if (!secretKey || secretKey.startsWith('your_')) {
            return NextResponse.json(
                { status: false, message: 'Paystack Secret Key is not properly configured in .env.local' },
                { status: 400 }
            );
        }

        const response = await fetch('https://api.paystack.co/subaccount', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                business_name: business_name || 'Storefront Vendor',
                settlement_bank: settlement_bank || '058',
                account_number: account_number,
                percentage_charge: percentage_charge || 2.4,
                description: `Storefront Payout Subaccount for ${business_name || 'Vendor'}`,
            }),
        });

        const data = await response.json();

        if (!response.ok || !data.status) {
            console.error('Paystack Subaccount Error:', data);
            return NextResponse.json(
                { status: false, message: data.message || 'Failed to create Paystack subaccount' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            status: true,
            subaccount_code: data.data.subaccount_code,
            details: data.data,
        });
    } catch (error: any) {
        console.error('Paystack Subaccount Exception:', error);
        return NextResponse.json(
            { status: false, message: error.message || 'Server error provisioning Paystack subaccount' },
            { status: 500 }
        );
    }
}
