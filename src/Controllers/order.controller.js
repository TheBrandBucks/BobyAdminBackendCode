import { AsyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/APIErrorStandarize.js"
import { ApiResponse } from "../utils/APIRespStandarize.js";
import nodemailer from "nodemailer";
import { stripe } from "../config/stripe.js";
import { prisma } from "../config/prismaClient.js";

// --- Helper function for sending order status emails ---
const sendOrderStatusEmail = async (customerEmail, customerName, orderId, orderStatus, orderDetails) => {
  let orderId8 = orderId.slice(0, 8);
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false, // true for port 465, false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // EMAIL_HOST=smtp.gmail.com
    // EMAIL_PORT=587
    // EMAIL_USER=gulukwl123@gmail.com
    // EMAIL_PASS=ukzbkbthnxhcahyx
    // TO_EMAIL=gulukwl123@gmail.com
    let subject = "";
    let emailContent = "";

    switch (orderStatus) {
      case "pending":
        subject = `Your Order #${orderId8} is Pending Confirmation`;
        emailContent = `
Dear ${customerName},

Thank you for your order! Your order #${orderId8} has been received and is currently **pending confirmation**.

We will review your request shortly and provide an update.

Order Details:
Total Per Service: $${orderDetails.totalPerService}
Billing City: ${orderDetails.billingCity}
Additional Instructions: ${orderDetails.additionalInstructions || 'N/A'}

If you have any questions, please contact us.

Best regards,
Up Biz Media
`;
        break;
      case "in_Review":
        subject = `Your Order #${orderId8} is Now In Review`;
        emailContent = `
Dear ${customerName},

Great news! Your order #${orderId8} is now **in Review**.

We are actively working on fulfilling your request. You will receive another notification once your order is fulfilled.

Order Details:

Total Per Service: $${orderDetails.totalPerService}
Billing City: ${orderDetails.billingCity}
Additional Instructions: ${orderDetails.additionalInstructions || 'N/A'}

Thank you for your patience!

Best regards,
Up Biz media
`;
        break;
      case "in_progress":
        subject = `Update: Your Order #${orderId8} is Now In Progress!`;
        emailContent = `
Dear ${customerName},

Great news! Your order #${orderId8} is now **in progress**.

We are actively working on fulfilling your request. You will receive another notification once your order is fulfilled.

Order Details:

Total Per Service: $${orderDetails.totalPerService}
Billing City: ${orderDetails.billingCity}
Additional Instructions: ${orderDetails.additionalInstructions || 'N/A'}

Thank you for your patience!

Best regards,
Up Biz media
`;
        break;
      case "confirmed":
        subject = `Update: Your Order #${orderId8} is Now confirmed we will start work on it and will Update you!`;
        emailContent = `
Dear ${customerName},

Great news! Your order #${orderId8} is Now confirmed we will start work on it and will Update you!.

We are actively working on fulfilling your request. You will receive another notification once your order is fulfilled.

Order Details:

Total Per Service: $${orderDetails.totalPerService}
Additional Instructions: ${orderDetails.additionalInstructions || 'N/A'}

Thank you for your patience!

Best regards,
Up Biz media
`;
        break;
      case "fulfilled":
        subject = `Success! Your Order #${orderId8} has been Fulfilled!`;
        emailContent = `
Dear ${customerName},

Your order #${orderId8} has been successfully **fulfilled**!

We hope you are satisfied with your service.

Order Details:

Total Per Service: $${orderDetails.totalPerService}
Billing City: ${orderDetails.billingCity}
Additional Instructions: ${orderDetails.additionalInstructions || 'N/A'}

If you have any feedback or further needs, please don't hesitate to reach out.

Best regards,
Upbiz Media
`;
        break;
      case "cancelled":
        subject = `Notice: Your Order #${orderId8} has been Cancelled`;
        emailContent = `
Dear ${customerName},

We regret to inform you that your order #${orderId8} has been **cancelled** and Payment is Refunded.

Order Details:

Total Per Service: $${orderDetails.totalPerService}
Billing City: ${orderDetails.billingCity}
Additional Instructions: ${orderDetails.additionalInstructions || 'N/A'}

If you believe this was a mistake or wish to discuss reinstating your order, please contact our support team.

Best regards,  
Upbiz Media
`;
        break;

      default:
        // For any other status, you might send a generic update or skip email
        console.log(`No specific email template for order status: ${orderStatus}`);
        return; // Exit if no matching status
    }

    const mailOptions = {
      from: `Company Name <${process.env.EMAIL_USER}>`, // Or a specific 'no-reply' email
      to: customerEmail,
      subject: subject,
      text: emailContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Order status email sent to ${customerEmail} for order #${orderId8} (Status: ${orderStatus})`);
  } catch (error) {
    console.error("Failed to send order status email:", error);
    // You might want to log this error but not necessarily throw it,
    // so the main controller flow isn't interrupted.
  }
};
//---> Prisma <---
const AddOrder = AsyncHandler(async (req, res, next) => {
  const {
    full_name,
    email_address,
    phone_number,
    cardholder_name,
    additional_instructions,
    billing_city,
    selected_country,
    billing_address,
    selected_services,
    selected_plan,
    one_time_total,
    recurring_total,
    final_invoice_total,
    paymentMethodId,
  } = req.body;
  console.log("Data from frontend:", req.body);
  const userId = req.user?.id; // UUID from Supabase/Auth

  // ---- Validations ----
  const requiredStringFields = [
    email_address,
    phone_number,
    cardholder_name,
    billing_address,
    paymentMethodId,
  ];

  if (requiredStringFields.some(field => typeof field !== "string" || field.trim() === "")) {
    throw new ApiError(400, "All required string fields must be non-empty.");
  }

  if (![one_time_total, recurring_total, final_invoice_total].every(n => typeof n === "number" && !isNaN(n))) {
    throw new ApiError(400, "Numeric fields must be valid numbers.");
  }

  // if (!Array.isArray(selected_services) || selected_services.length === 0) {
  //   throw new ApiError(400, "selected services must be a non-empty array.");
  // }

  // ---- Stripe Payment ----
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(final_invoice_total * 100),
    currency: "usd",
    payment_method: paymentMethodId,
    confirm: true,
    description: `Charge for ${email_address}`,
  });

  if (paymentIntent.status !== "succeeded") {
    throw new ApiError(400, "Payment failed. Please try again.");
  }



  // ---- Prisma Insert ---- \\
  try {
    const newOrder = await prisma.orders.create({
      data: {
        full_name: full_name || "",//*
        email_address,//*
        phone_number,//*
        selected_country: selected_country || "",//*
        additional_instructions: additional_instructions || "",
        billing_address,//*
        billing_city: billing_city || "",//*
        status: "pending",
        selected_services: selected_services || [],//*
        selected_plan: selected_plan || null,
        one_time_total: one_time_total || 0,//*
        recurring_total: one_time_total || 0,//*
        final_invoice_total,//*
        cardholder_name,//*
        user_id: userId || null,
        payment_id: paymentIntent.id,
        payment_history: [
          //1st time user pay at the time of order place
          {
            type: "initial",
            amount: final_invoice_total,
            paymentIntentId: paymentIntent.id,
            createdAt: new Date(),
          },
        ],
        total_paid: final_invoice_total,
      },
    });

    console.log("Placed Order (Prisma):", newOrder);

    // ---- Send Order Email ----
    await sendOrderStatusEmail(
      email_address,
      full_name,
      newOrder.id,
      newOrder.status,
      {
        totalPerService: final_invoice_total,
        billingCity: billing_city,
        additionalInstructions: additional_instructions,
      }
    );

    return res
      .status(201)
      .json(new ApiResponse(200, newOrder, "Order placed & payment successful"));
  }
  catch (err) {
    console.error(" Failed to create order:", err);
    throw new ApiError(500, `Failed to create order: ${err.message}`);
  }
});


