import sql from 'mssql';
import axios from 'axios';
import dotenv from 'dotenv';
import moment from 'moment';
import dbConfig, { connectDB } from '../config/dbConfig.js';
dotenv.config();
const router = Router();
// M-Pesa API details from .env
const {
    MPESA_SHORTCODE,
    MPESA_PASSKEY,
    MPESA_CONSUMER_KEY,
    MPESA_CONSUMER_SECRET,
    MPESA_CALLBACK_URL
} = process.env;

// Helper function to get M-Pesa access token
const getAccessToken = async () => {
    const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
    const url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting M-Pesa access token:', error.message);
        throw new Error('Failed to get M-Pesa access token');
    }
};

/**
 * Initiates the M-Pesa STK Push payment process.
 * Requires: residentId, amount, phoneNumber
 */
export const stkPush = async (req, res) => {
    const { residentId, amount, phoneNumber } = req.body;

    if (!residentId || !amount || !phoneNumber) {
        return res.status(400).json({ message: 'Missing required fields: residentId, amount, and phoneNumber.' });
    }

    try {
        const accessToken = await getAccessToken();
        const timestamp = moment().format('YYYYMMDDHHmmss');
        const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

        const stkUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

        const stkPayload = {
            BusinessShortCode: MPESA_SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: phoneNumber,
            PartyB: MPESA_SHORTCODE,
            PhoneNumber: phoneNumber,
            CallBackURL: MPESA_CALLBACK_URL,
            AccountReference: residentId.toString(), // Use residentId as reference
            TransactionDesc: `Payment for Resident ID: ${residentId}`,
        };

        const mpesaResponse = await axios.post(stkUrl, stkPayload, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        const {
            ResponseCode,
            ResponseDescription,
            CustomerMessage,
            CheckoutRequestID,
            MerchantRequestID
        } = mpesaResponse.data;

        if (ResponseCode === '0') {
            // Save initial request details to the database (Payment table)
            await sql.connect(dbConfig);
            await sql.query`
                INSERT INTO Payments (ResidentID, Amount, PaymentDate, PaymentStatus, MpesaCheckoutRequestID, MpesaMerchantRequestID)
                VALUES (${residentId}, ${amount}, GETDATE(), 'Pending', ${CheckoutRequestID}, ${MerchantRequestID})
            `;

            res.status(200).json({
                success: true,
                message: 'STK Push initiated successfully. Please complete the transaction on your phone.',
                CheckoutRequestID,
            });
        } else {
            res.status(400).json({
                success: false,
                message: ResponseDescription || 'STK Push failed to initiate.',
                details: CustomerMessage,
            });
        }
    } catch (error) {
        console.error('STK Push Error:', error);
        res.status(500).json({ message: 'Internal Server Error during STK push initiation.' });
    }
};

/**
 * Handles the M-Pesa Callback (Confirmation URL).
 * This endpoint is hit by Safaricom once the user completes the STK transaction.
 */
export const handleCallback = async (req, res) => {
    const callbackData = req.body;
    console.log('M-Pesa Callback Received:', JSON.stringify(callbackData, null, 2));

    try {
        const { Body } = callbackData;
        const { stkCallback } = Body || {};
        const {
            MerchantRequestID,
            CheckoutRequestID,
            ResultCode,
            ResultDesc,
            CallbackMetadata
        } = stkCallback || {};

        let paymentStatus = 'Failed';
        let transactionCode = null;

        if (ResultCode === 0) {
            paymentStatus = 'Completed';
            const item = CallbackMetadata.Item.find(i => i.Name === 'MpesaReceiptNumber');
            transactionCode = item ? item.Value : null;
        } else if (ResultCode === 1032) {
            paymentStatus = 'Cancelled';
        }

        // Update the database record using CheckoutRequestID
        await sql.connect(dbConfig);
        await sql.query`
            UPDATE Payments
            SET
                PaymentStatus = ${paymentStatus},
                MpesaReceiptNumber = ${transactionCode},
                MpesaResponseData = ${JSON.stringify(callbackData)},
                PaymentDate = GETDATE()
            WHERE
                MpesaCheckoutRequestID = ${CheckoutRequestID}
        `;

        // Safaricom expects a success response immediately
        res.status(200).json({ "ResultCode": 0, "ResultDesc": "Callback processed successfully." });

    } catch (error) {
        console.error('M-Pesa Callback Processing Error:', error);
        // Still return a 200 to Safaricom to prevent repeated callbacks
        res.status(200).json({ "ResultCode": 0, "ResultDesc": "Internal error, but acknowledged." });
    }
};

/**
 * Allows a client to check the status of a specific payment request by its ID.
 * Requires: checkoutRequestId
 */
export const verifyPayment = async (req, res) => {
    const { checkoutRequestId } = req.params; // Using params for GET request

    if (!checkoutRequestId) {
        return res.status(400).json({ message: 'Missing required parameter: checkoutRequestId.' });
    }

    try {
        await sql.connect(dbConfig);
        const result = await sql.query`
            SELECT
                PaymentID,
                ResidentID,
                Amount,
                PaymentDate,
                PaymentStatus,
                MpesaReceiptNumber
            FROM
                Payments
            WHERE
                MpesaCheckoutRequestID = ${checkoutRequestId}
        `;

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Payment request not found.' });
        }

        const payment = result.recordset[0];
        res.status(200).json({
            success: true,
            status: payment.PaymentStatus,
            paymentDetails: payment
        });

    } catch (error) {
        console.error('Verify Payment Error:', error);
        res.status(500).json({ message: 'Internal Server Error while verifying payment status.' });
    }
};
export default router;