// Prisma
const OrdersList = AsyncHandler(async (req, res) => {
  try {
    const orders = await prisma.orders.findMany({
      orderBy: { created_at: "desc" },
      include: {
        user: {
          select: {
            email: true, // sirf email fetch karna
          },
        },
      },
    });
    console.log("Orders from Db", orders);
    return res
      .status(200)
      .json(new ApiResponse(200, orders, "Orders fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to fetch orders");
  }
});

// Prisma
const OrdersListByUser = AsyncHandler(async (req, res) => {
  const userId = req.user?.id; // JWT middleware se aata hai

  if (!userId) {
    throw new ApiError(401, "Unauthorized: User ID not found");
  }

  try {
    // Fetch orders by userId
    const orders = await prisma.orders.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        created_at: "desc",
      },
      include: {
        user: {
          select: {
            email: true, // sirf email fetch karna
          },
        },
      },
    });

    console.log("Particular User orders details:", orders);

    return res.status(200).json(
      new ApiResponse(200, orders, "User's orders fetched successfully")
    );
  } catch (error) {
    console.error("Error fetching user's orders:", error);
    throw new ApiError(500, "Failed to fetch user's orders");
  }
});



// Prisma 
const getSingleOrder = AsyncHandler(async (req, res) => {
  const { orderId } = req.params;
  console.log("Order Id:", orderId);

  try {
    const order = await prisma.orders.findUnique({
      where: {
        id: orderId, // UUID hai toh string as it is pass hoga
      },
    });

    console.log("Order from Prisma:", order);

    if (!order) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, "Order not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, order, "Order fetched successfully"));
  } catch (error) {
    console.error("Error fetching order:", error);
    throw new ApiError(500, "Failed to fetch order");
  }
});


// Prisma
const deleteSingleOrder = AsyncHandler(async (req, res) => {
  const orderId = req.params.orderId;

  // Step 1: Fetch existing order
  const existingOrder = await prisma.orders.findUnique({
    where: { id: orderId },
  });

  if (!existingOrder) {
    throw new ApiError(404, "Order not found");
  }

  // Step 2: Refund all non-refunded payments (initial + upgrades)
  // Refund only if order_status is 'pending'||'canceled'
  /*
  if (existingOrder.status === "pending" || existingOrder.status === "cancelled") {
    // Prisma me JSON field stringified hota hai, toh parse karna zaroori hai
    const paymentHistory = Array.isArray(existingOrder.payment_history)
      ? existingOrder.payment_history
      : JSON.parse(existingOrder.payment_history || "[]");

    for (const payment of paymentHistory) {
      if ((payment.type === "initial" || payment.type === "upgrade") && !payment.refundId) {
        try {
          await stripe.refunds.create({
            payment_intent: payment.paymentIntentId,
            amount: Math.round(payment.amount * 100), // refund full amount
            metadata: {
              orderId,
              type: "order_delete_refund",
            },
          });
        } catch (err) {
          console.error(
            `Refund failed for paymentIntent ${payment.paymentIntentId}:`,
            err.message
          );
        }
      }
    }
  } else {
    console.log(`Order ${orderId} status is '${existingOrder.status}', skipping refund.`);
  }
*/
  // Step 3: Delete order from DB using Prisma
  await prisma.orders.delete({
    where: { id: orderId },
  });

  return res.status(200).json(
    new ApiResponse(200, null, "Order deleted successfully")
  );
});


//Production grade code for delet order and refund

{/*
const deleteSingleOrder = AsyncHandler(async (req, res) => {
  const orderId = req.params.orderId;

  // Step 1: Fetch order
  const existingOrder = await prisma.orders.findUnique({
    where: { id: orderId },
  });

  if (!existingOrder) throw new ApiError(404, "Order not found");

  // Step 2: Refund only if order is pending or canceled
  if (["pending", "canceled"].includes(existingOrder.status)) {
    let paymentHistory = [];

    try {
      paymentHistory = Array.isArray(existingOrder.payment_history)
        ? existingOrder.payment_history
        : JSON.parse(existingOrder.payment_history || "[]");
    } catch (err) {
      console.error("Failed to parse payment_history JSON:", err.message);
      paymentHistory = [];
    }

    // Use a DB transaction for safety
    await prisma.$transaction(async (tx) => {
      for (const payment of paymentHistory) {
        if (
          (payment.type === "initial" || payment.type === "upgrade") &&
          !payment.refundId
        ) {
          try {
            const refund = await stripe.refunds.create(
              {
                payment_intent: payment.paymentIntentId,
                amount: Math.round(payment.amount * 100),
                metadata: {
                  orderId,
                  refundType: "order_delete_refund",
                },
              },
              { idempotencyKey: `refund_${payment.paymentIntentId}` } // Prevent double refund
            );

            // Update local payment record with refund info
            payment.refundId = refund.id;
            payment.refundedAt = new Date().toISOString();
          } catch (err) {
            console.error(
              `Refund failed for paymentIntent ${payment.paymentIntentId}:`,
              err.message
            );

            // Optional: record failed refund for manual review
            await tx.failedRefunds.create({
              data: {
                orderId,
                paymentIntentId: payment.paymentIntentId,
                error: err.message,
              },
            });
          }
        }
      }

      // Update the order’s payment history with refund info before deleting
      await tx.orders.update({
        where: { id: orderId },
        data: { payment_history: JSON.stringify(paymentHistory) },
      });

      // Finally, delete the order
      await tx.orders.delete({
        where: { id: orderId },
      });
    });
  } else {
    console.log(
      `Order ${orderId} status is '${existingOrder.status}', skipping refund.`
    );

    await prisma.orders.delete({
      where: { id: orderId },
    });
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, null, "Order deleted successfully (refunds handled if applicable)")
    );
});
*/
}




// --- Updated Controller ---
//mongoose
// const updateOrderDetails = AsyncHandler(async (req, res, next) => {
//   const {
//     fullName,
//     emailAddress,
//     phoneNumber,
//     selectedCountry,
//     additionalInstructions,
//     billingAddress,
//     billingCity,
//     orderStatus,
//     selectedFrequency,
//     selectedPackage,
//     selectedWeek,
//     totalPerService, // new target price (dollars)
//     totalSize,
//     cardholderName,
//     paymentMethodId, // Stripe payment method (used for upgrades)
//     serviceStartOption,
//   } = req.body;

//   const orderId = req.params.editingOrderId;
//   if (!orderId) throw new ApiError(400, "Order ID is required");

//   // Basic validation (simplified)
//   const requiredStrings = [
//     emailAddress,
//     phoneNumber,
//     cardholderName,
//     typeof selectedFrequency === "object" ? selectedFrequency.frequency : selectedFrequency,
//     selectedPackage,
//     billingAddress,
//     serviceStartOption,
//   ];
//   if (requiredStrings.some(f => !f || typeof f !== "string" || f.trim() === "")) {
//     throw new ApiError(400, "All required string fields must be non-empty and valid.");
//   }
//   if (typeof totalPerService !== "number" || isNaN(totalPerService) || typeof totalSize !== "number" || isNaN(totalSize)) {
//     throw new ApiError(400, "Numeric fields must be valid numbers.");
//   }
//   if (!Array.isArray(selectedWeek) || selectedWeek.length === 0) {
//     throw new ApiError(400, "selectedWeek must be a non-empty array.");
//   }

//   // Fetch existing order
//   const existingOrder = await Order.findById(orderId);
//   if (!existingOrder) {
//     throw new ApiError(404, "Order not found");
//   }

//   const oldOrderStatus = existingOrder.orderStatus;

//   // Determine price delta
//   const previousPrice = existingOrder.totalPerService || 0; // in dollars
//   const newPrice = totalPerService; // updated desired totalPerService in dollars

//   // Keep track of what happens
//   let chargeRecord = null;
//   let refundRecord = null;
//   let netPaid = existingOrder.totalPaid ?? 0; // current effective paid amount

//   // === UPGRADE: newPrice > previousPrice ===
//   if (newPrice > previousPrice) {
//     const delta = newPrice - previousPrice; // how much extra to charge

//     //delta ---> woh price he jo customer ko new pay krni ho gi

//     if (!paymentMethodId) {
//       throw new ApiError(400, "Payment method required for upgrade.");
//     }

//     // Create PaymentIntent to charge difference
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: Math.round(delta * 100), // cents
//       currency: "usd",
//       payment_method: paymentMethodId,
//       confirm: true,
//       off_session: true,
//       description: `Upgrade charge for order ${orderId}`,
//       metadata: {
//         orderId: orderId,
//         type: "upgrade",
//         previousPrice,
//         newPrice,
//       },
//     });

//     if (paymentIntent.status !== "succeeded") {
//       throw new ApiError(400, "Upgrade payment failed.");
//     }

//     // Record upgrade charge
//     chargeRecord = {
//       type: "upgrade",
//       amount: delta, // in dollars
//       paymentIntentId: paymentIntent.id,
//       createdAt: new Date(),
//     };
//     netPaid += delta;
//   }
//   // === DOWNGRADE: newPrice < previousPrice ===
//   else if (newPrice < previousPrice) {
//     const difference = previousPrice - newPrice; // amount to refund

//     // Find latest successful charge to refund against (prefer the most recent non-refunded)
//     // This logic could be adapted if you store paymentIntent chain; here we refund the last upgrade/initial
//     const lastCharge = (existingOrder.paymentHistory || [])
//       .filter(h => h.type === "initial" || h.type === "upgrade")
//       .reverse()
//       .find(h => !h.refundId); // not already refunded

//     if (!lastCharge || !lastCharge.paymentIntentId) {
//       throw new ApiError(500, "No valid previous charge found to refund.");
//     }
//     console.log("Last charge ki base per hi refunding ho gi:", lastCharge)

//     const refund = await stripe.refunds.create({
//       payment_intent: lastCharge.paymentIntentId,
//       amount: Math.round(difference * 100),
//       metadata: {
//         orderId,
//         type: "downgrade",
//         previousPrice,
//         newPrice,
//       },
//     });

//     // Record refund
//     refundRecord = {
//       type: "downgrade",
//       amount: difference, // dollars
//       paymentIntentId: lastCharge.paymentIntentId,
//       refundId: refund.id,
//       createdAt: new Date(),
//     };
//     netPaid -= difference;
//   }
//   // === same price: nothing to do for payment ===

//   // Prepare update fields
//   const updateFields = {
//     fullName,
//     emailAddress,
//     phoneNumber,
//     selectedCountry,
//     additionalInstructions,
//     billingAddress,
//     billingCity,
//     selectedFrequency,
//     selectedPackage,
//     orderStatus,
//     selectedWeek,
//     totalPerService: newPrice,
//     totalSize,
//     cardholderName,
//     serviceStartOption,
//     totalPaid: netPaid,
//   };

//   // Merge paymentHistory
//   const newHistory = Array.isArray(existingOrder.paymentHistory)
//     ? [...existingOrder.paymentHistory]
//     : [];

//   if (chargeRecord) {
//     newHistory.push(chargeRecord);
//   }
//   if (refundRecord) {
//     newHistory.push(refundRecord);
//   }

//   updateFields.paymentHistory = newHistory;

//   // Persist update
//   const updatedOrder = await Order.findByIdAndUpdate(orderId, { $set: updateFields }, { new: true });
//   console.log("Updated Order from Db:", updatedOrder);
//   if (!updatedOrder) {
//     throw new ApiError(500, "Failed to update Order");
//   }

//   // Send status change email if needed
//   if (updatedOrder.orderStatus && updatedOrder.orderStatus !== oldOrderStatus) {
//     await sendOrderStatusEmail(
//       updatedOrder.emailAddress,
//       updatedOrder.fullName,
//       updatedOrder._id,
//       updatedOrder.orderStatus,
//       {
//         selectedPackage: updatedOrder.selectedPackage,
//         selectedFrequency: updatedOrder.selectedFrequency,
//         totalPerService: updatedOrder.totalPerService,
//         billingCity: updatedOrder.billingCity,
//         additionalInstructions: updatedOrder.additionalInstructions,
//       }
//     );
//   } else if (updatedOrder.orderStatus && !oldOrderStatus) {
//     await sendOrderStatusEmail(
//       updatedOrder.emailAddress,
//       updatedOrder.fullName,
//       updatedOrder._id,
//       updatedOrder.orderStatus,
//       {
//         selectedPackage: updatedOrder.selectedPackage,
//         selectedFrequency: updatedOrder.selectedFrequency,
//         totalPerService: updatedOrder.totalPerService,
//         billingCity: updatedOrder.billingCity,
//         additionalInstructions: updatedOrder.additionalInstructions,
//       }
//     );
//   }

//   return res.status(200).json(new ApiResponse(200, updatedOrder, "Order updated successfully"));
// });


//Supabase
const updateOrderDetails = AsyncHandler(async (req, res, next) => {
  const {
    full_name,
    email_address,
    phone_number,
    cardholder_name,
    additional_instructions,
    billing_city,
    selected_country,
    billing_address,
    final_invoice_total,
    status,//when admin want to update order the he will send
    payment_id,
  } = req.body;
  console.log("Order to update from frontend:", req.body);

  const orderId = req.params.editingOrderId;
  if (!orderId) throw new ApiError(400, "Order ID is required");

  // Basic validation (simplified)
  const requiredStrings = [

    email_address,
    phone_number,
    cardholder_name,

    billing_address,
    payment_id,
    status
  ];
  if (requiredStrings.some(f => !f || typeof f !== "string" || f.trim() === "")) {
    throw new ApiError(400, "All required string fields must be non-empty and valid.");
  }
  // if (typeof total_per_service !== "number" || isNaN(total_per_service)) {
  //   throw new ApiError(400, "Numeric fields must be valid numbers.");
  // }
  // if (!Array.isArray(selected_services) || selected_services.length === 0) {
  //   throw new ApiError(400, "selectedWeek must be a non-empty array.");
  // }

  // Fetch existing order --> prisma
  const existingOrder = await prisma.orders.findUnique({
    where: { id: orderId },
  });

  if (!existingOrder) {
    throw new ApiError(404, "Order not found");
  }


  const oldOrderStatus = existingOrder.status;

  // Determine price delta
  const previousPrice = existingOrder.final_invoice_total || 0; // in dollars
  const newPrice = final_invoice_total; // updated desired totalPerService in dollars

  // Keep track of what happens
  let chargeRecord = null;
  let refundRecord = null;
  let netPaid = existingOrder.total_paid ?? 0; // current effective paid amount
  // ===============================
  //  CASE 1: UPGRADE (newPrice > previousPrice)
  // ===============================
  if (newPrice > previousPrice) {
    const delta = newPrice - previousPrice; // how much extra to charge

    //delta ---> woh price he jo customer ko new pay krni ho gi
    if (!payment_id) {
      throw new ApiError(400, "Payment method id required for upgrade.");
    }

    // Create PaymentIntent to charge difference
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(delta * 100), // cents
      currency: "usd",
      payment_method: payment_id,
      confirm: true,
      off_session: true,
      description: `Upgrade charge for order ${orderId}`,
      metadata: {
        orderId: String(orderId),
        type: "upgrade",
        previousPrice: String(previousPrice),
        newPrice: String(newPrice),
      },
    });

    if (paymentIntent.status !== "succeeded") {
      throw new ApiError(400, "Upgrade payment failed.");
    }

    // Record upgrade charge
    chargeRecord = {
      type: "upgrade",
      amount: delta, // in dollars
      paymentIntentId: paymentIntent.id,
      createdAt: new Date(),
    };
    netPaid += delta;
  }

  // ===============================
  //  CASE 2: DOWNGRADE (newPrice < previousPrice)--->refund the difference
  // ===============================
  else if (newPrice < previousPrice) {
    const difference = previousPrice - newPrice; // amount to refund

    // Find latest successful charge to refund against (prefer the most recent non-refunded)
    // This logic could be adapted if you store paymentIntent chain; here we refund the last upgrade/initial
    const lastCharge = (existingOrder.payment_history || [])
      .filter(h => h.type === "initial" || h.type === "upgrade")
      .reverse()
      .find(h => !h.refundId); // not already refunded

    if (!lastCharge || !lastCharge.paymentIntentId) {
      throw new ApiError(500, "No valid previous charge found to refund.");
    }
    console.log("Last charge ki base per hi refunding ho gi:", lastCharge)

    const refund = await stripe.refunds.create({
      payment_intent: lastCharge.paymentIntentId,
      amount: Math.round(difference * 100),
      metadata: {
        orderId: String(orderId),
        type: "downgrade",
        previousPrice: String(previousPrice),
        newPrice: String(newPrice),
      },
    });

    // Record refund
    refundRecord = {
      type: "downgrade",
      amount: difference, // dollars
      paymentIntentId: lastCharge.paymentIntentId,
      refundedAt: new Date().toISOString(),
      refundId: refund.id,
      createdAt: new Date(),
    };
    netPaid -= difference;
  }
  // skip this ===> if Old and new price is same so nothing to do  <===


  // ===============================
  //  CASE 3: CANCELED (Full refund)-->--->refund the complete payment
  // ===============================
  else if (status === "cancelled") {
    console.log(`Processing full refund for canceled order: ${orderId}`);

    let paymentHistory = Array.isArray(existingOrder.payment_history)
      ? existingOrder.payment_history
      : JSON.parse(existingOrder.payment_history || "[]");
    let refundCreated = false;
    for (const payment of paymentHistory) {
      if (
        (payment.type === "initial" || payment.type === "upgrade") &&
        !payment.refundId
      ) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: payment.paymentIntentId,
            amount: Math.round(payment.amount * 100), // full refund
            metadata: {
              orderId: String(orderId),
              type: "canceled_refund",
            },
          });

          payment.refundId = refund.id;
          payment.refundedAt = new Date().toISOString();
          payment.refundType = "canceled";
          refundCreated = true;
        } catch (err) {
          console.error(`Refund failed for canceled order ${orderId}:`, err.message);
          throw new ApiError(500, `Failed to Refund order: ${err.message}`);
          continue; // move to next payment
        }
      }
    }

    existingOrder.payment_history = paymentHistory;
    if (refundCreated) {
      refundRecord = {
        type: "canceled",
        amount: previousPrice,
        refundedAt: new Date().toISOString(),
        createdAt: new Date(),
      };
    }
    netPaid = 0; // reset after refund
  }
  // Prepare update fields
  const updateFields = {
    full_name,
    email_address,
    phone_number,
    selected_country,
    additional_instructions,
    billing_address,
    billing_city,

    status,

    final_invoice_total: newPrice,

    cardholder_name,

    total_paid: netPaid,
  };

  // Merge paymentHistory
  const newHistory = Array.isArray(existingOrder.payment_history)
    ? [...existingOrder.payment_history]
    : [];
  console.log("New History after cancel order", newHistory);
  if (chargeRecord) {
    newHistory.push(chargeRecord);
  }
  if (refundRecord) {
    newHistory.push(refundRecord);
  }
  // if (status === "cancelled") {
  //   newHistory.push(...paymentHistory.filter(p => p.refundId)); // ensure refunded ones added
  // }
  updateFields.payment_history = newHistory;
  //persist update--> prisma
  const updatedOrder = await prisma.orders.update({
    where: { id: orderId },
    data: updateFields,
  });

  console.log("Updated order from Db:", updatedOrder);

  if (!updatedOrder) {
    throw new ApiError(500, "Failed to update Order");
  }

  // Send status change email if needed
  if (updatedOrder.status && updatedOrder.status !== oldOrderStatus) {
    await sendOrderStatusEmail(
      updatedOrder.email_address,
      updatedOrder.full_name,
      updatedOrder.id,
      updatedOrder.status,
      {
        // selectedPackage: updatedOrder.selected_package,
        // selectedFrequency: updatedOrder.selected_frequency,
        totalPerService: updatedOrder.final_invoice_total,
        billingCity: updatedOrder.billing_city,
        additionalInstructions: updatedOrder.additional_instructions,
      }
    );
  } else if (updatedOrder.status && !oldOrderStatus) {
    await sendOrderStatusEmail(
      updatedOrder.email_address,
      updatedOrder.full_name,
      updatedOrder.id,
      updatedOrder.status,
      {
        // selectedPackage: updatedOrder.selected_package,
        // selectedFrequency: updatedOrder.selected_frequency,
        totalPerService: updatedOrder.final_invoice_total,
        billingCity: updatedOrder.billing_city,
        additionalInstructions: updatedOrder.additional_instructions,
      }
    );
  }

  return res.status(200).json(new ApiResponse(200, updatedOrder, "Order updated successfully"));
});




// -----> Add new Consultation <-----
const AddConsultation = AsyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    phone,
    company,
    budget,
    goals,
    timeframe,
  } = req.body;

  console.log("Data from frontend:", req.body);
  const userId = req.user?.id || null; // user UUID from Auth/Supabase etc.

  // ---- Validations ----
  const requiredStringFields = [name, email, phone];
  if (requiredStringFields.some(f => typeof f !== "string" || f.trim() === "")) {
    throw new ApiError(400, "Name, email, and phone are required and must be non-empty strings.");
  }


  // ---- Prisma Insert ----
  try {
    const newConsultaion = await prisma.privateConsultaion.create({
      data: {
        name,
        email,
        phone,
        company: company || null,
        budget: budget || null,
        goals: goals || null,
        timeframe: timeframe || null,
        status: "pending",
        user_id: userId,
      },
    });

    console.log(" New Consultaion Added (Prisma):", newConsultaion);

    return res
      .status(201)
      .json(new ApiResponse(200, newConsultaion, "Consultation added successfully"));
  } catch (err) {
    console.error(" Failed to create client consultation:", err);
    throw new ApiError(500, `Failed to create consultation: ${err.message}`);
  }
});

const ConsultationsList = AsyncHandler(async (req, res) => {
  try {
    const Consultaions = await prisma.privateConsultaion.findMany({
      orderBy: { created_at: "desc" },
      include: {
        user: {
          select: {
            email: true, // sirf email fetch karna
          },
        },
      },
    });
    console.log("private Consultaions from Db", Consultaions);
    return res
      .status(200)
      .json(new ApiResponse(200, Consultaions, "Consultaions fetched successfully"));
  } catch (error) {
    throw new ApiError(500, error.message || "Failed to fetch Consultaions");
  }
});
//updateConsultation
const updateConsultation = AsyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    phone,
    company,
    budget,
    goals,
    timeframe,
    status, // updated by admin
  } = req.body;

  const consultationId = req.params.consultationId;
  if (!consultationId) throw new ApiError(400, "Consultation ID is required.");

  console.log("Consultation Update Request:", req.body);

  //  Basic validations
  const requiredFields = [name, email, phone, status];
  if (requiredFields.some(f => !f || typeof f !== "string" || f.trim() === "")) {
    throw new ApiError(400, "Name, email, phone, and status are required.");
  }

  //  Check if record exists
  const existingConsultation = await prisma.privateConsultaion.findUnique({
    where: { id: consultationId },
  });

  if (!existingConsultation) {
    throw new ApiError(404, "Consultation not found.");
  }

  const oldStatus = existingConsultation.status;

  //  Prepare updated fields
  const updateFields = {
    name,
    email,
    phone,
    company: company || null,
    budget: budget || null,
    goals: goals || null,
    timeframe: timeframe || null,
    status,
  };

  // Update record in DB
  const updatedConsultation = await prisma.privateConsultaion.update({
    where: { id: consultationId },
    data: updateFields,
  });

  console.log("Updated Consultation (Prisma):", updatedConsultation);

  //  Send status update email if changed
  if (status && status !== oldStatus) {
    try {
      await sendOrderStatusEmail(
        updatedConsultation.email,
        updatedConsultation.name,
        updatedConsultation.id,
        updatedConsultation.status,

        {
          // selectedPackage: updatedOrder.selected_package,
          // selectedFrequency: updatedOrder.selected_frequency,
          totalPerService: updatedConsultation.budget,
          // billingCity: updatedOrder.billing_city,
          additionalInstructions: updatedConsultation.goals,
        }
      );
      console.log(" Consultation status email sent to:", updatedConsultation.email);
    } catch (emailErr) {
      console.error(" Failed to send consultation status email:", emailErr);
    }
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedConsultation, "Consultation updated successfully..."));
});

const deleteSingleConsultation = AsyncHandler(async (req, res) => {
  const consultationId = req.params.consultationId;

  //Find the consultation in DB
  const existingConsultation = await prisma.privateConsultaion.findUnique({
    where: { id: consultationId },
  });

  if (!existingConsultation) {
    throw new ApiError(404, "Consultation not found");
  }


  //Delete consultation
  await prisma.privateConsultaion.delete({
    where: { id: consultationId },
  });

  return res.status(200).json(
    new ApiResponse(200, null, "Consultation deleted successfully")
  );
});

export {
  AddOrder,
  OrdersList,
  OrdersListByUser,
  getSingleOrder,
  deleteSingleOrder,
  updateOrderDetails,
  AddConsultation,
  ConsultationsList,
  updateConsultation,
  deleteSingleConsultation
};